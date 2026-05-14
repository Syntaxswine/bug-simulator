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
};

const GUILD_COLORS: Record<string, string> = {
  sessile_decomposer: "#c4d28e",  // fungus / lichen / moss accent
  sessile_autotroph:  "#76b04a",
  detritivore: "#a08060",
  fungivore:   "#e6e0c8",
  predator:    "#d05028",
  parasitoid:  "#b03060",
  herbivore:   "#90c060",
  pollinator:  "#e0c040",
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
  const W = canvas.width;
  const H = canvas.height;
  const cellSize = Math.min(W, H) / N;
  const ox = (W - cellSize * N) / 2;
  const oy = (H - cellSize * N) / 2;

  // Clear.
  ctx.fillStyle = "#0e0e0c";
  ctx.fillRect(0, 0, W, H);

  // Cells.
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const idx = i * N + j;
      const cell = sim.niche.cells[idx];
      if (!cell) continue;
      let color = SUBSTRATE_COLORS[cell.substrate] || "#222";
      // Tint cells by wood_decay_stage — more decayed = darker / mossier.
      if (cell.substrate !== "void" && cell.resources.wood_decay_stage > 0.5) {
        // mix toward green-grey to suggest fungal pre-conditioning
        color = _mixHex(color, "#5a6a3a", Math.min(1, cell.resources.wood_decay_stage - 0.3));
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

  // Agents: dots colored by species, sized by body_size_mm.
  for (const a of sim.agents) {
    if (!a.alive) continue;
    const idx = a.cell_idx;
    const i = Math.floor(idx / N), j = idx % N;
    const x = ox + (j + 0.5) * cellSize;
    const y = oy + (i + 0.5) * cellSize;
    const spec = SPECIES_SPEC?.[a.species] || {};
    const bodyMm = spec.body_size_mm ?? 2;
    const r = Math.max(2, Math.min(cellSize * 0.45, 2 + bodyMm * 0.25));
    ctx.fillStyle = _colorForAgent(a.species);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // Predator outline so they read at a glance.
    if (spec.guild === "predator") {
      ctx.strokeStyle = "#fff2";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
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
