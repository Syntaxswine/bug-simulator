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
  // Dung niche fields (v0.9.0). dung_g already declared above (line
  // 44 — scaffold field). fly_larvae_density is a proxy for Saprinus
  // prey availability that's not tied to explicit Agent instances —
  // the fly larvae are subliminal (too small + numerous to model
  // individually), tracked as a continuous-density resource that
  // peaks during the dung's fresh stage.
  fly_larvae_density: number = 0;
  // Universal post-mortem field (v0.10.0). When an agent dies, its
  // body mass contributes here on the death cell. Entomopathogenic
  // fungi (Beauveria bassiana) can nucleate where bug_corpse_g
  // crosses threshold. Decays at a slow background rate into
  // fungal_biomass_g + ammonia (the latter not modeled yet).
  bug_corpse_g: number = 0;
  // Meadow-patch fields (v0.11.0). nectar_g in flower cells fuels
  // pollinators; leaf_biomass_g in stem + grass cells feeds
  // grasshoppers. Both regenerate slowly via per-step plant growth
  // (handled in the meadow_growth event).
  nectar_g: number = 0;
  leaf_biomass_g: number = 0;
  // Bark-gallery fields (v0.12.0). phloem_g is the substrate Ips
  // larvae + adults consume; spruce bark cells normally contain
  // 0.5-1g and refill slowly as the tree responds. blue_stain
  // tracks Ophiostoma fungal coverage (0..1) — affects tree
  // resistance, which we don't yet model but track for narrators.
  phloem_g: number = 0;
  blue_stain: number = 0;
  // Freshwater-pond fields (v0.13.0). algal_biomass_g feeds Daphnia +
  // mosquito larvae in the water column. pond_detritus_g is mud-floor
  // organic matter (dragonfly larvae sit in it). daphnia_density is a
  // continuous-resource prey field (the same pattern as
  // fly_larvae_density) since Daphnia number in thousands per pond.
  algal_biomass_g: number = 0;
  pond_detritus_g: number = 0;
  daphnia_density: number = 0;
  // Tide-pool fields (v0.14.0). plankton_density is the continuous
  // suspension-feeding resource (replenished by tidal exchange,
  // modeled as a per-step regen). macroalgae_biomass_g is the
  // attached-algae substrate Patella + Littorina graze on rock walls;
  // it regenerates slowly via photosynthesis when the cell has light.
  plankton_density: number = 0;
  macroalgae_biomass_g: number = 0;

  // Decomposition-stage flags (real-valued, monotonic 0..1 within a stage).
  wood_decay_stage: number = 0; // 0 = sound wood, 1 = thoroughly rotted
  carrion_decomposition_stage: number = 0; // 0 = fresh, 1 = skeletonized

  // Free-form bag so per-scenario code can stash extras without an edit
  // to this class. Tighten as the bundle matures.
  [key: string]: any;
}
