// ============================================================
// js/01-scenario-spec.ts — SCENARIOS data structure + loader
// ============================================================
// A scenario declares the niche to simulate. The schema mirrors
// vugg-simulator's scenarios.json5 with niche-appropriate fields:
//
//   id: "bialowieza_beech_log_y5"
//   niche_type: "rotting_log" | "phytotelma" | "carrion" | "leaf_litter" |
//               "dung" | "tree_hole" | "soil_profile"
//   locality: human-readable real place (Białowieża primeval forest, etc.)
//   initial_substrate: per-cell substrate state (wood + stage, litter, etc.)
//   initial_resources: ResourceProfile fields at t=0
//   colonization_pool: species ids that may arrive, with per-day rates
//   events: timeline of perturbations (rain, frost, fire, parasitoid wave)
//   expected_species: catalog assertions for end-state assemblage
//
// SCRIPT-mode TS.

let SCENARIOS: Record<string, any> = {};

async function _loadScenariosJSON(): Promise<void> {
  try {
    const resp = await fetch('./data/scenarios.json5');
    if (!resp.ok) return;
    const txt = await resp.text();
    // Naive JSON5 stripper: drop // line comments. Real JSON5 support
    // can come later; the data file currently has no trailing commas
    // or other JSON5-specific syntax.
    const stripped = txt.replace(/\/\/.*$/gm, '');
    const parsed = JSON.parse(stripped);
    SCENARIOS = parsed;
  } catch {
    // Stay on empty SCENARIOS. Tests with no scenarios are valid;
    // the engine runs idle.
  }
}

_loadScenariosJSON();
