// ============================================================
// js/11-engines-sessile.ts — sessile-organism growth engines
// ============================================================
// One grow_<species> function per sessile species, all registered in
// SESSILE_ENGINES. Each function consumes substrate-resources from
// the host cell (and optionally adjacent cells via the niche's
// neighbor adjacency), credits the species' growth zone, and
// returns the GrowthZone for the simulator to append.
//
// v0.2.0 ships one engine: Trametes versicolor. White-rot bracket
// fungus; nucleates in sapwood with sufficient moisture; decomposes
// wood_biomass_g into fungal_biomass_g (the food source for
// fungivores like Ceratophysella).
//
// SCRIPT-mode TS.

function grow_trametes_versicolor(
  org: SessileOrganism,
  cell: NicheCell,
  step: number,
): GrowthZone | null {
  const spec = SPECIES_SPEC?.["trametes_versicolor"]?.growth_params || {};
  const woodPerStep = spec.wood_decay_per_step_g ?? 0.05;
  const yieldRatio  = spec.fungal_yield_ratio ?? 0.35;
  const matureSize  = spec.mature_size_cm ?? 8;
  const growthRate  = spec.growth_rate_cm_per_step ?? 0.3;
  const minMoisture = spec.min_moisture ?? 0.4;

  // Vigor decays once the cell can no longer supply wood. Bracket
  // fungi persist after wood exhaustion (the basidiocarp lingers),
  // but they stop expanding.
  if ((cell.resources.wood_biomass_g ?? 0) <= 0 || (cell.resources.moisture ?? 0) < minMoisture) {
    org.vigor = Math.max(0, org.vigor - 0.02);
    return null;
  }

  const woodTaken = Math.min(woodPerStep, cell.resources.wood_biomass_g);
  cell.resources.wood_biomass_g -= woodTaken;
  const fungalProduced = woodTaken * yieldRatio;
  cell.resources.fungal_biomass_g = (cell.resources.fungal_biomass_g ?? 0) + fungalProduced;

  // Mass-balance: also advance the cell's wood_decay_stage. Wood-decay
  // stage is bounded [0, 1]; full decomposition asymptotes the stage
  // toward 1 as wood_biomass_g approaches 0.
  cell.resources.wood_decay_stage = Math.min(
    1,
    (cell.resources.wood_decay_stage ?? 0) + woodPerStep * 0.05,
  );

  org.size_cm = Math.min(matureSize, org.size_cm + growthRate);

  const zone = new GrowthZone();
  zone.step_start = step;
  zone.step_end = step;
  zone.thickness_um = growthRate * 10000; // cm -> um
  zone.resources_consumed = { wood_biomass_g: woodTaken };
  return zone;
}

SESSILE_ENGINES["trametes_versicolor"] = grow_trametes_versicolor;
