// ============================================================
// js/05-resource-profile.ts — niche resource state
// ============================================================
// ResourceProfile is the bug-simulator analog of vugg-simulator's
// FluidChemistry. It tracks what's available in the niche, by
// category and quantity, on a per-cell basis (cells aggregate into
// a per-niche grid via NicheState).
//
// The category set is intentionally broader than vugg's — biology
// consumes more axes than mineralogy. As the engine grows, fields
// will be added (cellulose / lignin breakdown intermediates, specific
// amino-acid pools for parasitoids, etc.). The v1 stub covers the
// minimum needed to discuss a rotting log:
//
//   temperature_C       ambient + decomposition heat
//   moisture            0 (desiccated) .. 1 (saturated)
//   oxygen              0 (anoxic) .. 1 (atmospheric)
//   ph                  for aquatic / soil-active niches
//   wood_biomass_g      undecayed wood available to xylophages
//   fungal_biomass_g    fungal hyphae + fruiting body, fuels fungivores
//   leaf_litter_g       partly-broken-down detritus
//   sap_g, blood_g, dung_g, carrion_stage_g — scenario-specific
//
// Mass-balance is enforced at the simulator level: a fungivore
// consuming fungal_biomass_g decrements the cell's value and
// credits the agent's energy budget.
//
// SCRIPT-mode TS.

class ResourceProfile {
  // Microclimate
  temperature_C: number = 15;
  moisture: number = 0.5;
  oxygen: number = 1.0;
  ph: number = 7.0;

  // Substrate masses (g per cell — cells are cm-scale, so realistic
  // numbers are tenths of grams; calibration TBD).
  wood_biomass_g: number = 0;
  fungal_biomass_g: number = 0;
  leaf_litter_g: number = 0;
  sap_g: number = 0;
  blood_g: number = 0;
  dung_g: number = 0;
  carrion_g: number = 0;
  // Phytotelma fields (v0.6.0): drowned-insect debris in the pitcher
  // and the bacterial-decomposition pool fed by it. Larvae filter-feed
  // bacteria; midge + rotifer eat detritus + bacteria.
  prey_detritus_g: number = 0;
  bacterial_biomass_g: number = 0;
  // Carrion fields (v0.8.0): the bulk consumable substrate of a
  // vertebrate carcass. soft_tissue mineralizes via bacteria + insect
  // consumption; skin desiccates separately as a chitin-rich late-
  // stage substrate; bone is the terminal substrate (no consumers).
  soft_tissue_g: number = 0;
  skin_g: number = 0;
  bone_g: number = 0;

  // Decomposition-stage flags (real-valued, monotonic 0..1 within a stage).
  wood_decay_stage: number = 0; // 0 = sound wood, 1 = thoroughly rotted
  carrion_decomposition_stage: number = 0; // 0 = fresh, 1 = skeletonized

  // Free-form bag so per-scenario code can stash extras without an edit
  // to this class. Tighten as the bundle matures.
  [key: string]: any;
}
