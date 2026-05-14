// tests-js/smoke.test.ts — proves the v0.1.0 scaffold compiles, bundles,
// loads inside jsdom, and exposes the engine classes. No scenarios,
// no species, no behavior — this is the "the lights turn on" check.

import { describe, it, expect } from 'vitest';

declare const BUG_SIM_VERSION: string;
declare const BugSimulator: any;
declare const TrophicGraph: any;
declare const NicheState: any;
declare const Agent: any;
declare const SessileOrganism: any;
declare const ResourceProfile: any;
declare const SeededRandom: any;

describe('bug-simulator v0.1.0 scaffold', () => {
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

  it('constructs BugSimulator with defaults', () => {
    const sim = new BugSimulator();
    expect(sim.step).toBe(0);
    expect(sim.seed).toBe(42);
    expect(sim.agents).toEqual([]);
    expect(sim.sessile).toEqual([]);
    expect(sim.niche).toBeInstanceOf(NicheState);
    expect(sim.trophic).toBeInstanceOf(TrophicGraph);
  });

  it('run_step() advances the clock even with empty catalog', () => {
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
