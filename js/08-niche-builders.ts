// ============================================================
// js/08-niche-builders.ts — geometry generators per niche archetype
// ============================================================
// Registers concrete builders in NICHE_BUILDERS (the registry from
// js/07-geometry-niche.ts). Each builder takes the scenario-spec
// parameters and returns a populated NicheState (cells + neighbors
// + substrate tags + initial resources).
//
// v0.2.0 ships one builder: rotting_log. The cross-section is a 2D
// disc with four concentric zones (bark -> sapwood -> heartwood -> pith)
// surrounded by a thin litter-surface ring (debris immediately under
// the log). Cells are square (1cm typical), tagged by substrate, and
// initialized with the per-substrate defaults from
// data/niche_substrates.json (fetched into NICHE_SUBSTRATES at
// bundle load — see _loadNicheSubstratesJSON).
//
// SCRIPT-mode TS.

// NICHE_SUBSTRATES is a stable object reference (const); the loader
// mutates its keys in-place so consumers (geometry builders called
// post-fetch) see the populated defaults.
const NICHE_SUBSTRATES: any = {};

async function _loadNicheSubstratesJSON(): Promise<void> {
  try {
    const resp = await fetch('./data/niche_substrates.json');
    if (!resp.ok) return;
    const parsed = JSON.parse(await resp.text());
    Object.assign(NICHE_SUBSTRATES, parsed);
  } catch {
    // Empty substrate defaults — geometry still builds; cells get
    // bare ResourceProfile defaults.
  }
}
_loadNicheSubstratesJSON();

function _applySubstrateDefaults(cell: NicheCell, substrate: string): void {
  cell.substrate = substrate;
  const tpl = NICHE_SUBSTRATES?.[substrate]?.default_resources;
  if (!tpl) return;
  for (const k of Object.keys(tpl)) {
    (cell.resources as any)[k] = tpl[k];
  }
}

function _buildRottingLog(geom: any, initial: any): NicheState {
  const state = new NicheState();
  state.archetype = "rotting_log";

  const D = geom?.diameter_cm ?? 30;
  const N = geom?.cells_per_diameter ?? 30;
  const cellSizeCm = D / N;
  const cx = (N - 1) / 2;
  const cy = (N - 1) / 2;
  const rOuter = D / 2;
  const rBarkInner = rOuter - (geom?.bark_thickness_cm ?? 1.5);
  const rSapInner = rBarkInner - (geom?.sapwood_thickness_cm ?? 4);
  const rPithOuter = geom?.pith_radius_cm ?? 1.5;
  // heartwood is the band between rSapInner and rPithOuter

  state.extent_cm = { x: D, y: D, z: 0 };

  // Build cells row by row. Index (i,j) -> idx (i*N + j).
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const cell = new NicheCell();
      cell.x = (j - cx) * cellSizeCm;
      cell.y = (i - cy) * cellSizeCm;
      cell.z = 0;
      const r = Math.sqrt(cell.x * cell.x + cell.y * cell.y);
      let substrate = "void";
      if (r > rOuter) substrate = "void";
      else if (r > rBarkInner) substrate = "bark";
      else if (r > rSapInner)  substrate = "sapwood";
      else if (r > rPithOuter) substrate = "heartwood";
      else                      substrate = "pith";
      _applySubstrateDefaults(cell, substrate);
      // Apply scenario-wide initial resource overrides (microclimate).
      if (initial) {
        for (const k of Object.keys(initial)) {
          (cell.resources as any)[k] = initial[k];
        }
      }
      state.cells.push(cell);
    }
  }

  // Adjacency: 4-neighbor (N/S/E/W). Diagonal neighbors omitted; agents
  // pick paths through cardinals which keeps movement-cost reasoning
  // simple at v0.2.0.
  state.neighbors = state.cells.map((_, idx) => {
    const i = Math.floor(idx / N);
    const j = idx % N;
    const out: number[] = [];
    if (i > 0)     out.push((i - 1) * N + j);
    if (i < N - 1) out.push((i + 1) * N + j);
    if (j > 0)     out.push(i * N + (j - 1));
    if (j < N - 1) out.push(i * N + (j + 1));
    // Only adjacencies between non-void cells count for movement /
    // diffusion. Filtering here keeps later lookups simple.
    return out.filter(n => state.cells[n].substrate !== "void");
  });

  // Cache the grid shape on the state so renderer + agent code can
  // recover (i,j) from idx.
  (state as any).grid = { N, cellSizeCm };

  return state;
}

NICHE_BUILDERS["rotting_log"] = (params: any) => {
  return _buildRottingLog(params?.geom, params?.initial);
};

// ─── phytotelma (pitcher-plant cavity) ─────────────────────────────
//
// Vertical cross-section through a Sarracenia purpurea pitcher. The
// cone tapers from a wide opening at the top to a narrow water-filled
// floor at the bottom. Substrate zones (top → bottom):
//   pitcher_lip      — top edge where prey enters
//   pitcher_wall     — waxy slope, organisms can't colonize here
//   water_column     — trap fluid where mosquito + midge larvae swim
//   pitcher_floor    — accumulated detritus from drowned prey;
//                       Habrotrocha-like sessile detritivores live here
//   void             — outside the pitcher silhouette
//
// Geometry params: pitcher_height_cm (the cone's height), top_radius_cm,
// floor_radius_cm, water_level_cm (height of water column above floor),
// cells_per_height.

function _buildPhytotelma(geom: any, initial: any): NicheState {
  const state = new NicheState();
  state.archetype = "phytotelma";

  const H = geom?.pitcher_height_cm ?? 12;
  const Ntall = geom?.cells_per_height ?? 36;
  const cellSizeCm = H / Ntall;
  const rTop = geom?.top_radius_cm ?? 3.5;
  const rFloor = geom?.floor_radius_cm ?? 1.0;
  const waterLevelCm = geom?.water_level_cm ?? 5.0;
  const lipBandCm = geom?.lip_band_cm ?? 0.6;
  // Width of the grid in cells = enough to cover the top radius * 2.
  const Nwide = Math.max(8, Math.ceil((rTop * 2 + 1) / cellSizeCm));

  state.extent_cm = { x: Nwide * cellSizeCm, y: H, z: 0 };

  // Build cells row by row, top to bottom.
  // i = 0 at TOP, i = Ntall-1 at BOTTOM. y position = i * cellSizeCm
  // measured from top.
  const cxCol = (Nwide - 1) / 2;
  for (let i = 0; i < Ntall; i++) {
    const yFromTop = i * cellSizeCm;
    const heightFraction = yFromTop / H; // 0 at top, 1 at bottom
    // Pitcher inner radius at this y (linear taper from rTop to rFloor).
    const rHere = rTop * (1 - heightFraction) + rFloor * heightFraction;
    for (let j = 0; j < Nwide; j++) {
      const cell = new NicheCell();
      const xFromCenter = (j - cxCol) * cellSizeCm;
      cell.x = xFromCenter;
      cell.y = yFromTop;
      cell.z = 0;
      const dx = Math.abs(xFromCenter);
      let substrate = "void";
      if (dx > rHere + cellSizeCm * 0.5) {
        substrate = "void";
      } else if (yFromTop < lipBandCm) {
        substrate = "pitcher_lip";
      } else if (yFromTop > (H - waterLevelCm)) {
        // Inside the water column (or floor at the deepest row).
        substrate = (i === Ntall - 1) ? "pitcher_floor" : "water_column";
      } else {
        // Above water, below lip: waxy wall band.
        // Differentiate wall (the rim of the cone) from interior empty
        // space (no organisms, also wall semantics).
        if (dx > rHere - cellSizeCm * 0.7) substrate = "pitcher_wall";
        else substrate = "pitcher_wall"; // collapse interior empty into wall for v0.6.0
      }
      _applySubstrateDefaults(cell, substrate);
      if (initial) {
        for (const k of Object.keys(initial)) {
          (cell.resources as any)[k] = initial[k];
        }
      }
      state.cells.push(cell);
    }
  }

  // 4-neighbor adjacency, void cells filtered.
  state.neighbors = state.cells.map((_, idx) => {
    const i = Math.floor(idx / Nwide);
    const j = idx % Nwide;
    const out: number[] = [];
    if (i > 0)         out.push((i - 1) * Nwide + j);
    if (i < Ntall - 1) out.push((i + 1) * Nwide + j);
    if (j > 0)         out.push(i * Nwide + (j - 1));
    if (j < Nwide - 1) out.push(i * Nwide + (j + 1));
    return out.filter(n => state.cells[n].substrate !== "void");
  });

  (state as any).grid = { N: Nwide, Nrows: Ntall, cellSizeCm };

  return state;
}

NICHE_BUILDERS["phytotelma"] = (params: any) => {
  return _buildPhytotelma(params?.geom, params?.initial);
};
