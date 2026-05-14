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
  const candidates = _aliveAgentsNear(sim, niche, agent.cell_idx, perceptionCells)
    .filter((a: Agent) => {
      if (a === agent) return false;
      const sz = SPECIES_SPEC?.[a.species]?.body_size_mm ?? 999;
      if (sz > maxPreyMm) return false;
      // Don't eat conspecifics in v0.2.0. (Real Lithobius will if
      // starving — add later.)
      if (a.species === agent.species) return false;
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

AGENT_TICKERS["ceratophysella_denticulata"] = tick_ceratophysella_denticulata;
AGENT_TICKERS["glomeris_marginata"] = tick_glomeris_marginata;
AGENT_TICKERS["lithobius_forficatus"] = tick_lithobius_forficatus;
