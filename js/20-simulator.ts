// ============================================================
// js/20-simulator.ts — BugSimulator (orchestration)
// ============================================================
// The main simulator class. Owns the niche state, the agent registry,
// the sessile-organism registry, and the trophic graph. Each call to
// run_step advances simulation time by one tick:
//
//   1. Apply scenario events scheduled for this step (rain pulse,
//      frost, parasitoid wave, etc.)
//   2. Update microclimate (temperature, moisture) based on ambient
//      + decomposition heat.
//   3. Sessile-grow phase: for each sessile organism, call its
//      registered growth engine.
//   4. Agent-tick phase: for each motile agent, call its registered
//      ticker (perceive, decide, act).
//   5. Colonization phase: roll for new arrivals from the scenario's
//      colonization_pool.
//   6. Mortality + life-stage transitions: starvation, predation
//      already happened in step 4; this phase handles old-age death
//      and stage transitions (egg -> larva -> pupa -> adult).
//   7. Bookkeeping: GC dead agents, update population counts,
//      append step summary.
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

  // Per-step summary records for the narrator + renderer.
  history: any[] = [];

  constructor(opts: BugSimulatorOpts = {}) {
    this.scenario_id = opts.scenario_id ?? "";
    this.seed = opts.seed ?? 42;
    this.step_size_days = opts.step_size_days ?? 1;

    rng = new SeededRandom(this.seed | 0);

    this.niche = new NicheState();
    const builder = NICHE_BUILDERS[this.scenario_id] ?? null;
    if (builder) {
      this.niche = builder({});
    }

    this.trophic = new TrophicGraph();
    this.trophic.rebuild(SPECIES_SPEC);
  }

  run_step(): void {
    this.step += 1;
    // Phase 1: events. v1 has no event registry yet.
    // Phase 2: microclimate. v1 leaves resources untouched.
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
    for (const agent of this.agents) {
      if (!agent.alive) continue;
      agent.age_steps += 1;
      const tick = AGENT_TICKERS[agent.species] ?? _defaultAgentTick;
      tick(agent, this.niche, this);
    }
    // Phase 5: colonization. v1 has no pool defined.
    // Phase 6: mortality + life-stage. v1 has no per-species rules.
    // Phase 7: bookkeeping.
    this.history.push({
      step: this.step,
      n_agents: this.agents.filter(a => a.alive).length,
      n_sessile: this.sessile.filter(s => s.vigor > 0).length,
    });
  }

  // Run N steps in one call. Convenience for tests + headless harnesses.
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
