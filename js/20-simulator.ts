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

  // Notable per-step events (colonization arrivals, predation kills,
  // egg-hatching, deaths). Routine feeding / movement is not logged.
  // Bounded growth — kept in memory in full because it's a narrative
  // resource; the UI shows the last N.
  events: any[] = [];

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
        // Per-archetype geometry key: rotting_log uses log_geometry,
        // phytotelma uses pitcher_geometry, future scenarios extend.
        const geom = this.scenario.log_geometry
          || this.scenario.pitcher_geometry
          || this.scenario.carrion_geometry
          || this.scenario.dung_geometry
          || this.scenario.meadow_geometry
          || this.scenario.bark_geometry
          || this.scenario.pond_geometry
          || this.scenario.tide_pool_geometry
          || this.scenario.geom;
        this.niche = builder({
          geom,
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
    // Phase 1: events. Scenario-declared per-step events fire here.
    // v0.6.0 supports one event kind: prey_capture (used by the
    // Sarracenia phytotelma scenario to model daily insect trapping).
    if (this.scenario?.events) {
      for (const ev of this.scenario.events) {
        const fire = (ev.step_every && this.step % ev.step_every === 0)
                  || (ev.step && ev.step === this.step);
        if (!fire) continue;
        if (ev.kind === "prey_capture") {
          const amt = ev.amount_g ?? 0.1;
          const sub = ev.substrate ?? "pitcher_floor";
          // Pick one matching cell at random and add detritus there.
          const candidates: number[] = [];
          for (let i = 0; i < this.niche.cells.length; i++) {
            if (this.niche.cells[i].substrate === sub) candidates.push(i);
          }
          if (candidates.length > 0) {
            const c = candidates[this.rng.randint(candidates.length)];
            this.niche.cells[c].resources.prey_detritus_g =
              (this.niche.cells[c].resources.prey_detritus_g ?? 0) + amt;
            this.events.push({
              step: this.step, kind: "prey_captured",
              species: "scenario_event", cell_idx: c, amount_g: amt,
            });
          }
        }
        if (ev.kind === "carrion_decay") {
          // Bacterial + abiotic baseline decay of soft_tissue across
          // every soft_tissue cell. Insect consumption happens
          // separately in the agent tickers.
          const rate = ev.rate ?? 0.02;
          for (const cell of this.niche.cells) {
            if (cell.substrate === "void") continue;
            const st = cell.resources.soft_tissue_g ?? 0;
            if (st > 0) {
              const loss = st * rate;
              cell.resources.soft_tissue_g = Math.max(0, st - loss);
              // Slow skin desiccation: skin loses moisture as time
              // passes (skin_g doesn't decrease here, but moisture does).
              cell.resources.moisture = Math.max(0.1, (cell.resources.moisture ?? 0.5) - 0.002);
            }
          }
        }
        if (ev.kind === "tidal_dynamics") {
          // Daily tidal exchange replenishes plankton in tide_water
          // cells; daylight regenerates macroalgae on rock_wall cells
          // (cap at default-substrate initial value).
          const planktonRegen = ev.plankton_regen ?? 0.04;
          const algaeGrowth   = ev.macroalgae_growth ?? 0.02;
          for (const cell of this.niche.cells) {
            if (cell.substrate === "tide_water") {
              cell.resources.plankton_density = Math.min(0.5,
                (cell.resources.plankton_density ?? 0) + planktonRegen);
            }
            if (cell.substrate === "rock_wall") {
              cell.resources.macroalgae_biomass_g = Math.min(0.4,
                (cell.resources.macroalgae_biomass_g ?? 0) + algaeGrowth);
            }
          }
        }
        if (ev.kind === "pond_dynamics") {
          // Daily algal photosynthesis. Capped at the pond_water cell's
          // default initial value so the pond doesn't accumulate
          // unbounded green-soup.
          const algalGrowth = ev.algal_growth ?? 0.02;
          for (const cell of this.niche.cells) {
            if (cell.substrate === "pond_water") {
              cell.resources.algal_biomass_g = Math.min(0.4,
                (cell.resources.algal_biomass_g ?? 0) + algalGrowth);
            }
          }
        }
        if (ev.kind === "meadow_growth") {
          // Plant productivity: flowers regenerate nectar, grass cells
          // regenerate leaf_biomass. Caps at the substrate's default
          // initial value so the meadow doesn't accumulate unbounded
          // resources (otherwise pollinator populations explode).
          const regNectar = ev.regrow_nectar ?? 0.04;
          const regLeaf = ev.regrow_leaf ?? 0.03;
          for (const cell of this.niche.cells) {
            if (cell.substrate === "flower") {
              cell.resources.nectar_g = Math.min(0.3,
                (cell.resources.nectar_g ?? 0) + regNectar);
            }
            if (cell.substrate === "grass_blade") {
              cell.resources.leaf_biomass_g = Math.min(0.8,
                (cell.resources.leaf_biomass_g ?? 0) + regLeaf);
            }
          }
        }
        if (ev.kind === "dung_decay") {
          // Combined microbial + desiccation loss. Plus the fly_larvae
          // population follows a Gaussian-ish bump centered around
          // step 4-6 (fresh-substrate maximum), then decays as the
          // substrate dries.
          const rate = ev.rate ?? 0.06;
          for (const cell of this.niche.cells) {
            if (cell.substrate === "void") continue;
            const d = cell.resources.dung_g ?? 0;
            if (d > 0) {
              cell.resources.dung_g = Math.max(0, d - d * rate);
              cell.resources.moisture = Math.max(0.05,
                (cell.resources.moisture ?? 0.5) - 0.025);
            }
            // Fly larvae density: rise day 1-5, then fall.
            const t = this.step;
            const peak = 5;
            const sigma = 2.5;
            const gauss = Math.exp(-((t - peak) ** 2) / (2 * sigma * sigma));
            // Per-substrate scaling: highest in interior, lower in crust.
            const subScale = cell.substrate === "dung_interior" ? 1.0
              : cell.substrate === "dung_soil_interface" ? 0.6 : 0.0;
            cell.resources.fly_larvae_density = gauss * subScale;
          }
        }
      }
    }
    // Phase 2: microclimate. (v0.2.0: empty)
    // Phase 3: sessile grow.
    // Expose `this` as _currentSimContext so SESSILE_ENGINES (which
    // only receive cell + step) can reach neighbors for mycelium
    // spread. Reset on exit so concurrent sims don't see each other.
    const prevCtx = (globalThis as any)._currentSimContext;
    (globalThis as any)._currentSimContext = this;
    for (const org of this.sessile) {
      if (!org.species || org.vigor <= 0) continue;
      const engine = SESSILE_ENGINES[org.species];
      if (!engine) continue;
      const cell = this.niche.cellAt(org.cell_idx);
      if (!cell) continue;
      const zone = engine(org, cell, this.step);
      if (zone) org.zones.push(zone);
    }
    (globalThis as any)._currentSimContext = prevCtx;
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
    // by_species = adult-equivalent counts only (eggs reported separately
    // so the UI can show "2 adults + 2 eggs" unambiguously). Sessile
    // counts as "adult-equivalent" because senescing colonies have
    // vigor <= 0 and are filtered out above.
    const by_species: Record<string, number> = {};
    const by_species_eggs: Record<string, number> = {};
    for (const a of this.agents) {
      if (!a.alive) continue;
      if (a.life_stage === "egg") {
        by_species_eggs[a.species] = (by_species_eggs[a.species] || 0) + 1;
      } else {
        by_species[a.species] = (by_species[a.species] || 0) + 1;
      }
    }
    for (const o of this.sessile) {
      if (o.vigor <= 0) continue;
      by_species[o.species] = (by_species[o.species] || 0) + 1;
    }
    this.history.push({ step: this.step, n_agents, n_sessile, by_species, by_species_eggs });
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
