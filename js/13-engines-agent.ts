// ============================================================
// js/13-engines-agent.ts — per-species agent tick functions
// ============================================================
// Each motile species gets a tick_<species> function that runs once
// per simulation step. The function:
//   1. Pays the metabolic-cost-per-step out of energy.
//   2. Decides an action — eat / move / breed — based on perception
//      within the species' range.
//   3. Mutates the agent + niche state (resource consumption,
//      position change, new agent spawn).
//   4. Kills the agent if energy <= starvation threshold or
//      age > max_age.
//
// All decisions draw from the bundle's seeded `rng` so seed-42 sweep
// parity holds across the agent layer.
//
// SCRIPT-mode TS.

function _killAgent(agent: Agent, sim?: any, cause?: string, killer?: Agent): void {
  agent.alive = false;
  agent.life_stage = "senescent";
  if (sim?.events) {
    sim.events.push({
      step: sim.step,
      kind: "died",
      species: agent.species,
      cell_idx: agent.cell_idx,
      cause: cause ?? "unknown",
      killer_species: killer?.species,
    });
  }
  // Post-mortem biomass deposit (v0.10.0). Predation consumes most of
  // the corpse — the killer ate it — so credit only a fraction.
  // Starvation / old-age leave the whole body for opportunists.
  if (sim?.niche?.cells?.[agent.cell_idx]) {
    const spec = SPECIES_SPEC?.[agent.species];
    if (spec) {
      const massMg = (spec.body_size_mm ?? 5) * 0.5; // rough mg per mm
      const massG = massMg / 1000;
      const retainedFraction = cause === "predation" ? 0.15 : 1.0;
      const cell = sim.niche.cells[agent.cell_idx];
      cell.resources.bug_corpse_g = (cell.resources.bug_corpse_g ?? 0) + massG * retainedFraction;
    }
  }
}

function _aliveAgentsAt(sim: any, cellIdx: number): Agent[] {
  return sim.agents.filter((a: Agent) => a.alive && a.cell_idx === cellIdx);
}

function _aliveAgentsNear(sim: any, niche: NicheState, fromIdx: number, rangeCells: number): Agent[] {
  // BFS up to `rangeCells` steps through the adjacency graph; collect
  // alive agents found in any reached cell.
  const visited = new Set<number>([fromIdx]);
  let frontier = [fromIdx];
  for (let r = 0; r < rangeCells; r++) {
    const next: number[] = [];
    for (const c of frontier) {
      for (const n of niche.neighbors[c] || []) {
        if (!visited.has(n)) {
          visited.add(n);
          next.push(n);
        }
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }
  return sim.agents.filter((a: Agent) => a.alive && visited.has(a.cell_idx));
}

function _bestNeighborToward(
  niche: NicheState,
  fromIdx: number,
  scoreFn: (cellIdx: number) => number,
): number {
  const here = scoreFn(fromIdx);
  let best = fromIdx;
  let bestScore = here;
  for (const n of niche.neighbors[fromIdx] || []) {
    const s = scoreFn(n);
    if (s > bestScore) {
      bestScore = s;
      best = n;
    }
  }
  return best;
}

function _spawnChild(sim: any, parent: Agent, step: number): void {
  const child = new Agent();
  child.species = parent.species;
  child.cell_idx = parent.cell_idx;
  // v0.3.0: lay an egg if the species declares an egg stage; otherwise
  // start as adult (back-compat with species lacking life_stages).
  const stages = SPECIES_SPEC?.[parent.species]?.life_stages;
  child.life_stage = stages?.egg ? "egg" : "adult";
  child.age_steps = 0;
  child.stage_age = 0;
  const spec = SPECIES_SPEC?.[parent.species]?.agent_params || {};
  // Eggs have minimal energy reserves (yolk). Adults arriving via
  // colonization start fully-energized.
  child.energy = child.life_stage === "egg"
    ? (spec.starting_energy ?? 2) * 0.4
    : (spec.starting_energy ?? 2);
  child.step_born = step;
  child.alive = true;
  sim.agents.push(child);
  if (sim?.events) {
    sim.events.push({
      step,
      kind: child.life_stage === "egg" ? "egg_laid" : "born",
      species: parent.species,
      cell_idx: child.cell_idx,
    });
  }
}

// ─── Ceratophysella denticulata (springtail, fungivore) ─────────────

function tick_ceratophysella_denticulata(agent: Agent, niche: NicheState, sim: any): void {
  _advanceLifeStage(agent, sim);
  const stage = _stageInfo(agent);
  if (!stage.feeds && !stage.breeds && !stage.movable) {
    // Egg: just age silently. Mortality below still applies.
    if (agent.age_steps >= (SPECIES_SPEC?.["ceratophysella_denticulata"]?.agent_params?.max_age_steps ?? 60)) {
      _killAgent(agent, sim, "old_age");
    }
    return;
  }
  const spec = SPECIES_SPEC?.["ceratophysella_denticulata"]?.agent_params || {};
  agent.energy -= spec.metabolic_cost_per_step ?? 0.2;

  const eatAmt = spec.eat_amount_g ?? 0.05;
  const energyPerG = spec.energy_per_g_food ?? 8;
  const cell = niche.cellAt(agent.cell_idx);
  if (!cell) return;

  // 1. Eat in place if there's fungal biomass here.
  if ((cell.resources.fungal_biomass_g ?? 0) >= eatAmt) {
    cell.resources.fungal_biomass_g -= eatAmt;
    agent.energy += eatAmt * energyPerG;
  } else {
    // 2. Otherwise, step toward the neighbor with the most fungal_biomass.
    const target = _bestNeighborToward(
      niche, agent.cell_idx,
      (i) => (niche.cells[i].resources.fungal_biomass_g ?? 0),
    );
    agent.cell_idx = target;
  }

  // 3. Breed if energy is high.
  const breedAt = spec.breed_energy_threshold ?? 5;
  const breedCost = spec.breed_energy_cost ?? 4;
  const cooldown = spec.breed_cooldown_steps ?? 5;
  if (agent.energy >= breedAt && (agent.age_steps - (agent.last_breed_step ?? -cooldown)) >= cooldown) {
    agent.energy -= breedCost;
    agent.last_breed_step = agent.age_steps;
    _spawnChild(sim, agent, sim.step);
  }

  // 4. Mortality.
  if (agent.energy <= (spec.starvation_threshold ?? 0)) _killAgent(agent, sim, "starvation");
  else if (agent.age_steps >= (spec.max_age_steps ?? 60)) _killAgent(agent, sim, "old_age");
}

// ─── Glomeris marginata (pill millipede, detritivore) ───────────────

function tick_glomeris_marginata(agent: Agent, niche: NicheState, sim: any): void {
  _advanceLifeStage(agent, sim);
  const stage = _stageInfo(agent);
  if (!stage.feeds && !stage.breeds && !stage.movable) {
    if (agent.age_steps >= (SPECIES_SPEC?.["glomeris_marginata"]?.agent_params?.max_age_steps ?? 365)) {
      _killAgent(agent, sim, "old_age");
    }
    return;
  }
  const spec = SPECIES_SPEC?.["glomeris_marginata"]?.agent_params || {};
  agent.energy -= spec.metabolic_cost_per_step ?? 0.4;

  const eatAmt = spec.eat_amount_g ?? 0.2;
  const energyPerG = spec.energy_per_g_food ?? 6;
  const decayMin = spec.wood_decay_threshold ?? 0.3;
  const cell = niche.cellAt(agent.cell_idx);
  if (!cell) return;

  // 1. Eat from cell if it has leaf_litter or sufficiently decayed wood.
  let ate = false;
  if ((cell.resources.leaf_litter_g ?? 0) >= eatAmt) {
    cell.resources.leaf_litter_g -= eatAmt;
    agent.energy += eatAmt * energyPerG;
    ate = true;
  } else if ((cell.resources.wood_decay_stage ?? 0) >= decayMin && (cell.resources.wood_biomass_g ?? 0) >= eatAmt) {
    cell.resources.wood_biomass_g -= eatAmt;
    agent.energy += eatAmt * energyPerG * 0.7; // wood is less calorie-dense than litter
    ate = true;
  }

  if (!ate) {
    // 2. Otherwise move toward the neighbor with most edible substrate.
    const target = _bestNeighborToward(
      niche, agent.cell_idx,
      (i) => {
        const c = niche.cells[i];
        const litter = c.resources.leaf_litter_g ?? 0;
        const wood = ((c.resources.wood_decay_stage ?? 0) >= decayMin)
          ? (c.resources.wood_biomass_g ?? 0) * 0.7
          : 0;
        return litter + wood;
      },
    );
    agent.cell_idx = target;
  }

  // 3. Breed.
  const breedAt = spec.breed_energy_threshold ?? 12;
  const breedCost = spec.breed_energy_cost ?? 9;
  const cooldown = spec.breed_cooldown_steps ?? 20;
  if (agent.energy >= breedAt && (agent.age_steps - (agent.last_breed_step ?? -cooldown)) >= cooldown) {
    agent.energy -= breedCost;
    agent.last_breed_step = agent.age_steps;
    _spawnChild(sim, agent, sim.step);
  }

  // 4. Mortality.
  if (agent.energy <= (spec.starvation_threshold ?? 0)) _killAgent(agent, sim, "starvation");
  else if (agent.age_steps >= (spec.max_age_steps ?? 365)) _killAgent(agent, sim, "old_age");
}

// ─── Lithobius forficatus (stone centipede, predator) ───────────────

function tick_lithobius_forficatus(agent: Agent, niche: NicheState, sim: any): void {
  _advanceLifeStage(agent, sim);
  const stage = _stageInfo(agent);
  if (!stage.feeds && !stage.breeds && !stage.movable) {
    if (agent.age_steps >= (SPECIES_SPEC?.["lithobius_forficatus"]?.agent_params?.max_age_steps ?? 1095)) {
      _killAgent(agent, sim, "old_age");
    }
    return;
  }
  const spec = SPECIES_SPEC?.["lithobius_forficatus"]?.agent_params || {};
  agent.energy -= spec.metabolic_cost_per_step ?? 0.5;

  const maxPreyMm = spec.prey_body_size_max_mm ?? 15;
  const energyPerMg = spec.energy_per_prey_mg ?? 0.5;
  const perceptionCells = Math.max(1, Math.round((SPECIES_SPEC?.["lithobius_forficatus"]?.perception_radius_cm ?? 6) / ((niche as any).grid?.cellSizeCm ?? 1)));

  // 1. Hunt: pick the closest valid prey in perception.
  // Conspecific cannibalism gate (v0.8.0 — predator-extinction bugfix):
  // Real Lithobius does eat smaller conspecifics + juveniles when
  // hungry. Open this option only when the agent's energy is low,
  // so the default behavior (preferentially target other species)
  // still dominates when prey is abundant.
  const isStarving = agent.energy < (spec.starting_energy ?? 8) * 0.4;
  const candidates = _aliveAgentsNear(sim, niche, agent.cell_idx, perceptionCells)
    .filter((a: Agent) => {
      if (a === agent) return false;
      const sz = SPECIES_SPEC?.[a.species]?.body_size_mm ?? 999;
      if (sz > maxPreyMm) return false;
      // Cannibalism: allowed only when starving. Even then, only
      // significantly smaller conspecifics (eggs, sub-adults via
      // smaller body_size proxy) — full-adult vs full-adult fights
      // would be too costly.
      if (a.species === agent.species) {
        if (!isStarving) return false;
        // Conspecific must be in egg / non-adult stage.
        if (a.life_stage === "adult") return false;
      }
      return true;
    });

  if (candidates.length > 0) {
    // Pick the prey in the closest cell (current cell first, then BFS).
    let target = candidates[0];
    let bestDist = Infinity;
    for (const c of candidates) {
      // Use Manhattan distance on the grid as a stand-in for path length.
      const grid = (niche as any).grid;
      if (grid?.N) {
        const ai = Math.floor(agent.cell_idx / grid.N), aj = agent.cell_idx % grid.N;
        const bi = Math.floor(c.cell_idx / grid.N),     bj = c.cell_idx % grid.N;
        const d = Math.abs(ai - bi) + Math.abs(aj - bj);
        if (d < bestDist) { bestDist = d; target = c; }
      }
    }
    // Move toward target one cell.
    const grid = (niche as any).grid;
    if (grid?.N && bestDist > 0) {
      const ai = Math.floor(agent.cell_idx / grid.N), aj = agent.cell_idx % grid.N;
      const bi = Math.floor(target.cell_idx / grid.N), bj = target.cell_idx % grid.N;
      let next = agent.cell_idx;
      if (ai < bi) next = (ai + 1) * grid.N + aj;
      else if (ai > bi) next = (ai - 1) * grid.N + aj;
      else if (aj < bj) next = ai * grid.N + (aj + 1);
      else if (aj > bj) next = ai * grid.N + (aj - 1);
      if (niche.cells[next]?.substrate !== "void") agent.cell_idx = next;
    }
    // If we landed on the prey's cell, kill + consume.
    if (agent.cell_idx === target.cell_idx) {
      const preyMassMg = (SPECIES_SPEC?.[target.species]?.body_size_mm ?? 5) * 0.5; // rough mg per mm body
      agent.energy += preyMassMg * energyPerMg;
      _killAgent(target, sim, "predation", agent);
    }
  }

  // 2. Breed.
  const breedAt = spec.breed_energy_threshold ?? 20;
  const breedCost = spec.breed_energy_cost ?? 16;
  const cooldown = spec.breed_cooldown_steps ?? 60;
  if (agent.energy >= breedAt && (agent.age_steps - (agent.last_breed_step ?? -cooldown)) >= cooldown) {
    agent.energy -= breedCost;
    agent.last_breed_step = agent.age_steps;
    _spawnChild(sim, agent, sim.step);
  }

  // 3. Mortality.
  if (agent.energy <= (spec.starvation_threshold ?? 0)) _killAgent(agent, sim, "starvation");
  else if (agent.age_steps >= (spec.max_age_steps ?? 1095)) _killAgent(agent, sim, "old_age");
}

// ─── Oniscus asellus (common woodlouse, detritivore) ───────────────
//
// Mechanically similar to Glomeris but tolerates a wider decay range
// (threshold 0.2 vs 0.3) and eats more per step. Slower escape, so
// Lithobius predates them more readily; counterbalanced by faster
// breeding (cooldown 25 vs Glomeris's 20 + larger brood not yet
// modeled, so just shorter cooldown for v0.5.0).

function tick_oniscus_asellus(agent: Agent, niche: NicheState, sim: any): void {
  _advanceLifeStage(agent, sim);
  const stage = _stageInfo(agent);
  if (!stage.feeds && !stage.breeds && !stage.movable) {
    if (agent.age_steps >= (SPECIES_SPEC?.["oniscus_asellus"]?.agent_params?.max_age_steps ?? 500)) {
      _killAgent(agent, sim, "old_age");
    }
    return;
  }
  const spec = SPECIES_SPEC?.["oniscus_asellus"]?.agent_params || {};
  agent.energy -= spec.metabolic_cost_per_step ?? 0.45;

  const eatAmt = spec.eat_amount_g ?? 0.25;
  const energyPerG = spec.energy_per_g_food ?? 5;
  const decayMin = spec.wood_decay_threshold ?? 0.2;
  const cell = niche.cellAt(agent.cell_idx);
  if (!cell) return;

  let ate = false;
  if ((cell.resources.leaf_litter_g ?? 0) >= eatAmt) {
    cell.resources.leaf_litter_g -= eatAmt;
    agent.energy += eatAmt * energyPerG;
    ate = true;
  } else if ((cell.resources.wood_decay_stage ?? 0) >= decayMin && (cell.resources.wood_biomass_g ?? 0) >= eatAmt) {
    cell.resources.wood_biomass_g -= eatAmt;
    agent.energy += eatAmt * energyPerG * 0.7;
    ate = true;
  }

  if (!ate) {
    const target = _bestNeighborToward(
      niche, agent.cell_idx,
      (i) => {
        const c = niche.cells[i];
        const litter = c.resources.leaf_litter_g ?? 0;
        const wood = ((c.resources.wood_decay_stage ?? 0) >= decayMin)
          ? (c.resources.wood_biomass_g ?? 0) * 0.7
          : 0;
        return litter + wood;
      },
    );
    agent.cell_idx = target;
  }

  const breedAt = spec.breed_energy_threshold ?? 14;
  const breedCost = spec.breed_energy_cost ?? 10;
  const cooldown = spec.breed_cooldown_steps ?? 25;
  if (agent.energy >= breedAt && (agent.age_steps - (agent.last_breed_step ?? -cooldown)) >= cooldown) {
    agent.energy -= breedCost;
    agent.last_breed_step = agent.age_steps;
    _spawnChild(sim, agent, sim.step);
  }

  if (agent.energy <= (spec.starvation_threshold ?? 0)) _killAgent(agent, sim, "starvation");
  else if (agent.age_steps >= (spec.max_age_steps ?? 500)) _killAgent(agent, sim, "old_age");
}

// ─── Neobisium muscorum (moss pseudoscorpion, small predator) ──────
//
// Targets soft-body prey ≤ 6mm — springtails, mites (once added). Too
// small to take millipedes/woodlice/centipedes. Doesn't compete with
// Lithobius which hunts larger prey. Mechanically: BFS for valid
// prey within perception, Manhattan-step pursuit, kill on cell
// overlap (same pattern as Lithobius).

function tick_neobisium_muscorum(agent: Agent, niche: NicheState, sim: any): void {
  _advanceLifeStage(agent, sim);
  const stage = _stageInfo(agent);
  if (!stage.feeds && !stage.breeds && !stage.movable) {
    if (agent.age_steps >= (SPECIES_SPEC?.["neobisium_muscorum"]?.agent_params?.max_age_steps ?? 720)) {
      _killAgent(agent, sim, "old_age");
    }
    return;
  }
  const spec = SPECIES_SPEC?.["neobisium_muscorum"]?.agent_params || {};
  agent.energy -= spec.metabolic_cost_per_step ?? 0.25;

  const maxPreyMm = spec.prey_body_size_max_mm ?? 6;
  const energyPerMg = spec.energy_per_prey_mg ?? 0.6;
  const perceptionCells = Math.max(1, Math.round((SPECIES_SPEC?.["neobisium_muscorum"]?.perception_radius_cm ?? 3) / ((niche as any).grid?.cellSizeCm ?? 1)));

  const candidates = _aliveAgentsNear(sim, niche, agent.cell_idx, perceptionCells)
    .filter((a: Agent) => {
      if (a === agent) return false;
      const sz = SPECIES_SPEC?.[a.species]?.body_size_mm ?? 999;
      if (sz > maxPreyMm) return false;
      if (a.species === agent.species) return false;
      // Pseudoscorpions take soft-body prey, not other arachnids /
      // crustaceans. Restrict to fungivore guild (springtails, mites)
      // — which excludes the woodlouse + millipede via their
      // detritivore guild even at small sizes.
      if (SPECIES_SPEC?.[a.species]?.guild !== "fungivore") return false;
      return true;
    });

  if (candidates.length > 0) {
    let target = candidates[0];
    let bestDist = Infinity;
    const grid = (niche as any).grid;
    if (grid?.N) {
      for (const c of candidates) {
        const ai = Math.floor(agent.cell_idx / grid.N), aj = agent.cell_idx % grid.N;
        const bi = Math.floor(c.cell_idx / grid.N),     bj = c.cell_idx % grid.N;
        const d = Math.abs(ai - bi) + Math.abs(aj - bj);
        if (d < bestDist) { bestDist = d; target = c; }
      }
      if (bestDist > 0) {
        const ai = Math.floor(agent.cell_idx / grid.N), aj = agent.cell_idx % grid.N;
        const bi = Math.floor(target.cell_idx / grid.N), bj = target.cell_idx % grid.N;
        let next = agent.cell_idx;
        if (ai < bi) next = (ai + 1) * grid.N + aj;
        else if (ai > bi) next = (ai - 1) * grid.N + aj;
        else if (aj < bj) next = ai * grid.N + (aj + 1);
        else if (aj > bj) next = ai * grid.N + (aj - 1);
        if (niche.cells[next]?.substrate !== "void") agent.cell_idx = next;
      }
    }
    if (agent.cell_idx === target.cell_idx) {
      const preyMassMg = (SPECIES_SPEC?.[target.species]?.body_size_mm ?? 5) * 0.5;
      agent.energy += preyMassMg * energyPerMg;
      _killAgent(target, sim, "predation", agent);
    }
  }

  const breedAt = spec.breed_energy_threshold ?? 8;
  const breedCost = spec.breed_energy_cost ?? 6;
  const cooldown = spec.breed_cooldown_steps ?? 35;
  if (agent.energy >= breedAt && (agent.age_steps - (agent.last_breed_step ?? -cooldown)) >= cooldown) {
    agent.energy -= breedCost;
    agent.last_breed_step = agent.age_steps;
    _spawnChild(sim, agent, sim.step);
  }

  if (agent.energy <= (spec.starvation_threshold ?? 0)) _killAgent(agent, sim, "starvation");
  else if (agent.age_steps >= (spec.max_age_steps ?? 720)) _killAgent(agent, sim, "old_age");
}

AGENT_TICKERS["ceratophysella_denticulata"] = tick_ceratophysella_denticulata;
AGENT_TICKERS["glomeris_marginata"] = tick_glomeris_marginata;
AGENT_TICKERS["oniscus_asellus"] = tick_oniscus_asellus;
AGENT_TICKERS["neobisium_muscorum"] = tick_neobisium_muscorum;
AGENT_TICKERS["lithobius_forficatus"] = tick_lithobius_forficatus;

// ─── Wyeomyia smithii (pitcher-plant mosquito larva, filter feeder) ─
//
// Confined to water_column substrate; filters bacterial_biomass from
// its cell. Moves randomly within water_column cells when no food in
// current cell. Pupates and "emerges" at max_age — modeled as kill.

function tick_wyeomyia_smithii(agent: Agent, niche: NicheState, sim: any): void {
  _advanceLifeStage(agent, sim);
  const stage = _stageInfo(agent);
  if (!stage.feeds && !stage.breeds && !stage.movable) {
    if (agent.age_steps >= (SPECIES_SPEC?.["wyeomyia_smithii"]?.agent_params?.max_age_steps ?? 28)) {
      _killAgent(agent, sim, "old_age");
    }
    return;
  }
  const spec = SPECIES_SPEC?.["wyeomyia_smithii"]?.agent_params || {};
  agent.energy -= spec.metabolic_cost_per_step ?? 0.25;
  const eatAmt = spec.eat_amount_g ?? 0.04;
  const energyPerG = spec.energy_per_g_food ?? 10;
  const cell = niche.cellAt(agent.cell_idx);
  if (!cell) return;

  // Eat bacterial biomass in current cell.
  if ((cell.resources.bacterial_biomass_g ?? 0) >= eatAmt) {
    cell.resources.bacterial_biomass_g -= eatAmt;
    agent.energy += eatAmt * energyPerG;
  } else {
    // Move toward a water_column neighbor with more bacterial biomass.
    const target = _bestNeighborToward(
      niche, agent.cell_idx,
      (i) => {
        const c = niche.cells[i];
        if (c.substrate !== "water_column") return -1;
        return c.resources.bacterial_biomass_g ?? 0;
      },
    );
    if (niche.cells[target]?.substrate === "water_column") {
      agent.cell_idx = target;
    }
  }

  // Breed (lays an egg into the same cell). Real Wyeomyia breeds as
  // adult moths outside the pitcher, but for sim purposes we treat
  // breeding as larval-asexual reproduction so the population
  // self-sustains within the niche.
  const breedAt = spec.breed_energy_threshold ?? 8;
  const breedCost = spec.breed_energy_cost ?? 5;
  const cooldown = spec.breed_cooldown_steps ?? 12;
  if (agent.energy >= breedAt && (agent.age_steps - (agent.last_breed_step ?? -cooldown)) >= cooldown) {
    agent.energy -= breedCost;
    agent.last_breed_step = agent.age_steps;
    _spawnChild(sim, agent, sim.step);
  }

  if (agent.energy <= (spec.starvation_threshold ?? 0)) _killAgent(agent, sim, "starvation");
  else if (agent.age_steps >= (spec.max_age_steps ?? 28)) _killAgent(agent, sim, "old_age");
}

// ─── Metriocnemus knabi (pitcher-plant midge larva, detritivore) ────
//
// Lives on pitcher_floor. Eats prey_detritus + bacterial_biomass.
// Larval fragmentation of detritus accelerates mineralization —
// modeled as a `fragmentation_rate` that converts a small fraction
// of detritus to bacterial_biomass per step regardless of feeding.

function tick_metriocnemus_knabi(agent: Agent, niche: NicheState, sim: any): void {
  _advanceLifeStage(agent, sim);
  const stage = _stageInfo(agent);
  if (!stage.feeds && !stage.breeds && !stage.movable) {
    if (agent.age_steps >= (SPECIES_SPEC?.["metriocnemus_knabi"]?.agent_params?.max_age_steps ?? 65)) {
      _killAgent(agent, sim, "old_age");
    }
    return;
  }
  const spec = SPECIES_SPEC?.["metriocnemus_knabi"]?.agent_params || {};
  agent.energy -= spec.metabolic_cost_per_step ?? 0.2;
  const eatAmt = spec.eat_amount_g ?? 0.06;
  const energyPerG = spec.energy_per_g_food ?? 7;
  const fragRate = spec.fragmentation_rate ?? 0.3;
  const cell = niche.cellAt(agent.cell_idx);
  if (!cell) return;

  // Fragmentation: a portion of detritus is converted to bacterial
  // food for filter feeders. This is the ecosystem-service the midge
  // provides — making detritus available to Wyeomyia.
  if ((cell.resources.prey_detritus_g ?? 0) > 0) {
    const frag = (cell.resources.prey_detritus_g ?? 0) * fragRate * 0.1;
    cell.resources.prey_detritus_g -= frag;
    cell.resources.bacterial_biomass_g = (cell.resources.bacterial_biomass_g ?? 0) + frag;
  }

  // Then eat: prefer detritus, then bacterial biomass.
  let ate = false;
  if ((cell.resources.prey_detritus_g ?? 0) >= eatAmt) {
    cell.resources.prey_detritus_g -= eatAmt;
    agent.energy += eatAmt * energyPerG;
    ate = true;
  } else if ((cell.resources.bacterial_biomass_g ?? 0) >= eatAmt) {
    cell.resources.bacterial_biomass_g -= eatAmt;
    agent.energy += eatAmt * energyPerG * 0.7;
    ate = true;
  }

  if (!ate) {
    // Crawl toward a pitcher_floor neighbor with more detritus.
    const target = _bestNeighborToward(
      niche, agent.cell_idx,
      (i) => {
        const c = niche.cells[i];
        if (c.substrate !== "pitcher_floor") return -1;
        return (c.resources.prey_detritus_g ?? 0) + (c.resources.bacterial_biomass_g ?? 0);
      },
    );
    if (niche.cells[target]?.substrate === "pitcher_floor") {
      agent.cell_idx = target;
    }
  }

  const breedAt = spec.breed_energy_threshold ?? 10;
  const breedCost = spec.breed_energy_cost ?? 7;
  const cooldown = spec.breed_cooldown_steps ?? 18;
  if (agent.energy >= breedAt && (agent.age_steps - (agent.last_breed_step ?? -cooldown)) >= cooldown) {
    agent.energy -= breedCost;
    agent.last_breed_step = agent.age_steps;
    _spawnChild(sim, agent, sim.step);
  }

  if (agent.energy <= (spec.starvation_threshold ?? 0)) _killAgent(agent, sim, "starvation");
  else if (agent.age_steps >= (spec.max_age_steps ?? 65)) _killAgent(agent, sim, "old_age");
}

AGENT_TICKERS["wyeomyia_smithii"] = tick_wyeomyia_smithii;
AGENT_TICKERS["metriocnemus_knabi"] = tick_metriocnemus_knabi;

// ─── Calliphora vicina (blue blowfly larva, fresh-stage necrophage) ─

function tick_calliphora_vicina(agent: Agent, niche: NicheState, sim: any): void {
  _advanceLifeStage(agent, sim);
  const stage = _stageInfo(agent);
  if (!stage.feeds && !stage.breeds && !stage.movable) {
    if (agent.age_steps >= (SPECIES_SPEC?.["calliphora_vicina"]?.agent_params?.max_age_steps ?? 17)) {
      _killAgent(agent, sim, "old_age");
    }
    return;
  }
  const spec = SPECIES_SPEC?.["calliphora_vicina"]?.agent_params || {};
  agent.energy -= spec.metabolic_cost_per_step ?? 0.3;
  const eatAmt = spec.eat_amount_g ?? 0.4;
  const energyPerG = spec.energy_per_g_food ?? 6;
  const cell = niche.cellAt(agent.cell_idx);
  if (!cell) return;

  if ((cell.resources.soft_tissue_g ?? 0) >= eatAmt) {
    cell.resources.soft_tissue_g -= eatAmt;
    agent.energy += eatAmt * energyPerG;
  } else {
    // Crawl toward neighbor with more soft tissue.
    const target = _bestNeighborToward(niche, agent.cell_idx,
      (i) => (niche.cells[i].resources.soft_tissue_g ?? 0));
    agent.cell_idx = target;
  }

  const breedAt = spec.breed_energy_threshold ?? 9;
  const breedCost = spec.breed_energy_cost ?? 6;
  const cooldown = spec.breed_cooldown_steps ?? 5;
  if (agent.energy >= breedAt && (agent.age_steps - (agent.last_breed_step ?? -cooldown)) >= cooldown) {
    agent.energy -= breedCost;
    agent.last_breed_step = agent.age_steps;
    _spawnChild(sim, agent, sim.step);
  }

  if (agent.energy <= (spec.starvation_threshold ?? 0)) _killAgent(agent, sim, "starvation");
  else if (agent.age_steps >= (spec.max_age_steps ?? 17)) _killAgent(agent, sim, "old_age");
}

// ─── Necrodes littoralis (shore carrion beetle, mixed feeder) ───────
//
// Eats soft_tissue + actively predates fly larvae (Calliphora). The
// mixed strategy means it can survive both the fresh stage (lots of
// flies + tissue) and the active-decay stage (declining tissue but
// peak fly density).

function tick_necrodes_littoralis(agent: Agent, niche: NicheState, sim: any): void {
  _advanceLifeStage(agent, sim);
  const stage = _stageInfo(agent);
  if (!stage.feeds && !stage.breeds && !stage.movable) {
    if (agent.age_steps >= (SPECIES_SPEC?.["necrodes_littoralis"]?.agent_params?.max_age_steps ?? 120)) {
      _killAgent(agent, sim, "old_age");
    }
    return;
  }
  const spec = SPECIES_SPEC?.["necrodes_littoralis"]?.agent_params || {};
  agent.energy -= spec.metabolic_cost_per_step ?? 0.4;
  const eatAmt = spec.eat_amount_g ?? 0.2;
  const energyPerG = spec.energy_per_g_food ?? 6;
  const maxPreyMm = spec.prey_body_size_max_mm ?? 15;
  const energyPerMg = spec.energy_per_prey_mg ?? 0.4;
  const cell = niche.cellAt(agent.cell_idx);
  if (!cell) return;

  let consumed = false;
  // Priority 1: prey if in current cell.
  const here = _aliveAgentsAt(sim, agent.cell_idx)
    .filter((a: Agent) => a !== agent
      && a.species === "calliphora_vicina"
      && (SPECIES_SPEC?.[a.species]?.body_size_mm ?? 999) <= maxPreyMm);
  if (here.length > 0) {
    const target = here[0];
    const preyMassMg = (SPECIES_SPEC?.[target.species]?.body_size_mm ?? 5) * 0.5;
    agent.energy += preyMassMg * energyPerMg;
    _killAgent(target, sim, "predation", agent);
    consumed = true;
  }
  // Priority 2: soft tissue in cell.
  if (!consumed && (cell.resources.soft_tissue_g ?? 0) >= eatAmt) {
    cell.resources.soft_tissue_g -= eatAmt;
    agent.energy += eatAmt * energyPerG;
    consumed = true;
  }
  // Priority 3: move toward food gradient.
  if (!consumed) {
    const target = _bestNeighborToward(niche, agent.cell_idx,
      (i) => {
        const c = niche.cells[i];
        const tissue = c.resources.soft_tissue_g ?? 0;
        const flies = _aliveAgentsAt(sim, i).filter((a: Agent) => a.species === "calliphora_vicina").length;
        return tissue + flies * 2;
      });
    agent.cell_idx = target;
  }

  const breedAt = spec.breed_energy_threshold ?? 16;
  const breedCost = spec.breed_energy_cost ?? 11;
  const cooldown = spec.breed_cooldown_steps ?? 20;
  if (agent.energy >= breedAt && (agent.age_steps - (agent.last_breed_step ?? -cooldown)) >= cooldown) {
    agent.energy -= breedCost;
    agent.last_breed_step = agent.age_steps;
    _spawnChild(sim, agent, sim.step);
  }

  if (agent.energy <= (spec.starvation_threshold ?? 0)) _killAgent(agent, sim, "starvation");
  else if (agent.age_steps >= (spec.max_age_steps ?? 120)) _killAgent(agent, sim, "old_age");
}

// ─── Dermestes lardarius (larder beetle, late-stage keratinophage) ──
//
// Eats skin (keratin-rich), arrives only after the fresh + active
// stages have largely depleted soft_tissue. Slow movement, long-lived.

function tick_dermestes_lardarius(agent: Agent, niche: NicheState, sim: any): void {
  _advanceLifeStage(agent, sim);
  const stage = _stageInfo(agent);
  if (!stage.feeds && !stage.breeds && !stage.movable) {
    if (agent.age_steps >= (SPECIES_SPEC?.["dermestes_lardarius"]?.agent_params?.max_age_steps ?? 180)) {
      _killAgent(agent, sim, "old_age");
    }
    return;
  }
  const spec = SPECIES_SPEC?.["dermestes_lardarius"]?.agent_params || {};
  agent.energy -= spec.metabolic_cost_per_step ?? 0.3;
  const eatAmt = spec.eat_amount_g ?? 0.1;
  const energyPerG = spec.energy_per_g_food ?? 5;
  const cell = niche.cellAt(agent.cell_idx);
  if (!cell) return;

  if ((cell.resources.skin_g ?? 0) >= eatAmt) {
    cell.resources.skin_g -= eatAmt;
    agent.energy += eatAmt * energyPerG;
  } else {
    const target = _bestNeighborToward(niche, agent.cell_idx,
      (i) => (niche.cells[i].resources.skin_g ?? 0));
    agent.cell_idx = target;
  }

  const breedAt = spec.breed_energy_threshold ?? 12;
  const breedCost = spec.breed_energy_cost ?? 8;
  const cooldown = spec.breed_cooldown_steps ?? 30;
  if (agent.energy >= breedAt && (agent.age_steps - (agent.last_breed_step ?? -cooldown)) >= cooldown) {
    agent.energy -= breedCost;
    agent.last_breed_step = agent.age_steps;
    _spawnChild(sim, agent, sim.step);
  }

  if (agent.energy <= (spec.starvation_threshold ?? 0)) _killAgent(agent, sim, "starvation");
  else if (agent.age_steps >= (spec.max_age_steps ?? 180)) _killAgent(agent, sim, "old_age");
}

AGENT_TICKERS["calliphora_vicina"] = tick_calliphora_vicina;
AGENT_TICKERS["necrodes_littoralis"] = tick_necrodes_littoralis;
AGENT_TICKERS["dermestes_lardarius"] = tick_dermestes_lardarius;

// ─── Aphodius rufipes (surface dwelling dung beetle) ────────────────

function tick_aphodius_rufipes(agent: Agent, niche: NicheState, sim: any): void {
  _advanceLifeStage(agent, sim);
  const stage = _stageInfo(agent);
  if (!stage.feeds && !stage.breeds && !stage.movable) {
    if (agent.age_steps >= (SPECIES_SPEC?.["aphodius_rufipes"]?.agent_params?.max_age_steps ?? 22)) {
      _killAgent(agent, sim, "old_age");
    }
    return;
  }
  const spec = SPECIES_SPEC?.["aphodius_rufipes"]?.agent_params || {};
  agent.energy -= spec.metabolic_cost_per_step ?? 0.35;
  const eatAmt = spec.eat_amount_g ?? 0.15;
  const energyPerG = spec.energy_per_g_food ?? 7;
  const cell = niche.cellAt(agent.cell_idx);
  if (!cell) return;

  if ((cell.resources.dung_g ?? 0) >= eatAmt) {
    cell.resources.dung_g -= eatAmt;
    agent.energy += eatAmt * energyPerG;
  } else {
    const target = _bestNeighborToward(niche, agent.cell_idx,
      (i) => (niche.cells[i].resources.dung_g ?? 0));
    agent.cell_idx = target;
  }

  const breedAt = spec.breed_energy_threshold ?? 10;
  const breedCost = spec.breed_energy_cost ?? 7;
  const cooldown = spec.breed_cooldown_steps ?? 4;
  if (agent.energy >= breedAt && (agent.age_steps - (agent.last_breed_step ?? -cooldown)) >= cooldown) {
    agent.energy -= breedCost;
    agent.last_breed_step = agent.age_steps;
    _spawnChild(sim, agent, sim.step);
  }

  if (agent.energy <= (spec.starvation_threshold ?? 0)) _killAgent(agent, sim, "starvation");
  else if (agent.age_steps >= (spec.max_age_steps ?? 22)) _killAgent(agent, sim, "old_age");
}

// ─── Geotrupes stercorarius (large tunneling dung beetle) ───────────
//
// Eats more per step than Aphodius and consumes from dung_interior +
// dung_soil_interface. Real Geotrupes excavate vertical shafts, but
// in the 2D model their tunneling shows as gradient-toward-interior
// movement + larger eat amount.

function tick_geotrupes_stercorarius(agent: Agent, niche: NicheState, sim: any): void {
  _advanceLifeStage(agent, sim);
  const stage = _stageInfo(agent);
  if (!stage.feeds && !stage.breeds && !stage.movable) {
    if (agent.age_steps >= (SPECIES_SPEC?.["geotrupes_stercorarius"]?.agent_params?.max_age_steps ?? 90)) {
      _killAgent(agent, sim, "old_age");
    }
    return;
  }
  const spec = SPECIES_SPEC?.["geotrupes_stercorarius"]?.agent_params || {};
  agent.energy -= spec.metabolic_cost_per_step ?? 0.4;
  const eatAmt = spec.eat_amount_g ?? 0.6;
  const energyPerG = spec.energy_per_g_food ?? 6;
  const cell = niche.cellAt(agent.cell_idx);
  if (!cell) return;

  if ((cell.resources.dung_g ?? 0) >= eatAmt) {
    cell.resources.dung_g -= eatAmt;
    agent.energy += eatAmt * energyPerG;
  } else {
    const target = _bestNeighborToward(niche, agent.cell_idx,
      (i) => (niche.cells[i].resources.dung_g ?? 0));
    agent.cell_idx = target;
  }

  const breedAt = spec.breed_energy_threshold ?? 18;
  const breedCost = spec.breed_energy_cost ?? 12;
  const cooldown = spec.breed_cooldown_steps ?? 12;
  if (agent.energy >= breedAt && (agent.age_steps - (agent.last_breed_step ?? -cooldown)) >= cooldown) {
    agent.energy -= breedCost;
    agent.last_breed_step = agent.age_steps;
    _spawnChild(sim, agent, sim.step);
  }

  if (agent.energy <= (spec.starvation_threshold ?? 0)) _killAgent(agent, sim, "starvation");
  else if (agent.age_steps >= (spec.max_age_steps ?? 90)) _killAgent(agent, sim, "old_age");
}

// ─── Saprinus semistriatus (clown beetle, fly-larvae predator) ──────
//
// Eats fly larvae density rather than dung directly. The fly larvae
// pool is a resource_profile field that the dung_decay event keeps
// in a Gaussian bump centered around days 4-6. Saprinus depletes
// it locally as it feeds.

function tick_saprinus_semistriatus(agent: Agent, niche: NicheState, sim: any): void {
  _advanceLifeStage(agent, sim);
  const stage = _stageInfo(agent);
  if (!stage.feeds && !stage.breeds && !stage.movable) {
    if (agent.age_steps >= (SPECIES_SPEC?.["saprinus_semistriatus"]?.agent_params?.max_age_steps ?? 60)) {
      _killAgent(agent, sim, "old_age");
    }
    return;
  }
  const spec = SPECIES_SPEC?.["saprinus_semistriatus"]?.agent_params || {};
  agent.energy -= spec.metabolic_cost_per_step ?? 0.3;
  const eatAmt = spec.eat_amount_g ?? 0.08;
  const energyPerG = spec.energy_per_g_food ?? 9;
  const cell = niche.cellAt(agent.cell_idx);
  if (!cell) return;

  // Feeding on the fly_larvae_density field — modeled as a resource
  // (not as Agent instances) because individual fly larvae would
  // multiply the agent count by thousands without adding mechanics.
  if ((cell.resources.fly_larvae_density ?? 0) >= eatAmt) {
    cell.resources.fly_larvae_density = (cell.resources.fly_larvae_density ?? 0) - eatAmt;
    agent.energy += eatAmt * energyPerG;
  } else {
    const target = _bestNeighborToward(niche, agent.cell_idx,
      (i) => (niche.cells[i].resources.fly_larvae_density ?? 0));
    agent.cell_idx = target;
  }

  const breedAt = spec.breed_energy_threshold ?? 11;
  const breedCost = spec.breed_energy_cost ?? 8;
  const cooldown = spec.breed_cooldown_steps ?? 14;
  if (agent.energy >= breedAt && (agent.age_steps - (agent.last_breed_step ?? -cooldown)) >= cooldown) {
    agent.energy -= breedCost;
    agent.last_breed_step = agent.age_steps;
    _spawnChild(sim, agent, sim.step);
  }

  if (agent.energy <= (spec.starvation_threshold ?? 0)) _killAgent(agent, sim, "starvation");
  else if (agent.age_steps >= (spec.max_age_steps ?? 60)) _killAgent(agent, sim, "old_age");
}

AGENT_TICKERS["aphodius_rufipes"] = tick_aphodius_rufipes;
AGENT_TICKERS["geotrupes_stercorarius"] = tick_geotrupes_stercorarius;
AGENT_TICKERS["saprinus_semistriatus"] = tick_saprinus_semistriatus;

// ─── Pieris brassicae (large white butterfly, pollinator) ───────────

function tick_pieris_brassicae(agent: Agent, niche: NicheState, sim: any): void {
  _advanceLifeStage(agent, sim);
  const stage = _stageInfo(agent);
  if (!stage.feeds && !stage.breeds && !stage.movable) {
    if (agent.age_steps >= (SPECIES_SPEC?.["pieris_brassicae"]?.agent_params?.max_age_steps ?? 27)) {
      _killAgent(agent, sim, "old_age");
    }
    return;
  }
  const spec = SPECIES_SPEC?.["pieris_brassicae"]?.agent_params || {};
  agent.energy -= spec.metabolic_cost_per_step ?? 0.4;
  const eatAmt = spec.eat_amount_g ?? 0.08;
  const energyPerG = spec.energy_per_g_food ?? 9;
  const cell = niche.cellAt(agent.cell_idx);
  if (!cell) return;

  // Visit a flower if available, eat nectar; otherwise move toward
  // best flower nectar in range.
  if (cell.substrate === "flower" && (cell.resources.nectar_g ?? 0) >= eatAmt) {
    cell.resources.nectar_g -= eatAmt;
    agent.energy += eatAmt * energyPerG;
  } else {
    const target = _bestNeighborToward(niche, agent.cell_idx,
      (i) => {
        const c = niche.cells[i];
        return c.substrate === "flower" ? (c.resources.nectar_g ?? 0) : -1;
      });
    if (niche.cells[target]?.substrate === "flower"
        || niche.cells[target]?.substrate === "stem"
        || niche.cells[target]?.substrate === "grass_blade") {
      agent.cell_idx = target;
    }
  }

  const breedAt = spec.breed_energy_threshold ?? 9;
  const breedCost = spec.breed_energy_cost ?? 6;
  const cooldown = spec.breed_cooldown_steps ?? 7;
  if (agent.energy >= breedAt && (agent.age_steps - (agent.last_breed_step ?? -cooldown)) >= cooldown) {
    agent.energy -= breedCost;
    agent.last_breed_step = agent.age_steps;
    _spawnChild(sim, agent, sim.step);
  }

  if (agent.energy <= (spec.starvation_threshold ?? 0)) _killAgent(agent, sim, "starvation");
  else if (agent.age_steps >= (spec.max_age_steps ?? 27)) _killAgent(agent, sim, "old_age");
}

// ─── Apis mellifera (European honeybee, pollinator) ─────────────────

function tick_apis_mellifera(agent: Agent, niche: NicheState, sim: any): void {
  _advanceLifeStage(agent, sim);
  const stage = _stageInfo(agent);
  if (!stage.feeds && !stage.breeds && !stage.movable) {
    if (agent.age_steps >= (SPECIES_SPEC?.["apis_mellifera"]?.agent_params?.max_age_steps ?? 28)) {
      _killAgent(agent, sim, "old_age");
    }
    return;
  }
  const spec = SPECIES_SPEC?.["apis_mellifera"]?.agent_params || {};
  agent.energy -= spec.metabolic_cost_per_step ?? 0.35;
  const eatAmt = spec.eat_amount_g ?? 0.05;
  const energyPerG = spec.energy_per_g_food ?? 9;
  const cell = niche.cellAt(agent.cell_idx);
  if (!cell) return;

  if (cell.substrate === "flower" && (cell.resources.nectar_g ?? 0) >= eatAmt) {
    cell.resources.nectar_g -= eatAmt;
    agent.energy += eatAmt * energyPerG;
  } else {
    const target = _bestNeighborToward(niche, agent.cell_idx,
      (i) => {
        const c = niche.cells[i];
        return c.substrate === "flower" ? (c.resources.nectar_g ?? 0) : -1;
      });
    if (niche.cells[target]?.substrate !== "void") agent.cell_idx = target;
  }

  const breedAt = spec.breed_energy_threshold ?? 7;
  const breedCost = spec.breed_energy_cost ?? 5;
  const cooldown = spec.breed_cooldown_steps ?? 6;
  if (agent.energy >= breedAt && (agent.age_steps - (agent.last_breed_step ?? -cooldown)) >= cooldown) {
    agent.energy -= breedCost;
    agent.last_breed_step = agent.age_steps;
    _spawnChild(sim, agent, sim.step);
  }

  if (agent.energy <= (spec.starvation_threshold ?? 0)) _killAgent(agent, sim, "starvation");
  else if (agent.age_steps >= (spec.max_age_steps ?? 28)) _killAgent(agent, sim, "old_age");
}

// ─── Chorthippus brunneus (field grasshopper, herbivore) ────────────

function tick_chorthippus_brunneus(agent: Agent, niche: NicheState, sim: any): void {
  _advanceLifeStage(agent, sim);
  const stage = _stageInfo(agent);
  if (!stage.feeds && !stage.breeds && !stage.movable) {
    if (agent.age_steps >= (SPECIES_SPEC?.["chorthippus_brunneus"]?.agent_params?.max_age_steps ?? 65)) {
      _killAgent(agent, sim, "old_age");
    }
    return;
  }
  const spec = SPECIES_SPEC?.["chorthippus_brunneus"]?.agent_params || {};
  agent.energy -= spec.metabolic_cost_per_step ?? 0.4;
  const eatAmt = spec.eat_amount_g ?? 0.15;
  const energyPerG = spec.energy_per_g_food ?? 7;
  const cell = niche.cellAt(agent.cell_idx);
  if (!cell) return;

  if (cell.substrate === "grass_blade" && (cell.resources.leaf_biomass_g ?? 0) >= eatAmt) {
    cell.resources.leaf_biomass_g -= eatAmt;
    agent.energy += eatAmt * energyPerG;
  } else {
    const target = _bestNeighborToward(niche, agent.cell_idx,
      (i) => {
        const c = niche.cells[i];
        return c.substrate === "grass_blade" ? (c.resources.leaf_biomass_g ?? 0) : -1;
      });
    if (niche.cells[target]?.substrate !== "void") agent.cell_idx = target;
  }

  const breedAt = spec.breed_energy_threshold ?? 13;
  const breedCost = spec.breed_energy_cost ?? 9;
  const cooldown = spec.breed_cooldown_steps ?? 14;
  if (agent.energy >= breedAt && (agent.age_steps - (agent.last_breed_step ?? -cooldown)) >= cooldown) {
    agent.energy -= breedCost;
    agent.last_breed_step = agent.age_steps;
    _spawnChild(sim, agent, sim.step);
  }

  if (agent.energy <= (spec.starvation_threshold ?? 0)) _killAgent(agent, sim, "starvation");
  else if (agent.age_steps >= (spec.max_age_steps ?? 65)) _killAgent(agent, sim, "old_age");
}

// ─── Mantis religiosa (European mantis, ambush predator) ────────────
//
// Ambush, not pursuit. Stays on the perch (with small random
// shifts), eats anything edible in the current cell. Cannibalizes
// conspecifics with low probability (real Mantis females eat males
// in ~30% of mating encounters; modeled as a roll when adult
// conspecifics share a cell). Slow movement so the mantis doesn't
// drift away from a productive perch.

function tick_mantis_religiosa(agent: Agent, niche: NicheState, sim: any): void {
  _advanceLifeStage(agent, sim);
  const stage = _stageInfo(agent);
  if (!stage.feeds && !stage.breeds && !stage.movable) {
    if (agent.age_steps >= (SPECIES_SPEC?.["mantis_religiosa"]?.agent_params?.max_age_steps ?? 95)) {
      _killAgent(agent, sim, "old_age");
    }
    return;
  }
  const spec = SPECIES_SPEC?.["mantis_religiosa"]?.agent_params || {};
  agent.energy -= spec.metabolic_cost_per_step ?? 0.5;
  const maxPreyMm = spec.prey_body_size_max_mm ?? 55;
  const energyPerMg = spec.energy_per_prey_mg ?? 0.5;
  const moveChance = spec.ambush_move_chance ?? 0.15;
  const cannibalismChance = spec.cannibalism_chance_per_breed ?? 0.30;

  // 1. Eat anything edible in current cell (ambush).
  const here = _aliveAgentsAt(sim, agent.cell_idx).filter((a: Agent) => {
    if (a === agent) return false;
    const sz = SPECIES_SPEC?.[a.species]?.body_size_mm ?? 999;
    if (sz > maxPreyMm) return false;
    if (a.species === agent.species) {
      // Sexual cannibalism — modeled as probabilistic kill on co-cell
      // conspecific adult encounters. Mating itself is just the
      // breeding code below.
      return a.life_stage === "adult" && sim.rng.bernoulli(cannibalismChance);
    }
    return true;
  });
  if (here.length > 0) {
    const target = here[0];
    const preyMassMg = (SPECIES_SPEC?.[target.species]?.body_size_mm ?? 5) * 0.5;
    agent.energy += preyMassMg * energyPerMg;
    _killAgent(target, sim, target.species === agent.species ? "cannibalism" : "predation", agent);
  }

  // 2. Occasional ambush-shift: low chance to move to a better perch.
  if (sim.rng.bernoulli(moveChance)) {
    // Score neighbors by prey-density proxy (number of alive non-mantis agents within 2 steps).
    const target = _bestNeighborToward(niche, agent.cell_idx,
      (i) => {
        if (niche.cells[i]?.substrate === "void") return -999;
        if (niche.cells[i]?.substrate === "soil_surface") return -10;
        return _aliveAgentsAt(sim, i).filter((a: Agent) => a.species !== "mantis_religiosa").length;
      });
    if (niche.cells[target]?.substrate !== "void") agent.cell_idx = target;
  }

  // 3. Breed (asexual model — real females need male, but the
  // simplification keeps simulation tractable).
  const breedAt = spec.breed_energy_threshold ?? 26;
  const breedCost = spec.breed_energy_cost ?? 18;
  const cooldown = spec.breed_cooldown_steps ?? 30;
  if (agent.energy >= breedAt && (agent.age_steps - (agent.last_breed_step ?? -cooldown)) >= cooldown) {
    agent.energy -= breedCost;
    agent.last_breed_step = agent.age_steps;
    _spawnChild(sim, agent, sim.step);
  }

  if (agent.energy <= (spec.starvation_threshold ?? 0)) _killAgent(agent, sim, "starvation");
  else if (agent.age_steps >= (spec.max_age_steps ?? 95)) _killAgent(agent, sim, "old_age");
}

AGENT_TICKERS["pieris_brassicae"] = tick_pieris_brassicae;
AGENT_TICKERS["apis_mellifera"] = tick_apis_mellifera;
AGENT_TICKERS["chorthippus_brunneus"] = tick_chorthippus_brunneus;
AGENT_TICKERS["mantis_religiosa"] = tick_mantis_religiosa;

// ─── Ips typographus (European spruce bark beetle) ──────────────────
//
// Eats phloem. Larva tunnels through cells, converting phloem cells
// to gallery cells as it depletes the phloem mass. Adult excavates
// further at the gallery edges. When a parasitoid wasp marks this
// agent (parasitized_by != ""), the agent continues normally until
// host_development_steps elapse, then dies and a wasp emerges.

function tick_ips_typographus(agent: Agent, niche: NicheState, sim: any): void {
  _advanceLifeStage(agent, sim);
  const stage = _stageInfo(agent);

  // Parasitism eruption check — fires regardless of life stage
  // (even eggs can carry a wasp). If parasitized + due, host dies
  // and wasp adult emerges in the cell.
  if (agent.parasitized_by) {
    const parasitoidSpec = SPECIES_SPEC?.[agent.parasitized_by]?.agent_params;
    const devSteps = parasitoidSpec?.host_development_steps ?? 7;
    if (sim.step - agent.parasitized_at_step >= devSteps) {
      // Spawn the parasitoid adult.
      const w = new Agent();
      w.species = agent.parasitized_by;
      w.cell_idx = agent.cell_idx;
      w.life_stage = "adult";
      w.energy = parasitoidSpec?.starting_energy ?? 4;
      w.step_born = sim.step;
      w.alive = true;
      sim.agents.push(w);
      if (sim.events) sim.events.push({
        step: sim.step, kind: "parasitoid_emerged",
        species: agent.parasitized_by, host_species: agent.species,
        cell_idx: agent.cell_idx,
      });
      _killAgent(agent, sim, "parasitism", w);
      return;
    }
  }

  if (!stage.feeds && !stage.breeds && !stage.movable) {
    if (agent.age_steps >= (SPECIES_SPEC?.["ips_typographus"]?.agent_params?.max_age_steps ?? 55)) {
      _killAgent(agent, sim, "old_age");
    }
    return;
  }
  const spec = SPECIES_SPEC?.["ips_typographus"]?.agent_params || {};
  agent.energy -= spec.metabolic_cost_per_step ?? 0.25;
  const eatAmt = spec.eat_amount_g ?? 0.08;
  const energyPerG = spec.energy_per_g_food ?? 8;
  const cell = niche.cellAt(agent.cell_idx);
  if (!cell) return;

  // Eat phloem in current cell; if depleted, convert cell to gallery.
  if ((cell.resources.phloem_g ?? 0) >= eatAmt) {
    cell.resources.phloem_g -= eatAmt;
    agent.energy += eatAmt * energyPerG;
    // When phloem in a cell drops near 0, the cell becomes gallery
    // (the larva has tunneled through it).
    if (cell.resources.phloem_g < 0.05 && cell.substrate === "phloem") {
      cell.substrate = "gallery";
    }
  } else {
    // Move toward a neighbor with more phloem (perpendicular-to-gallery
    // is the typical bark beetle tunneling direction, but the
    // simulator picks by gradient).
    const target = _bestNeighborToward(niche, agent.cell_idx,
      (i) => {
        const c = niche.cells[i];
        if (c.substrate !== "phloem" && c.substrate !== "gallery") return -1;
        return c.resources.phloem_g ?? 0;
      });
    if (niche.cells[target]?.substrate === "phloem"
        || niche.cells[target]?.substrate === "gallery") {
      agent.cell_idx = target;
    }
  }

  // Breed (only adults).
  if (agent.life_stage === "adult") {
    const breedAt = spec.breed_energy_threshold ?? 9;
    const breedCost = spec.breed_energy_cost ?? 5;
    const cooldown = spec.breed_cooldown_steps ?? 8;
    if (agent.energy >= breedAt && (agent.age_steps - (agent.last_breed_step ?? -cooldown)) >= cooldown) {
      agent.energy -= breedCost;
      agent.last_breed_step = agent.age_steps;
      _spawnChild(sim, agent, sim.step);
    }
  }

  if (agent.energy <= (spec.starvation_threshold ?? 0)) _killAgent(agent, sim, "starvation");
  else if (agent.age_steps >= (spec.max_age_steps ?? 55)) _killAgent(agent, sim, "old_age");
}

// ─── Thanasimus formicarius (ant beetle predator) ───────────────────

function tick_thanasimus_formicarius(agent: Agent, niche: NicheState, sim: any): void {
  _advanceLifeStage(agent, sim);
  const stage = _stageInfo(agent);
  if (!stage.feeds && !stage.breeds && !stage.movable) {
    if (agent.age_steps >= (SPECIES_SPEC?.["thanasimus_formicarius"]?.agent_params?.max_age_steps ?? 180)) {
      _killAgent(agent, sim, "old_age");
    }
    return;
  }
  const spec = SPECIES_SPEC?.["thanasimus_formicarius"]?.agent_params || {};
  agent.energy -= spec.metabolic_cost_per_step ?? 0.35;
  const maxPreyMm = spec.prey_body_size_max_mm ?? 8;
  const energyPerMg = spec.energy_per_prey_mg ?? 0.5;
  const perceptionCells = Math.max(1, Math.round((SPECIES_SPEC?.["thanasimus_formicarius"]?.perception_radius_cm ?? 5) / ((niche as any).grid?.cellSizeCm ?? 1)));

  // Hunt Ips (any life stage).
  const candidates = _aliveAgentsNear(sim, niche, agent.cell_idx, perceptionCells)
    .filter((a: Agent) => {
      if (a === agent) return false;
      if (a.species !== "ips_typographus") return false;
      const sz = SPECIES_SPEC?.[a.species]?.body_size_mm ?? 999;
      return sz <= maxPreyMm;
    });
  if (candidates.length > 0) {
    let target = candidates[0];
    let bestDist = Infinity;
    const grid = (niche as any).grid;
    if (grid?.N) {
      for (const c of candidates) {
        const ai = Math.floor(agent.cell_idx / grid.N), aj = agent.cell_idx % grid.N;
        const bi = Math.floor(c.cell_idx / grid.N), bj = c.cell_idx % grid.N;
        const d = Math.abs(ai - bi) + Math.abs(aj - bj);
        if (d < bestDist) { bestDist = d; target = c; }
      }
      if (bestDist > 0) {
        const ai = Math.floor(agent.cell_idx / grid.N), aj = agent.cell_idx % grid.N;
        const bi = Math.floor(target.cell_idx / grid.N), bj = target.cell_idx % grid.N;
        let next = agent.cell_idx;
        if (ai < bi) next = (ai + 1) * grid.N + aj;
        else if (ai > bi) next = (ai - 1) * grid.N + aj;
        else if (aj < bj) next = ai * grid.N + (aj + 1);
        else if (aj > bj) next = ai * grid.N + (aj - 1);
        if (niche.cells[next]?.substrate !== "void") agent.cell_idx = next;
      }
    }
    if (agent.cell_idx === target.cell_idx) {
      const preyMassMg = (SPECIES_SPEC?.[target.species]?.body_size_mm ?? 5) * 0.5;
      agent.energy += preyMassMg * energyPerMg;
      _killAgent(target, sim, "predation", agent);
    }
  }

  const breedAt = spec.breed_energy_threshold ?? 14;
  const breedCost = spec.breed_energy_cost ?? 9;
  const cooldown = spec.breed_cooldown_steps ?? 22;
  if (agent.energy >= breedAt && (agent.age_steps - (agent.last_breed_step ?? -cooldown)) >= cooldown) {
    agent.energy -= breedCost;
    agent.last_breed_step = agent.age_steps;
    _spawnChild(sim, agent, sim.step);
  }

  if (agent.energy <= (spec.starvation_threshold ?? 0)) _killAgent(agent, sim, "starvation");
  else if (agent.age_steps >= (spec.max_age_steps ?? 180)) _killAgent(agent, sim, "old_age");
}

// ─── Coeloides bostrichorum (parasitoid wasp) ───────────────────────
//
// REAL parasitism. The wasp finds an Ips larva (only larvae, not
// adults), marks it parasitized_by="coeloides_bostrichorum", and
// the marked host continues alive for host_development_steps before
// the wasp adult erupts (handled in tick_ips_typographus).
// The wasp doesn't gain energy from the act — energy comes from
// honeydew + nectar (not modeled). Wasp adults live ~30 days.

function tick_coeloides_bostrichorum(agent: Agent, niche: NicheState, sim: any): void {
  _advanceLifeStage(agent, sim);
  const stage = _stageInfo(agent);
  if (!stage.feeds && !stage.breeds && !stage.movable) {
    if (agent.age_steps >= (SPECIES_SPEC?.["coeloides_bostrichorum"]?.agent_params?.max_age_steps ?? 30)) {
      _killAgent(agent, sim, "old_age");
    }
    return;
  }
  const spec = SPECIES_SPEC?.["coeloides_bostrichorum"]?.agent_params || {};
  agent.energy -= spec.metabolic_cost_per_step ?? 0.2;
  const parasitismCells = Math.max(1, Math.round((spec.parasitism_radius_cm ?? 4) / ((niche as any).grid?.cellSizeCm ?? 1)));

  // Find an unparasitized Ips LARVA within range.
  const candidates = _aliveAgentsNear(sim, niche, agent.cell_idx, parasitismCells)
    .filter((a: Agent) => {
      if (a === agent) return false;
      if (a.species !== "ips_typographus") return false;
      if (a.life_stage !== "larva") return false;
      if (a.parasitized_by) return false;
      return true;
    });
  if (candidates.length > 0) {
    // Pick the closest.
    let target = candidates[0];
    let bestDist = Infinity;
    const grid = (niche as any).grid;
    if (grid?.N) {
      for (const c of candidates) {
        const ai = Math.floor(agent.cell_idx / grid.N), aj = agent.cell_idx % grid.N;
        const bi = Math.floor(c.cell_idx / grid.N), bj = c.cell_idx % grid.N;
        const d = Math.abs(ai - bi) + Math.abs(aj - bj);
        if (d < bestDist) { bestDist = d; target = c; }
      }
      // Move toward the target one step.
      if (bestDist > 0) {
        const ai = Math.floor(agent.cell_idx / grid.N), aj = agent.cell_idx % grid.N;
        const bi = Math.floor(target.cell_idx / grid.N), bj = target.cell_idx % grid.N;
        let next = agent.cell_idx;
        if (ai < bi) next = (ai + 1) * grid.N + aj;
        else if (ai > bi) next = (ai - 1) * grid.N + aj;
        else if (aj < bj) next = ai * grid.N + (aj + 1);
        else if (aj > bj) next = ai * grid.N + (aj - 1);
        if (niche.cells[next]?.substrate !== "void") agent.cell_idx = next;
      }
      // If on same cell as a target, parasitize it (no need to consume).
      if (agent.cell_idx === target.cell_idx) {
        target.parasitized_by = "coeloides_bostrichorum";
        target.parasitized_at_step = sim.step;
        if (sim.events) sim.events.push({
          step: sim.step, kind: "parasitized",
          species: agent.species, host_species: target.species,
          cell_idx: agent.cell_idx,
        });
        agent.energy += 1; // small energy reward (oviposition success)
      }
    }
  }

  // Breed — the wasp lays eggs ONLY by parasitizing hosts above, not
  // via the standard _spawnChild path. So no breed call here.

  if (agent.energy <= (spec.starvation_threshold ?? 0)) _killAgent(agent, sim, "starvation");
  else if (agent.age_steps >= (spec.max_age_steps ?? 30)) _killAgent(agent, sim, "old_age");
}

AGENT_TICKERS["ips_typographus"] = tick_ips_typographus;
AGENT_TICKERS["thanasimus_formicarius"] = tick_thanasimus_formicarius;
AGENT_TICKERS["coeloides_bostrichorum"] = tick_coeloides_bostrichorum;

// ─── Culex pipiens (mosquito larva, filter feeder) ──────────────────

function tick_culex_pipiens(agent: Agent, niche: NicheState, sim: any): void {
  _advanceLifeStage(agent, sim);
  const stage = _stageInfo(agent);
  if (!stage.feeds && !stage.breeds && !stage.movable) {
    if (agent.age_steps >= (SPECIES_SPEC?.["culex_pipiens"]?.agent_params?.max_age_steps ?? 12)) {
      _killAgent(agent, sim, "old_age");
    }
    return;
  }
  const spec = SPECIES_SPEC?.["culex_pipiens"]?.agent_params || {};
  agent.energy -= spec.metabolic_cost_per_step ?? 0.2;
  const eatAmt = spec.eat_amount_g ?? 0.04;
  const energyPerG = spec.energy_per_g_food ?? 10;
  const cell = niche.cellAt(agent.cell_idx);
  if (!cell) return;

  if (cell.substrate === "pond_water" && (cell.resources.algal_biomass_g ?? 0) >= eatAmt) {
    cell.resources.algal_biomass_g -= eatAmt;
    agent.energy += eatAmt * energyPerG;
  } else {
    const target = _bestNeighborToward(niche, agent.cell_idx,
      (i) => {
        const c = niche.cells[i];
        return c.substrate === "pond_water" ? (c.resources.algal_biomass_g ?? 0) : -1;
      });
    if (niche.cells[target]?.substrate === "pond_water") agent.cell_idx = target;
  }

  const breedAt = spec.breed_energy_threshold ?? 7;
  const breedCost = spec.breed_energy_cost ?? 4;
  const cooldown = spec.breed_cooldown_steps ?? 5;
  if (agent.energy >= breedAt && (agent.age_steps - (agent.last_breed_step ?? -cooldown)) >= cooldown) {
    agent.energy -= breedCost;
    agent.last_breed_step = agent.age_steps;
    _spawnChild(sim, agent, sim.step);
  }

  if (agent.energy <= (spec.starvation_threshold ?? 0)) _killAgent(agent, sim, "starvation");
  else if (agent.age_steps >= (spec.max_age_steps ?? 12)) _killAgent(agent, sim, "old_age");
}

// ─── Aeshna juncea (dragonfly larva, ambush predator) ───────────────

function tick_aeshna_juncea(agent: Agent, niche: NicheState, sim: any): void {
  _advanceLifeStage(agent, sim);
  const stage = _stageInfo(agent);
  if (!stage.feeds && !stage.breeds && !stage.movable) {
    if (agent.age_steps >= (SPECIES_SPEC?.["aeshna_juncea"]?.agent_params?.max_age_steps ?? 240)) {
      _killAgent(agent, sim, "old_age");
    }
    return;
  }
  const spec = SPECIES_SPEC?.["aeshna_juncea"]?.agent_params || {};
  agent.energy -= spec.metabolic_cost_per_step ?? 0.4;
  const maxPreyMm = spec.prey_body_size_max_mm ?? 20;
  const energyPerMg = spec.energy_per_prey_mg ?? 0.45;
  const eatAmt = spec.eat_amount_g ?? 0.05;
  const energyPerG = spec.energy_per_g_food ?? 9;

  // Eat: prefer agent prey in same cell (mosquito larvae); else
  // sip daphnia_density from current cell.
  const here = _aliveAgentsAt(sim, agent.cell_idx).filter((a: Agent) => {
    if (a === agent) return false;
    if (a.species === agent.species) return false;
    const sz = SPECIES_SPEC?.[a.species]?.body_size_mm ?? 999;
    return sz <= maxPreyMm;
  });
  if (here.length > 0) {
    const target = here[0];
    const preyMassMg = (SPECIES_SPEC?.[target.species]?.body_size_mm ?? 5) * 0.5;
    agent.energy += preyMassMg * energyPerMg;
    _killAgent(target, sim, "predation", agent);
  } else {
    const cell = niche.cellAt(agent.cell_idx);
    if (cell && (cell.resources.daphnia_density ?? 0) >= eatAmt) {
      cell.resources.daphnia_density -= eatAmt;
      agent.energy += eatAmt * energyPerG;
    } else {
      // Occasional ambush-shift toward prey-rich neighbor.
      if (sim.rng.bernoulli(0.2)) {
        const target = _bestNeighborToward(niche, agent.cell_idx,
          (i) => {
            const c = niche.cells[i];
            if (c.substrate === "void") return -999;
            return _aliveAgentsAt(sim, i).filter((a: Agent) => a.species === "culex_pipiens").length
              + (c.resources.daphnia_density ?? 0) * 5;
          });
        if (niche.cells[target]?.substrate !== "void") agent.cell_idx = target;
      }
    }
  }

  const breedAt = spec.breed_energy_threshold ?? 16;
  const breedCost = spec.breed_energy_cost ?? 11;
  const cooldown = spec.breed_cooldown_steps ?? 30;
  if (agent.energy >= breedAt && (agent.age_steps - (agent.last_breed_step ?? -cooldown)) >= cooldown) {
    agent.energy -= breedCost;
    agent.last_breed_step = agent.age_steps;
    _spawnChild(sim, agent, sim.step);
  }

  if (agent.energy <= (spec.starvation_threshold ?? 0)) _killAgent(agent, sim, "starvation");
  else if (agent.age_steps >= (spec.max_age_steps ?? 240)) _killAgent(agent, sim, "old_age");
}

// ─── Dytiscus marginalis (great diving beetle, apex pond predator) ──
//
// Fast-moving aquatic predator. Hunts by BFS within perception
// radius, takes Aeshna larvae + Culex + Daphnia.

function tick_dytiscus_marginalis(agent: Agent, niche: NicheState, sim: any): void {
  _advanceLifeStage(agent, sim);
  const stage = _stageInfo(agent);
  if (!stage.feeds && !stage.breeds && !stage.movable) {
    if (agent.age_steps >= (SPECIES_SPEC?.["dytiscus_marginalis"]?.agent_params?.max_age_steps ?? 180)) {
      _killAgent(agent, sim, "old_age");
    }
    return;
  }
  const spec = SPECIES_SPEC?.["dytiscus_marginalis"]?.agent_params || {};
  agent.energy -= spec.metabolic_cost_per_step ?? 0.45;
  const maxPreyMm = spec.prey_body_size_max_mm ?? 50;
  const energyPerMg = spec.energy_per_prey_mg ?? 0.45;
  const perceptionCells = Math.max(1, Math.round((SPECIES_SPEC?.["dytiscus_marginalis"]?.perception_radius_cm ?? 8) / ((niche as any).grid?.cellSizeCm ?? 1)));

  const candidates = _aliveAgentsNear(sim, niche, agent.cell_idx, perceptionCells)
    .filter((a: Agent) => {
      if (a === agent) return false;
      if (a.species === agent.species) return false;
      const sz = SPECIES_SPEC?.[a.species]?.body_size_mm ?? 999;
      return sz <= maxPreyMm;
    });
  if (candidates.length > 0) {
    let target = candidates[0];
    let bestDist = Infinity;
    const grid = (niche as any).grid;
    if (grid?.N) {
      for (const c of candidates) {
        const ai = Math.floor(agent.cell_idx / grid.N), aj = agent.cell_idx % grid.N;
        const bi = Math.floor(c.cell_idx / grid.N), bj = c.cell_idx % grid.N;
        const d = Math.abs(ai - bi) + Math.abs(aj - bj);
        if (d < bestDist) { bestDist = d; target = c; }
      }
      if (bestDist > 0) {
        const ai = Math.floor(agent.cell_idx / grid.N), aj = agent.cell_idx % grid.N;
        const bi = Math.floor(target.cell_idx / grid.N), bj = target.cell_idx % grid.N;
        let next = agent.cell_idx;
        if (ai < bi) next = (ai + 1) * grid.N + aj;
        else if (ai > bi) next = (ai - 1) * grid.N + aj;
        else if (aj < bj) next = ai * grid.N + (aj + 1);
        else if (aj > bj) next = ai * grid.N + (aj - 1);
        if (niche.cells[next]?.substrate !== "void"
            && niche.cells[next]?.substrate !== "emergent_vegetation") {
          agent.cell_idx = next;
        }
      }
    }
    if (agent.cell_idx === target.cell_idx) {
      const preyMassMg = (SPECIES_SPEC?.[target.species]?.body_size_mm ?? 5) * 0.5;
      agent.energy += preyMassMg * energyPerMg;
      _killAgent(target, sim, "predation", agent);
    }
  }

  const breedAt = spec.breed_energy_threshold ?? 18;
  const breedCost = spec.breed_energy_cost ?? 12;
  const cooldown = spec.breed_cooldown_steps ?? 25;
  if (agent.energy >= breedAt && (agent.age_steps - (agent.last_breed_step ?? -cooldown)) >= cooldown) {
    agent.energy -= breedCost;
    agent.last_breed_step = agent.age_steps;
    _spawnChild(sim, agent, sim.step);
  }

  if (agent.energy <= (spec.starvation_threshold ?? 0)) _killAgent(agent, sim, "starvation");
  else if (agent.age_steps >= (spec.max_age_steps ?? 180)) _killAgent(agent, sim, "old_age");
}

AGENT_TICKERS["culex_pipiens"] = tick_culex_pipiens;
AGENT_TICKERS["aeshna_juncea"] = tick_aeshna_juncea;
AGENT_TICKERS["dytiscus_marginalis"] = tick_dytiscus_marginalis;
