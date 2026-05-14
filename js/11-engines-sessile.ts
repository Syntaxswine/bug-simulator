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
  // Fraction of newly-produced fungal biomass that "spills" via
  // hyphal extension into adjacent non-void cells. v0.5.0 default
  // 0.25 — a quarter of the fungus's local production builds into
  // the mycelium fan that probes neighbors. Real bracket-fungus
  // mycelia explore aggressively; this is the visible signature.
  const myceliumSpreadFraction = spec.mycelium_spread_fraction ?? 0.25;

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
  const localShare = fungalProduced * (1 - myceliumSpreadFraction);
  const spreadShare = fungalProduced * myceliumSpreadFraction;
  cell.resources.fungal_biomass_g = (cell.resources.fungal_biomass_g ?? 0) + localShare;

  // Spread the remaining fungal share over the cell's non-void
  // neighbors. The simulator wires sim.niche.neighbors, but the
  // engine signature only gets the cell — fall through gracefully
  // if no spread-link is available. SESSILE_ENGINES doesn't have a
  // pointer to sim, so we extract the neighbor list lazily.
  const sim = (globalThis as any)._currentSimContext;
  if (sim?.niche && org.cell_idx >= 0) {
    const neighbors = sim.niche.neighbors?.[org.cell_idx] ?? [];
    if (neighbors.length > 0) {
      const each = spreadShare / neighbors.length;
      for (const n of neighbors) {
        const nc = sim.niche.cells[n];
        if (!nc || nc.substrate === "void") continue;
        nc.resources.fungal_biomass_g = (nc.resources.fungal_biomass_g ?? 0) + each;
      }
    } else {
      // No neighbor adjacency — keep the spread share in-place so
      // mass doesn't vanish.
      cell.resources.fungal_biomass_g += spreadShare;
    }
  } else {
    cell.resources.fungal_biomass_g += spreadShare;
  }

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

// ─── Sarracenia purpurea (host plant) ───────────────────────────────
//
// The plant doesn't consume anything in the simulation — its role is
// to bound the niche. Modeled as an immediately-mature sessile so it
// "exists" from day 0 and the renderer can mark it. Its
// detritus-capture function lives in the scenario.events
// (prey_capture event handled by the simulator main loop).

function grow_sarracenia_purpurea(
  org: SessileOrganism,
  _cell: NicheCell,
  _step: number,
): GrowthZone | null {
  if (org.size_cm < 20) org.size_cm = 20;
  return null;
}

SESSILE_ENGINES["sarracenia_purpurea"] = grow_sarracenia_purpurea;

// ─── Habrotrocha rosa (bdelloid rotifer colony) ─────────────────────
//
// Sessile filter feeder. Consumes bacterial_biomass_g from its cell;
// promotes mineralization of remaining prey_detritus into more
// bacterial biomass. Tiny — size_cm caps at 0.5.

function grow_habrotrocha_rosa(
  org: SessileOrganism,
  cell: NicheCell,
  step: number,
): GrowthZone | null {
  const spec = SPECIES_SPEC?.["habrotrocha_rosa"]?.growth_params || {};
  const bacterialPerStep = spec.bacterial_consumed_per_step_g ?? 0.02;
  const matureSize = spec.mature_size_cm ?? 0.5;
  const growthRate = spec.growth_rate_cm_per_step ?? 0.02;
  const minMoisture = spec.min_moisture ?? 0.9;

  if ((cell.resources.moisture ?? 0) < minMoisture) {
    org.vigor = Math.max(0, org.vigor - 0.02);
    return null;
  }

  // Detritus mineralizes into bacterial biomass continuously (slow).
  const mineralization = (cell.resources.prey_detritus_g ?? 0) * 0.08;
  cell.resources.prey_detritus_g = Math.max(0, (cell.resources.prey_detritus_g ?? 0) - mineralization);
  cell.resources.bacterial_biomass_g =
    (cell.resources.bacterial_biomass_g ?? 0) + mineralization;

  const eaten = Math.min(bacterialPerStep, cell.resources.bacterial_biomass_g ?? 0);
  cell.resources.bacterial_biomass_g -= eaten;
  if (eaten <= 0) {
    org.vigor = Math.max(0, org.vigor - 0.01);
    return null;
  }

  org.size_cm = Math.min(matureSize, org.size_cm + growthRate);
  const zone = new GrowthZone();
  zone.step_start = step;
  zone.step_end = step;
  zone.thickness_um = growthRate * 10000;
  zone.resources_consumed = { bacterial_biomass_g: eaten };
  return zone;
}

SESSILE_ENGINES["habrotrocha_rosa"] = grow_habrotrocha_rosa;

// ─── Beauveria bassiana (entomopathogenic fungus) ───────────────────
//
// Post-mortem colonizer that consumes bug_corpse_g and produces a
// small amount of fungal_biomass + sporulation visible on the
// corpse. Vigor declines once the corpse is exhausted — the
// fruiting mat persists briefly then collapses.

function grow_beauveria_bassiana(
  org: SessileOrganism,
  cell: NicheCell,
  step: number,
): GrowthZone | null {
  const spec = SPECIES_SPEC?.["beauveria_bassiana"]?.growth_params || {};
  const corpsePerStep = spec.corpse_consumed_per_step_g ?? 0.02;
  const yieldRatio    = spec.fungal_yield_ratio ?? 0.4;
  const matureSize    = spec.mature_size_cm ?? 1.2;
  const growthRate    = spec.growth_rate_cm_per_step ?? 0.08;
  const minMoisture   = spec.min_moisture ?? 0.4;

  if ((cell.resources.bug_corpse_g ?? 0) <= 0 || (cell.resources.moisture ?? 0) < minMoisture) {
    org.vigor = Math.max(0, org.vigor - 0.03);
    return null;
  }

  const taken = Math.min(corpsePerStep, cell.resources.bug_corpse_g);
  cell.resources.bug_corpse_g -= taken;
  cell.resources.fungal_biomass_g =
    (cell.resources.fungal_biomass_g ?? 0) + taken * yieldRatio;
  org.size_cm = Math.min(matureSize, org.size_cm + growthRate);

  const zone = new GrowthZone();
  zone.step_start = step;
  zone.step_end = step;
  zone.thickness_um = growthRate * 10000;
  zone.resources_consumed = { bug_corpse_g: taken };
  return zone;
}

SESSILE_ENGINES["beauveria_bassiana"] = grow_beauveria_bassiana;
