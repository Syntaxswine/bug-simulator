// ============================================================
// js/10-sessile.ts — SessileOrganism + GrowthZone + dispatch
// ============================================================
// The sessile-organism class is bug-simulator's analog of vugg-sim's
// Crystal. Same idea: lives in one cell, grows over time, accumulates
// zones (each zone is the increment from one growth step), eventually
// reaches a mature size and stops or senesces.
//
// "Sessile organism" covers fungi, mosses, lichens, algae, biofilms,
// and the sessile larval forms (gall wasps in plant tissue, scale
// insects, barnacles in aquatic phytotelmata). It explicitly does
// NOT cover motile bugs — those are Agents (js/12-agent.ts).
//
// SCRIPT-mode TS.

class GrowthZone {
  // Time interval this zone covers, in sim steps.
  step_start: number = 0;
  step_end: number = 0;

  // Thickness of this zone, in micrometers (matches vugg's
  // thickness_um for crystal zones — useful when rendering colony
  // growth as concentric ring deposition).
  thickness_um: number = 0;

  // The resources actually consumed to grow this zone. Useful for
  // mass-balance accounting and narration ("the malachite drew down
  // 50% of the cell's copper").
  resources_consumed: Record<string, number> = {};

  [key: string]: any;
}

class SessileOrganism {
  // Catalog id (key into SPECIES_SPEC).
  species: string = "";

  // Cell this organism lives in.
  cell_idx: number = -1;

  // Step it nucleated.
  step_born: number = 0;

  // Current size in cm. Compare against the species' mature size to
  // decide whether further growth is possible.
  size_cm: number = 0;

  // Growth history.
  zones: GrowthZone[] = [];

  // Senescence / mortality state. 0 = thriving, 1 = dead. Real-valued
  // because senescence is gradual (dying fungal hyphae still feed
  // fungivores).
  vigor: number = 1;

  [key: string]: any;
}

// Per-species growth functions live in later files (e.g.
// js/30-engines-fungi.ts when content arrives). They register here.
// Signature: (org, conditions, step) -> GrowthZone | null
const SESSILE_ENGINES: Record<string, (
  org: SessileOrganism,
  cell: NicheCell,
  step: number,
) => GrowthZone | null> = {};
