// ============================================================
// js/30-renderer-2d.ts — canvas-2D niche cross-section renderer
// ============================================================
// Draws the rotting_log cross-section to a canvas: substrate-colored
// cells, sessile colonies as overlays, motile agents as colored dots.
// Loaded after the simulator so it can reference BugSimulator's
// niche / agents / sessile fields directly.
//
// SCRIPT-mode TS.

const SUBSTRATE_COLORS: Record<string, string> = {
  void: "#0e0e0c",
  bark: "#3a2a18",
  sapwood: "#a87a4a",
  heartwood: "#6e4d2b",
  pith: "#4a3520",
  litter_surface: "#5a4a2a",
  // Phytotelma (Sarracenia) substrates
  pitcher_lip:    "#5a3838",
  pitcher_wall:   "#3a2a30",
  water_column:   "#1e3a4a",
  pitcher_floor:  "#2a1a18",
  // Carrion substrates
  skin:           "#4a3a30",
  soft_tissue:    "#7a3a3a",
  bone:           "#c0b89a",
  // Dung-pile substrates (deliberately muted; the visual is the bugs,
  // not a Hi-Res rendering of the substrate)
  dung_crust:           "#3a2818",
  dung_interior:        "#5a3818",
  dung_soil_interface:  "#2a1810",
  // Meadow-patch substrates
  flower:               "#8a5a8a",
  stem:                 "#4a5a28",
  grass_blade:          "#3a5a20",
  soil_surface:         "#2a1a10",
};

const GUILD_COLORS: Record<string, string> = {
  sessile_decomposer: "#c4d28e",  // fungus / lichen / moss accent
  sessile_autotroph:  "#76b04a",
  sessile_filter:     "#e8c8a0",  // rotifers, sponges, biofilm
  detritivore: "#a08060",
  fungivore:   "#e6e0c8",
  filter_feeder: "#d4c878",       // aquatic-larva filter feeders
  predator:    "#d05028",
  ambush_predator: "#7a8a3a",     // mantises etc.
  parasitoid:  "#b03060",
  herbivore:   "#90c060",
  pollinator:  "#e0c040",
  necrophage:  "#dccba8",
  necrophage_predator: "#3a2a18",
  keratinophage: "#6e4a28",
  coprophage:  "#8a6028",
  coprophage_tunneler: "#1a1010",
  entomopathogen: "#e8d8c0",
};

function _guildOf(species: string): string {
  return SPECIES_SPEC?.[species]?.guild ?? "fungivore";
}

function _colorForAgent(species: string): string {
  const spec = SPECIES_SPEC?.[species];
  if (spec?.color) return spec.color;
  return GUILD_COLORS[_guildOf(species)] || "#cccccc";
}

function renderNiche2D(sim: any, canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const grid = (sim.niche as any).grid;
  if (!grid?.N) return;
  const N = grid.N;
  const Nrows = grid.Nrows ?? N; // rotting_log is square (Nrows = N), phytotelma is tall
  const W = canvas.width;
  const H = canvas.height;
  // For square grids (Nrows == N) keep the existing square cell sizing.
  // For tall grids (phytotelma) fit by height; cells stay square.
  let cellSize: number;
  if (Nrows === N) {
    cellSize = Math.min(W, H) / N;
  } else {
    cellSize = Math.min(W / N, H / Nrows);
  }
  const ox = (W - cellSize * N) / 2;
  const oy = (H - cellSize * Nrows) / 2;

  // Clear.
  ctx.fillStyle = "#0e0e0c";
  ctx.fillRect(0, 0, W, H);

  // Cells. Iterate by row × col where N is the column count and
  // Nrows is the row count (different for phytotelma).
  for (let i = 0; i < Nrows; i++) {
    for (let j = 0; j < N; j++) {
      const idx = i * N + j;
      const cell = sim.niche.cells[idx];
      if (!cell) continue;
      let color = SUBSTRATE_COLORS[cell.substrate] || "#222";
      // Tint wood cells by decay stage (rotting_log only).
      if (cell.substrate !== "void" && cell.resources.wood_decay_stage > 0.5) {
        color = _mixHex(color, "#5a6a3a", Math.min(1, cell.resources.wood_decay_stage - 0.3));
      }
      // Tint pitcher_floor by accumulated detritus — visually darker
      // / more amber as detritus piles up.
      if (cell.substrate === "pitcher_floor" && (cell.resources.prey_detritus_g ?? 0) > 0.2) {
        color = _mixHex(color, "#4a3010", Math.min(1, (cell.resources.prey_detritus_g - 0.2) * 0.5));
      }
      // Carrion cells: as soft_tissue depletes, transition visually
      // from pink/red soft_tissue → leathery brown skin → bone.
      if (cell.substrate === "soft_tissue") {
        const initial = 8;
        const remaining = cell.resources.soft_tissue_g ?? 0;
        const consumed = Math.max(0, 1 - remaining / initial);
        if (remaining <= 0.5 && (cell.resources.skin_g ?? 0) <= 0.1) {
          color = SUBSTRATE_COLORS["bone"];
        } else if (remaining <= 2) {
          color = _mixHex(SUBSTRATE_COLORS["soft_tissue"], "#4a3a30", consumed * 0.8);
        } else {
          color = _mixHex(SUBSTRATE_COLORS["soft_tissue"], "#3a1818", consumed * 0.4);
        }
      } else if (cell.substrate === "skin") {
        const initial = 1.5;
        const remaining = cell.resources.skin_g ?? 0;
        const consumed = Math.max(0, 1 - remaining / initial);
        if (remaining <= 0.1) {
          color = SUBSTRATE_COLORS["bone"];
        } else {
          color = _mixHex(SUBSTRATE_COLORS["skin"], "#2a1a10", consumed * 0.6);
        }
      }
      ctx.fillStyle = color;
      ctx.fillRect(ox + j * cellSize, oy + i * cellSize, cellSize + 0.6, cellSize + 0.6);
    }
  }

  // Sessile colonies: draw a filled circle scaled to size_cm vs cell size.
  for (const org of sim.sessile) {
    if (org.vigor <= 0) continue;
    const idx = org.cell_idx;
    const i = Math.floor(idx / N), j = idx % N;
    const x = ox + (j + 0.5) * cellSize;
    const y = oy + (i + 0.5) * cellSize;
    const spec = SPECIES_SPEC?.[org.species] || {};
    const maxR = cellSize * 0.55;
    const mature = spec.growth_params?.mature_size_cm ?? 8;
    const r = Math.max(2, maxR * (org.size_cm / mature));
    ctx.fillStyle = spec.color || GUILD_COLORS[spec.guild || "sessile_decomposer"] || "#c4d28e";
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Agents: dots colored by species, sized by body_size_mm. Eggs render
  // smaller and translucent — visually distinct from adults so the
  // viewer can read population structure (lots of eggs = breeding wave;
  // mostly adults = stable colony).
  for (const a of sim.agents) {
    if (!a.alive) continue;
    const idx = a.cell_idx;
    const i = Math.floor(idx / N), j = idx % N;
    const x = ox + (j + 0.5) * cellSize;
    const y = oy + (i + 0.5) * cellSize;
    const spec = SPECIES_SPEC?.[a.species] || {};
    const bodyMm = spec.body_size_mm ?? 2;
    const adultR = Math.max(2, Math.min(cellSize * 0.45, 2 + bodyMm * 0.25));
    let r = adultR;
    let alpha = 1;
    if (a.life_stage === "egg") {
      r = Math.max(1.2, adultR * 0.45);
      alpha = 0.65;
    } else if (a.life_stage === "larva" || a.life_stage === "pupa") {
      r = adultR * 0.75;
      alpha = 0.8;
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = _colorForAgent(a.species);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // Predator outline so adults read at a glance; eggs no outline.
    if (spec.guild === "predator" && a.life_stage === "adult") {
      ctx.strokeStyle = "#fff2";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // Eggs get a thin dotted outline so they don't look like specks
    // of substrate dust on the canvas.
    if (a.life_stage === "egg") {
      ctx.strokeStyle = "#fff5";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([1, 1]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  }
}

// ─── Tooltip helpers ────────────────────────────────────────────────
//
// Given a sim + canvas + pixel (x, y), return the cell at that pixel
// or null if outside the grid. The renderer's coordinate math is the
// inverse of the cells loop above.

function pixelToCellIdx(sim: any, canvas: HTMLCanvasElement, px: number, py: number): number | null {
  const grid = (sim.niche as any).grid;
  if (!grid?.N) return null;
  const N = grid.N;
  const Nrows = grid.Nrows ?? N;
  const W = canvas.width;
  const H = canvas.height;
  const cellSize = Nrows === N ? Math.min(W, H) / N : Math.min(W / N, H / Nrows);
  const ox = (W - cellSize * N) / 2;
  const oy = (H - cellSize * Nrows) / 2;
  const j = Math.floor((px - ox) / cellSize);
  const i = Math.floor((py - oy) / cellSize);
  if (i < 0 || j < 0 || i >= Nrows || j >= N) return null;
  return i * N + j;
}

function describeCell(sim: any, cellIdx: number): any {
  const cell = sim.niche.cells[cellIdx];
  if (!cell) return null;
  const agentsHere: any[] = [];
  for (const a of sim.agents) {
    if (a.alive && a.cell_idx === cellIdx) {
      agentsHere.push({
        species: a.species,
        stage: a.life_stage,
        energy: Math.round(a.energy * 10) / 10,
        age: a.age_steps,
      });
    }
  }
  const sessileHere: any[] = [];
  for (const o of sim.sessile) {
    if (o.vigor > 0 && o.cell_idx === cellIdx) {
      sessileHere.push({
        species: o.species,
        size_cm: Math.round(o.size_cm * 10) / 10,
        vigor: Math.round(o.vigor * 100) / 100,
      });
    }
  }
  return {
    cell_idx: cellIdx,
    substrate: cell.substrate,
    moisture: Math.round((cell.resources.moisture ?? 0) * 100) / 100,
    wood_g: Math.round((cell.resources.wood_biomass_g ?? 0) * 100) / 100,
    fungal_g: Math.round((cell.resources.fungal_biomass_g ?? 0) * 100) / 100,
    litter_g: Math.round((cell.resources.leaf_litter_g ?? 0) * 100) / 100,
    decay: Math.round((cell.resources.wood_decay_stage ?? 0) * 100) / 100,
    agents: agentsHere,
    sessile: sessileHere,
  };
}

function _mixHex(a: string, b: string, t: number): string {
  const pa = _parseHex(a), pb = _parseHex(b);
  const r = Math.round(pa[0] * (1 - t) + pb[0] * t);
  const g = Math.round(pa[1] * (1 - t) + pb[1] * t);
  const bl = Math.round(pa[2] * (1 - t) + pb[2] * t);
  return "#" + [r, g, bl].map(v => v.toString(16).padStart(2, "0")).join("");
}

function _parseHex(h: string): [number, number, number] {
  const s = h.replace("#", "");
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}
