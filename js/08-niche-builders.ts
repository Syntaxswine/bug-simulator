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
