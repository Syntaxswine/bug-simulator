// ============================================================
// js/20-simulator.ts — BugSimulator (orchestration)
// ============================================================
// The main simulator class. Owns the niche state, the agent + sessile
// registries, the trophic graph, and the scenario's colonization pool.
// Each call to run_step advances simulation time by one tick:
//
//   1. Apply scenario events scheduled for this step (rain pulse,
//      frost, parasitoid wave). v0.2.0 has no events yet.
//   2. Update microclimate. v0.2.0 leaves resources untouched between
//      steps; the chemistry-and-microclimate phase lands later.
//   3. Sessile-grow phase: for each sessile organism, call its
//      registered growth engine.
//   4. Agent-tick phase: for each motile agent, call its registered
//      ticker (perceive, decide, act).
//   5. Colonization phase: roll for new arrivals from the scenario's
//      colonization_pool.
//   6. Mortality + life-stage transitions: agent ticks already kill
//      starved / predated agents; this phase reserved for old-age
//      and stage-transition logic that needs to happen after the
//      tick loop.
//   7. Bookkeeping: append step summary, recompute population counts.
//
// SCRIPT-mode TS.

interface BugSimulatorOpts {
  scenario_id?: string;
  seed?: number;
  step_size_days?: number;
}

class BugSimulator {
  scenario_id: string;
  seed: number;
  step_size_days: number;
  step: number = 0;

  niche: NicheState;
  agents: Agent[] = [];
  sessile: SessileOrganism[] = [];
  trophic: TrophicGraph;

  scenario: any = null;
  colonization_pool: any = {};
  duration_steps: number = 0;

  // Per-sim PRNG. Each simulation owns its own SeededRandom so that
  // back-to-back constructions are isolated — global `rng` is shared
  // across all sims and would otherwise leak state between runs.
  // Agent tickers + colonization read sim.rng explicitly (passed via
  // the `sim` argument), not the global.
  rng: SeededRandom;

  // Per-step summary records for the narrator + renderer.
  history: any[] = [];

  constructor(opts: BugSimulatorOpts = {}) {
    this.scenario_id = opts.scenario_id ?? "";
    this.seed = opts.seed ?? 42;
    this.step_size_days = opts.step_size_days ?? 1;

    this.rng = new SeededRandom(this.seed | 0);
    // Keep the legacy global in sync so any code path that still uses
    // it (none in v0.2.0, but a safety net for ports) gets the same
    // initial state. The global will drift if other sims run; the
    // sim's own `rng` field is authoritative.
    rng = this.rng;

    // Resolve scenario (if any) and build the niche from its archetype.
    this.scenario = SCENARIOS?.[this.scenario_id] ?? null;
    this.niche = new NicheState();
    if (this.scenario) {
      const archetype = this.scenario.niche_type;
      const builder = NICHE_BUILDERS[archetype];
      if (builder) {
        this.niche = builder({
          geom: this.scenario.log_geometry || this.scenario.geom,
          initial: this.scenario.initial_resources,
        });
      }
      this.colonization_pool = this.scenario.colonization_pool || {};
      this.duration_steps = this.scenario.duration_steps ?? 0;
      this.step_size_days = this.scenario.step_size_days ?? this.step_size_days;
    } else {
      // No scenario — keep the legacy path so an empty BugSimulator()
      // still constructs (tests rely on this).
      const builder = NICHE_BUILDERS[this.scenario_id];
      if (builder) this.niche = builder({});
    }

    this.trophic = new TrophicGraph();
    this.trophic.rebuild(SPECIES_SPEC);
  }

  run_step(): void {
    this.step += 1;
    // Phase 1: events. (v0.2.0: empty)
    // Phase 2: microclimate. (v0.2.0: empty)
    // Phase 3: sessile grow.
    for (const org of this.sessile) {
      if (!org.species || org.vigor <= 0) continue;
      const engine = SESSILE_ENGINES[org.species];
      if (!engine) continue;
      const cell = this.niche.cellAt(org.cell_idx);
      if (!cell) continue;
      const zone = engine(org, cell, this.step);
      if (zone) org.zones.push(zone);
    }
    // Phase 4: agent tick.
    // Iterate over a snapshot of the current array — new agents spawned
    // by breeding this step shouldn't also tick this step (they'll tick
    // next step naturally as part of the now-longer array).
    const snapshot = this.agents.slice();
    for (const agent of snapshot) {
      if (!agent.alive) continue;
      agent.age_steps += 1;
      const tick = AGENT_TICKERS[agent.species] ?? _defaultAgentTick;
      tick(agent, this.niche, this);
    }
    // Phase 5: colonization.
    _runColonization(this);
    // Phase 6: mortality + life-stage. (v0.2.0: handled in tick)
    // Phase 7: bookkeeping.
    const n_agents = this.agents.filter(a => a.alive).length;
    const n_sessile = this.sessile.filter(s => s.vigor > 0).length;
    const by_species: Record<string, number> = {};
    for (const a of this.agents) {
      if (!a.alive) continue;
      by_species[a.species] = (by_species[a.species] || 0) + 1;
    }
    for (const o of this.sessile) {
      if (o.vigor <= 0) continue;
      by_species[o.species] = (by_species[o.species] || 0) + 1;
    }
    this.history.push({ step: this.step, n_agents, n_sessile, by_species });
  }

  run(n: number): void {
    for (let i = 0; i < n; i++) this.run_step();
  }

  summary(): any {
    return {
      version: BUG_SIM_VERSION,
      scenario: this.scenario_id,
      seed: this.seed,
      step: this.step,
      n_agents: this.agents.filter(a => a.alive).length,
      n_sessile: this.sessile.filter(s => s.vigor > 0).length,
    };
  }
}
