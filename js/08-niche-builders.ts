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

// ─── carrion (vertebrate carcass, top-down view) ────────────────────
//
// Top-down ellipse silhouette. Edge ring = skin substrate; interior
// = soft_tissue substrate. As decomposition progresses (the
// simulator's per-step decay event), soft_tissue mass depletes and
// cells flip first to skin (when soft_tissue exhausted but skin
// remains) and then to bone (when both exhausted). Substrate
// transitions are state-derived at render time, not stored — the
// renderer reads cell.resources.soft_tissue_g etc. and tints
// accordingly. The static .substrate field just records the
// initial zoning.

function _buildCarrion(geom: any, initial: any): NicheState {
  const state = new NicheState();
  state.archetype = "carrion";

  const longAxisCm = geom?.long_axis_cm ?? 30;
  const shortAxisCm = geom?.short_axis_cm ?? 14;
  const N = geom?.cells_per_long_axis ?? 30;
  const cellSizeCm = longAxisCm / N;
  const Nrows = Math.max(6, Math.ceil(shortAxisCm / cellSizeCm));
  const a = (longAxisCm / 2);              // semi-major (cm)
  const b = (shortAxisCm / 2);             // semi-minor (cm)
  const skinThicknessCm = geom?.skin_thickness_cm ?? 1.0;

  state.extent_cm = { x: longAxisCm, y: shortAxisCm, z: 0 };

  const cxCol = (N - 1) / 2;
  const cyRow = (Nrows - 1) / 2;
  for (let i = 0; i < Nrows; i++) {
    for (let j = 0; j < N; j++) {
      const cell = new NicheCell();
      const x = (j - cxCol) * cellSizeCm;
      const y = (i - cyRow) * cellSizeCm;
      cell.x = x;
      cell.y = y;
      cell.z = 0;
      // Ellipse test in normalized coords.
      const rNorm = (x * x) / (a * a) + (y * y) / (b * b);
      let substrate = "void";
      if (rNorm > 1.0) {
        substrate = "void";
      } else {
        // Distance from the ellipse edge (approximate).
        // Inner radius scaling for skin band: shrink ellipse by skinThicknessCm.
        const aIn = Math.max(0, a - skinThicknessCm);
        const bIn = Math.max(0, b - skinThicknessCm);
        const innerNorm = (x * x) / (aIn * aIn) + (y * y) / (bIn * bIn);
        if (innerNorm > 1.0) substrate = "skin";
        else                 substrate = "soft_tissue";
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

  state.neighbors = state.cells.map((_, idx) => {
    const i = Math.floor(idx / N);
    const j = idx % N;
    const out: number[] = [];
    if (i > 0)         out.push((i - 1) * N + j);
    if (i < Nrows - 1) out.push((i + 1) * N + j);
    if (j > 0)         out.push(i * N + (j - 1));
    if (j < N - 1)     out.push(i * N + (j + 1));
    return out.filter(n => state.cells[n].substrate !== "void");
  });

  (state as any).grid = { N, Nrows, cellSizeCm };
  return state;
}

NICHE_BUILDERS["carrion"] = (params: any) => {
  return _buildCarrion(params?.geom, params?.initial);
};

// ─── dung_pile (cow pat, top-down view) ─────────────────────────────
//
// Circular silhouette with three concentric zones:
//   dung_crust            outer edge, dries fastest
//   dung_interior         moist anaerobic core (where fly larvae live
//                          and tunneling beetles excavate)
//   dung_soil_interface   bottom edge in contact with soil — Geotrupes
//                          tunnels DOWN from here. Modeled as the
//                          inner-most ring for the top-down view.

function _buildDungPile(geom: any, initial: any): NicheState {
  const state = new NicheState();
  state.archetype = "dung_pile";

  const D = geom?.diameter_cm ?? 18;
  const N = geom?.cells_per_diameter ?? 24;
  const cellSizeCm = D / N;
  const rOuter = D / 2;
  const rInterior = geom?.interior_radius_cm ?? (rOuter * 0.75);
  const rSoilInterface = geom?.soil_interface_radius_cm ?? (rOuter * 0.25);

  state.extent_cm = { x: D, y: D, z: 0 };
  const cx = (N - 1) / 2;
  const cy = (N - 1) / 2;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const cell = new NicheCell();
      const x = (j - cx) * cellSizeCm;
      const y = (i - cy) * cellSizeCm;
      cell.x = x;
      cell.y = y;
      cell.z = 0;
      const r = Math.sqrt(x * x + y * y);
      let substrate = "void";
      if (r > rOuter) substrate = "void";
      else if (r > rInterior) substrate = "dung_crust";
      else if (r > rSoilInterface) substrate = "dung_interior";
      else substrate = "dung_soil_interface";
      _applySubstrateDefaults(cell, substrate);
      if (initial) {
        for (const k of Object.keys(initial)) {
          (cell.resources as any)[k] = initial[k];
        }
      }
      state.cells.push(cell);
    }
  }

  state.neighbors = state.cells.map((_, idx) => {
    const i = Math.floor(idx / N);
    const j = idx % N;
    const out: number[] = [];
    if (i > 0)     out.push((i - 1) * N + j);
    if (i < N - 1) out.push((i + 1) * N + j);
    if (j > 0)     out.push(i * N + (j - 1));
    if (j < N - 1) out.push(i * N + (j + 1));
    return out.filter(n => state.cells[n].substrate !== "void");
  });

  (state as any).grid = { N, cellSizeCm };
  return state;
}

NICHE_BUILDERS["dung_pile"] = (params: any) => {
  return _buildDungPile(params?.geom, params?.initial);
};

// ─── meadow_patch (vertical column through tall grass + flowers) ───
//
// Vertical cross-section through a meadow stand. Top band = flower
// heads (where pollinators visit); middle band = stems (where the
// mantis ambushes from); lower band = grass blades (grasshopper
// food); bottom row = soil_surface (ootheca deposition).
//
// Width of grid is set so the column is "tall and slim" — the
// meadow has more vertical structure than horizontal extent at the
// scale we care about.

function _buildMeadowPatch(geom: any, initial: any): NicheState {
  const state = new NicheState();
  state.archetype = "meadow_patch";

  const H = geom?.height_cm ?? 60;
  const Ntall = geom?.cells_per_height ?? 30;
  const cellSizeCm = H / Ntall;
  const Wcm = geom?.width_cm ?? 30;
  const Nwide = Math.max(8, Math.ceil(Wcm / cellSizeCm));
  const flowerBandCm = geom?.flower_band_cm ?? 8;
  const stemBandCm = geom?.stem_band_cm ?? 25;
  // grass_blade between stem and soil; soil_surface is the bottom row.
  const soilBandCm = geom?.soil_band_cm ?? 3;

  state.extent_cm = { x: Wcm, y: H, z: 0 };

  for (let i = 0; i < Ntall; i++) {
    const yFromTop = i * cellSizeCm;
    for (let j = 0; j < Nwide; j++) {
      const cell = new NicheCell();
      cell.x = (j - (Nwide - 1) / 2) * cellSizeCm;
      cell.y = yFromTop;
      cell.z = 0;
      let substrate: string;
      if (yFromTop < flowerBandCm) substrate = "flower";
      else if (yFromTop < flowerBandCm + stemBandCm) substrate = "stem";
      else if (yFromTop < H - soilBandCm) substrate = "grass_blade";
      else substrate = "soil_surface";
      _applySubstrateDefaults(cell, substrate);
      if (initial) {
        for (const k of Object.keys(initial)) {
          (cell.resources as any)[k] = initial[k];
        }
      }
      state.cells.push(cell);
    }
  }

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

NICHE_BUILDERS["meadow_patch"] = (params: any) => {
  return _buildMeadowPatch(params?.geom, params?.initial);
};

// ─── bark_gallery (Ips typographus gallery under spruce bark) ──────
//
// Top-down view of a horizontal slice through spruce bark, with the
// outer bark above, the phloem (nutritious cambium layer) in the
// middle, and sapwood below. A pre-built **maternal gallery** runs
// horizontally through the phloem — the female Ips has already
// chewed this corridor before the scenario starts. Larvae spawn
// along it and tunnel outward perpendicular to the gallery as they
// consume phloem.
//
// In this scenario, larval tunnels are dynamic — phloem cells where
// larvae feed get converted to "gallery" over time as the cells'
// phloem_g depletes. That's handled in the larval ticker, not here.

function _buildBarkGallery(geom: any, initial: any): NicheState {
  const state = new NicheState();
  state.archetype = "bark_gallery";

  const Wcm = geom?.width_cm ?? 24;
  const Hcm = geom?.height_cm ?? 14;
  const N = geom?.cells_per_width ?? 30;
  const cellSizeCm = Wcm / N;
  const Nrows = Math.max(8, Math.ceil(Hcm / cellSizeCm));
  const outerBarkRowsCm = geom?.outer_bark_band_cm ?? 1.6;
  const phloemRowsCm = geom?.phloem_band_cm ?? 3.0;
  // sapwood occupies the rest below
  const galleryRowIdx = Math.floor(Nrows * 0.4); // single horizontal row inside phloem
  const galleryLengthCells = geom?.gallery_length_cells ?? Math.floor(N * 0.8);
  const galleryStartCol = Math.floor((N - galleryLengthCells) / 2);

  state.extent_cm = { x: Wcm, y: Hcm, z: 0 };

  for (let i = 0; i < Nrows; i++) {
    const yFromTop = i * cellSizeCm;
    for (let j = 0; j < N; j++) {
      const cell = new NicheCell();
      cell.x = (j - (N - 1) / 2) * cellSizeCm;
      cell.y = yFromTop;
      cell.z = 0;
      let substrate: string;
      if (yFromTop < outerBarkRowsCm) substrate = "outer_bark";
      else if (yFromTop < outerBarkRowsCm + phloemRowsCm) substrate = "phloem";
      else substrate = "spruce_sapwood";
      // Override: the maternal-gallery row inside the phloem band
      if (i === galleryRowIdx
          && j >= galleryStartCol
          && j < galleryStartCol + galleryLengthCells) {
        substrate = "gallery";
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

  state.neighbors = state.cells.map((_, idx) => {
    const i = Math.floor(idx / N);
    const j = idx % N;
    const out: number[] = [];
    if (i > 0)         out.push((i - 1) * N + j);
    if (i < Nrows - 1) out.push((i + 1) * N + j);
    if (j > 0)         out.push(i * N + (j - 1));
    if (j < N - 1)     out.push(i * N + (j + 1));
    return out.filter(n => state.cells[n].substrate !== "void");
  });

  (state as any).grid = { N, Nrows, cellSizeCm };
  return state;
}

NICHE_BUILDERS["bark_gallery"] = (params: any) => {
  return _buildBarkGallery(params?.geom, params?.initial);
};

// ─── freshwater_pond (vertical cross-section, surface to mud) ──────
//
// Vertical column through a small alpine pond. Top thin row =
// water_surface (mosquitoes emerge here, Notonecta hangs upside-
// down from the meniscus). Bulk middle = pond_water (open water
// column, Daphnia drift here, Dytiscus larva swims). Bottom row =
// pond_mud (Aeshna dragonfly larvae sit + ambush). Side columns
// = emergent_vegetation (the cattails / reeds along the edge —
// dragonflies emerge by climbing these stems, but emergence isn't
// yet modeled). Width is moderate so the pond reads as wider-than-
// tall, like a pond cross-section diagram.

function _buildFreshwaterPond(geom: any, initial: any): NicheState {
  const state = new NicheState();
  state.archetype = "freshwater_pond";

  const Wcm = geom?.width_cm ?? 60;
  const Hcm = geom?.height_cm ?? 36;
  const N = geom?.cells_per_width ?? 36;
  const cellSizeCm = Wcm / N;
  const Nrows = Math.max(8, Math.ceil(Hcm / cellSizeCm));
  const surfaceBandCm = geom?.surface_band_cm ?? 1.5;
  const mudBandCm = geom?.mud_band_cm ?? 3.5;
  const vegBandColsCm = geom?.vegetation_band_cm ?? 3.0;
  const vegBandCells = Math.max(1, Math.round(vegBandColsCm / cellSizeCm));

  state.extent_cm = { x: Wcm, y: Hcm, z: 0 };

  for (let i = 0; i < Nrows; i++) {
    const yFromTop = i * cellSizeCm;
    for (let j = 0; j < N; j++) {
      const cell = new NicheCell();
      cell.x = (j - (N - 1) / 2) * cellSizeCm;
      cell.y = yFromTop;
      cell.z = 0;
      let substrate: string;
      // Left + right edge columns are emergent_vegetation, except for
      // the surface + mud bands which dominate.
      const isVegCol = j < vegBandCells || j >= N - vegBandCells;
      if (yFromTop < surfaceBandCm) {
        substrate = "water_surface";
      } else if (yFromTop >= Hcm - mudBandCm) {
        substrate = "pond_mud";
      } else if (isVegCol) {
        substrate = "emergent_vegetation";
      } else {
        substrate = "pond_water";
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

  state.neighbors = state.cells.map((_, idx) => {
    const i = Math.floor(idx / N);
    const j = idx % N;
    const out: number[] = [];
    if (i > 0)         out.push((i - 1) * N + j);
    if (i < Nrows - 1) out.push((i + 1) * N + j);
    if (j > 0)         out.push(i * N + (j - 1));
    if (j < N - 1)     out.push(i * N + (j + 1));
    return out.filter(n => state.cells[n].substrate !== "void");
  });

  (state as any).grid = { N, Nrows, cellSizeCm };
  return state;
}

NICHE_BUILDERS["freshwater_pond"] = (params: any) => {
  return _buildFreshwaterPond(params?.geom, params?.initial);
};

// ─── tide_pool (Atlantic rockpool, vertical cross-section) ──────────
//
// Vertical cross-section through a rocky-shore tide pool at low tide.
// Top band = void (air above the water line). The basin is rimmed
// with rock_wall (a U-shape of stone cells), the interior is filled
// with tide_water, the very bottom is a thin strip of gravel_floor
// where hermit crabs and small invertebrates would scuttle (not yet
// modeled but tracked for narrators).

function _buildTidePool(geom: any, initial: any): NicheState {
  const state = new NicheState();
  state.archetype = "tide_pool";

  const Wcm = geom?.width_cm ?? 50;
  const Hcm = geom?.height_cm ?? 30;
  const N = geom?.cells_per_width ?? 30;
  const cellSizeCm = Wcm / N;
  const Nrows = Math.max(8, Math.ceil(Hcm / cellSizeCm));
  const airBandCm = geom?.air_band_cm ?? 4;
  const wallThicknessCm = geom?.wall_thickness_cm ?? 3;
  const gravelBandCm = geom?.gravel_band_cm ?? 1.5;

  state.extent_cm = { x: Wcm, y: Hcm, z: 0 };

  for (let i = 0; i < Nrows; i++) {
    const yFromTop = i * cellSizeCm;
    for (let j = 0; j < N; j++) {
      const cell = new NicheCell();
      cell.x = (j - (N - 1) / 2) * cellSizeCm;
      cell.y = yFromTop;
      cell.z = 0;
      const xFromCenter = Math.abs(cell.x);
      const innerHalfWidth = (Wcm / 2) - wallThicknessCm;
      let substrate: string;
      if (yFromTop < airBandCm) {
        // Above water line — either void (over the pool) or rock_wall
        // (above the rim).
        if (xFromCenter > innerHalfWidth) substrate = "rock_wall";
        else                              substrate = "void";
      } else if (yFromTop >= Hcm - gravelBandCm) {
        // Bottom strip — gravel floor inside the pool, rock_wall outside.
        if (xFromCenter > innerHalfWidth) substrate = "rock_wall";
        else                              substrate = "gravel_floor";
      } else {
        // Middle bulk — water inside, rock_wall outside.
        if (xFromCenter > innerHalfWidth) substrate = "rock_wall";
        else                              substrate = "tide_water";
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

  state.neighbors = state.cells.map((_, idx) => {
    const i = Math.floor(idx / N);
    const j = idx % N;
    const out: number[] = [];
    if (i > 0)         out.push((i - 1) * N + j);
    if (i < Nrows - 1) out.push((i + 1) * N + j);
    if (j > 0)         out.push(i * N + (j - 1));
    if (j < N - 1)     out.push(i * N + (j + 1));
    return out.filter(n => state.cells[n].substrate !== "void");
  });

  (state as any).grid = { N, Nrows, cellSizeCm };
  return state;
}

NICHE_BUILDERS["tide_pool"] = (params: any) => {
  return _buildTidePool(params?.geom, params?.initial);
};
