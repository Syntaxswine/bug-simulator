// ============================================================
// js/07-geometry-niche.ts — NicheGeometry + NicheCell + NicheState
// ============================================================
// The substrate grid the simulator operates on. Replaces vugg-sim's
// VugWall + WallCell. Each scenario picks a geometry archetype; the
// builder lays out cells in 2D or 3D coordinates and tags each with
// a substrate type.
//
// Archetypes (one per niche_type — see js/01-scenario-spec.ts):
//   rotting_log     — cylindrical cross-section, concentric zones
//                      (bark / sapwood / heartwood / pith)
//   phytotelma      — vertical cone (pitcher plant) with water column
//   carrion         — animal silhouette, surface / subcutaneous / cavity zones
//   leaf_litter     — vertical column (L / F / H / A horizons)
//   dung            — hemisphere (crust / interior moist / interior anaerobic)
//   tree_hole       — cylinder-in-cylinder with water column
//   soil_profile    — vertical layered (O / A / B / C horizons)
//
// v1 implements the cells-and-state machinery generically; per-archetype
// builders land in later versions.
//
// SCRIPT-mode TS.

class NicheCell {
  // Position in the niche's local coordinate system. Interpretation
  // varies by archetype (x/y/z for 3D; r/theta for cylindrical; etc.).
  x: number = 0;
  y: number = 0;
  z: number = 0;

  // What this cell is made of. Sample values: "bark", "sapwood",
  // "heartwood", "water", "litter_L", "litter_F", "litter_H", "soil_A",
  // "dung_crust", "carrion_skin", "carrion_cavity", "void" (open air).
  substrate: string = "void";

  // Per-cell resource state. Sessile organisms grow against this
  // profile; agents perceive it through their range.
  resources: ResourceProfile = new ResourceProfile();

  // Index of any sessile organism colonized in this cell, or -1.
  sessile_idx: number = -1;

  [key: string]: any;
}

class NicheState {
  cells: NicheCell[] = [];
  // Adjacency: for each cell index, list of neighboring cell indices.
  // Built by the geometry builder; consumed by diffusion + agent
  // movement.
  neighbors: number[][] = [];

  // Archetype tag (matches niche_type from scenario spec).
  archetype: string = "void";

  // World-coordinate extent in cm, for renderer + agent range math.
  extent_cm: { x: number; y: number; z: number } = { x: 10, y: 10, z: 10 };

  cellAt(i: number): NicheCell | undefined {
    return this.cells[i];
  }

  // Population query: cells whose resource profile has at least
  // `threshold` grams of the named resource. Used by agents picking
  // a feeding target.
  cellsWith(resource: string, threshold: number): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.cells.length; i++) {
      if ((this.cells[i].resources as any)[resource] >= threshold) {
        out.push(i);
      }
    }
    return out;
  }
}

// Geometry builder dispatch table. Each scenario archetype registers
// its builder function here. v1 has no builders — that's the next
// session's content work.
const NICHE_BUILDERS: Record<string, (extent: any) => NicheState> = {};
