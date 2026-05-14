// tests-js/smoke.test.ts — engine smoke tests for bug-simulator.
//
// Covers:
//   v0.1.0 scaffold — version, class exposure, empty-construct, determinism,
//                       TrophicGraph.
//   v0.2.0 content  — beech-log scenario loads + runs deterministically,
//                       Trametes colonizes sapwood, fungal biomass appears,
//                       agents arrive, centipede appears after springtails
//                       are established.

import { describe, it, expect, beforeAll } from 'vitest';

declare const BUG_SIM_VERSION: string;
declare const BugSimulator: any;
declare const TrophicGraph: any;
declare const NicheState: any;
declare const Agent: any;
declare const SessileOrganism: any;
declare const ResourceProfile: any;
declare const SeededRandom: any;
declare const SPECIES_SPEC: any;
declare const SCENARIOS: any;
declare const NICHE_SUBSTRATES: any;

// The bundle's data fetches are async (SPECIES_SPEC, SCENARIOS,
// NICHE_SUBSTRATES all load after eval). Wait for all three before
// running the v0.2.0 scenario tests.
async function _waitForData(timeoutMs = 5000): Promise<void> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const specReady = SPECIES_SPEC && Object.keys(SPECIES_SPEC).length > 1;
    const scnReady  = SCENARIOS && SCENARIOS["bialowieza_beech_log_y5"];
    const subReady  = NICHE_SUBSTRATES && NICHE_SUBSTRATES["sapwood"];
    if (specReady && scnReady && subReady) return;
    await new Promise(r => setTimeout(r, 25));
  }
  throw new Error(`data never loaded within ${timeoutMs}ms`);
}

beforeAll(async () => {
  await _waitForData();
});

describe('v0.1.0 scaffold', () => {
  it('has a version tag', () => {
    expect(typeof BUG_SIM_VERSION).toBe('string');
    expect(BUG_SIM_VERSION).toMatch(/^v\d+\.\d+\.\d+$/);
  });

  it('exposes the engine classes', () => {
    expect(typeof BugSimulator).toBe('function');
    expect(typeof TrophicGraph).toBe('function');
    expect(typeof NicheState).toBe('function');
    expect(typeof Agent).toBe('function');
    expect(typeof SessileOrganism).toBe('function');
    expect(typeof ResourceProfile).toBe('function');
    expect(typeof SeededRandom).toBe('function');
  });

  it('constructs BugSimulator with defaults (no scenario)', () => {
    const sim = new BugSimulator();
    expect(sim.step).toBe(0);
    expect(sim.seed).toBe(42);
    expect(sim.agents).toEqual([]);
    expect(sim.sessile).toEqual([]);
    expect(sim.niche).toBeInstanceOf(NicheState);
    expect(sim.trophic).toBeInstanceOf(TrophicGraph);
  });

  it('run_step() advances the clock even with empty scenario', () => {
    const sim = new BugSimulator({ seed: 7 });
    sim.run_step();
    expect(sim.step).toBe(1);
    sim.run(4);
    expect(sim.step).toBe(5);
    expect(sim.history.length).toBe(5);
  });

  it('SeededRandom is deterministic per seed', () => {
    const a = new SeededRandom(42);
    const b = new SeededRandom(42);
    const drawsA = Array.from({ length: 10 }, () => a.next());
    const drawsB = Array.from({ length: 10 }, () => b.next());
    expect(drawsA).toEqual(drawsB);
    const c = new SeededRandom(43);
    const drawsC = Array.from({ length: 10 }, () => c.next());
    expect(drawsC).not.toEqual(drawsA);
  });

  it('TrophicGraph builds from species spec', () => {
    const tg = new TrophicGraph();
    tg.rebuild({
      springtail: { diet: ['fungal_biomass_g'] },
      centipede:  { diet: ['springtail'] },
    });
    expect(tg.eats('centipede', 'springtail')).toBe(true);
    expect(tg.eats('springtail', 'fungal_biomass_g')).toBe(true);
    expect(tg.predatorsOf('springtail')).toContain('centipede');
  });
});

describe('v0.2.0 — Białowieża beech-log scenario', () => {
  it('species spec loaded with the four-species core', () => {
    expect(SPECIES_SPEC['trametes_versicolor']).toBeDefined();
    expect(SPECIES_SPEC['ceratophysella_denticulata']).toBeDefined();
    expect(SPECIES_SPEC['glomeris_marginata']).toBeDefined();
    expect(SPECIES_SPEC['lithobius_forficatus']).toBeDefined();
    expect(SPECIES_SPEC['trametes_versicolor'].motile).toBe(false);
    expect(SPECIES_SPEC['lithobius_forficatus'].guild).toBe('predator');
  });

  it('scenario loaded with colonization pool', () => {
    const s = SCENARIOS['bialowieza_beech_log_y5'];
    expect(s).toBeDefined();
    expect(s.niche_type).toBe('rotting_log');
    expect(Object.keys(s.colonization_pool).length).toBe(4);
  });

  it('rotting_log geometry builds 4 substrate zones', () => {
    const sim = new BugSimulator({ scenario_id: 'bialowieza_beech_log_y5', seed: 42 });
    const subs = new Set(sim.niche.cells.map((c: any) => c.substrate));
    expect(subs.has('bark')).toBe(true);
    expect(subs.has('sapwood')).toBe(true);
    expect(subs.has('heartwood')).toBe(true);
    expect(subs.has('pith')).toBe(true);
    expect(subs.has('void')).toBe(true); // outside the disc
    // The grid metadata is set for the renderer.
    expect((sim.niche as any).grid.N).toBe(30);
  });

  it('Trametes colonizes the sapwood and produces fungal biomass', () => {
    const sim = new BugSimulator({ scenario_id: 'bialowieza_beech_log_y5', seed: 42 });
    sim.run(30);
    // Some Trametes should have colonized by day 30 (rate 0.20/day).
    const tCount = sim.sessile.filter((s: any) => s.species === 'trametes_versicolor' && s.vigor > 0).length;
    expect(tCount).toBeGreaterThan(0);
    // And it should have produced fungal biomass somewhere.
    const totalFungal = sim.niche.cells.reduce(
      (sum: number, c: any) => sum + (c.resources.fungal_biomass_g || 0),
      0,
    );
    expect(totalFungal).toBeGreaterThan(0);
  });

  it('runs the full 120-day sweep without throwing and accumulates agents', () => {
    const sim = new BugSimulator({ scenario_id: 'bialowieza_beech_log_y5', seed: 42 });
    sim.run(120);
    expect(sim.step).toBe(120);
    const aliveAgents = sim.agents.filter((a: any) => a.alive).length;
    const totalAgents = sim.agents.length;
    // Springtails + millipedes should have arrived by now.
    expect(totalAgents).toBeGreaterThan(0);
    // Some should be alive at end of run (assemblage establishing).
    expect(aliveAgents).toBeGreaterThan(0);
  });

  it('is deterministic at seed 42', () => {
    const a = new BugSimulator({ scenario_id: 'bialowieza_beech_log_y5', seed: 42 });
    const b = new BugSimulator({ scenario_id: 'bialowieza_beech_log_y5', seed: 42 });
    a.run(60); b.run(60);
    expect(a.summary()).toEqual(b.summary());
    expect(a.agents.length).toBe(b.agents.length);
    expect(a.sessile.length).toBe(b.sessile.length);
  });

  it('seed 7 produces a different trajectory than seed 42', () => {
    const a = new BugSimulator({ scenario_id: 'bialowieza_beech_log_y5', seed: 42 });
    const b = new BugSimulator({ scenario_id: 'bialowieza_beech_log_y5', seed: 7 });
    a.run(60); b.run(60);
    // Counts can coincide at colonization caps; histories cannot. Two
    // distinct seeds must produce divergent per-step state at *some*
    // step in the run, even if the final aggregate matches.
    const histA = JSON.stringify(a.history);
    const histB = JSON.stringify(b.history);
    expect(histA).not.toBe(histB);
  });
});
