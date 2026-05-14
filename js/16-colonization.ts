// ============================================================
// js/16-colonization.ts — propagule arrival from outside the niche
// ============================================================
// Bug-simulator's analog of vugg's nucleation. New organisms enter
// the niche by dispersal — fungal spores landing on the log surface,
// springtails wandering in from leaf litter, beetles flying in. The
// scenario declares a colonization_pool keyed by species; each
// per-day Bernoulli roll spawns one organism (sessile or motile)
// in a cell with matching substrate.
//
// The `requires` clause (optional) gates arrival on a niche state
// expression — e.g., Ceratophysella waits until fungal_biomass_g
// >= 0.1 g exists somewhere in the niche, because springtails
// follow fungi, not the other way around.
//
// SCRIPT-mode TS.

function _evalRequirement(req: string | undefined, niche: NicheState): boolean {
  if (!req) return true;
  // Minimum-viable parser: "key >= number" or "key > number".
  // Sums the named resource across all cells, compares to the number.
  // Anything more complex can come later.
  const m = /^(\w+)\s*(>=|>|<=|<)\s*([\d.]+)$/.exec(req.trim());
  if (!m) return true;
  const [, key, op, valStr] = m;
  const val = Number(valStr);
  let total = 0;
  for (const cell of niche.cells) {
    total += (cell.resources as any)[key] ?? 0;
  }
  if (op === ">=") return total >= val;
  if (op === ">")  return total > val;
  if (op === "<=") return total <= val;
  if (op === "<")  return total < val;
  return true;
}

function _runColonization(sim: any): void {
  const pool = sim.colonization_pool || {};
  if (!Object.keys(pool).length) return;

  for (const speciesId of Object.keys(pool)) {
    const entry = pool[speciesId];
    if (!entry) continue;
    if (sim.step < (entry.step_first ?? 0)) continue;

    // Cap on total arrivals (the niche has finite recruitment).
    const counter = sim._colonization_counts || (sim._colonization_counts = {});
    if ((counter[speciesId] ?? 0) >= (entry.max_total ?? Infinity)) continue;

    // Gate on a requirement expression if present.
    if (!_evalRequirement(entry.requires, sim.niche)) continue;

    if (!sim.rng.bernoulli(entry.rate_per_day ?? 0.1)) continue;

    // Find a candidate cell of the entry substrate.
    const candidates: number[] = [];
    for (let i = 0; i < sim.niche.cells.length; i++) {
      if (sim.niche.cells[i].substrate === (entry.entry_substrate ?? "")) {
        candidates.push(i);
      }
    }
    if (!candidates.length) continue;
    const cellIdx = candidates[sim.rng.randint(candidates.length)];

    const spec = SPECIES_SPEC?.[speciesId];
    if (!spec) continue;

    if (spec.motile) {
      // Spawn an Agent. Colonizers arrive as adults (they had to be
      // adults to disperse here in the first place).
      const a = new Agent();
      a.species = speciesId;
      a.cell_idx = cellIdx;
      a.life_stage = "adult";
      a.energy = spec.agent_params?.starting_energy ?? 2;
      a.step_born = sim.step;
      a.alive = true;
      sim.agents.push(a);
      if (sim.events) sim.events.push({
        step: sim.step, kind: "colonized", species: speciesId, cell_idx: cellIdx,
      });
    } else {
      // Spawn a SessileOrganism. Don't double-colonize a cell.
      if (sim.niche.cells[cellIdx].sessile_idx >= 0) continue;
      const o = new SessileOrganism();
      o.species = speciesId;
      o.cell_idx = cellIdx;
      o.step_born = sim.step;
      o.size_cm = 0;
      o.vigor = 1;
      sim.sessile.push(o);
      sim.niche.cells[cellIdx].sessile_idx = sim.sessile.length - 1;
      if (sim.events) sim.events.push({
        step: sim.step, kind: "colonized", species: speciesId, cell_idx: cellIdx,
      });
    }

    counter[speciesId] = (counter[speciesId] ?? 0) + 1;
  }
}
