// ============================================================
// js/03-seeded-random.ts — Mulberry32 deterministic PRNG
// ============================================================
// Ported verbatim from vugg-simulator/js/10-seeded-random.ts. Same
// 32-bit-state Mulberry32 implementation; same numerical behavior;
// same seed-stream guarantees.
//
// Deterministic stochasticity is a hard requirement for bug-sim's
// agent layer — every move/eat/breed decision is a PRNG draw, and
// the calibration baselines depend on per-seed reproducibility.
// Don't swap PRNGs without bumping BUG_SIM_VERSION and regenerating
// baselines.
//
// SCRIPT-mode TS.

class SeededRandom {
  state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  next(): number {
    let t = (this.state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  uniform(lo: number, hi: number): number {
    return lo + this.next() * (hi - lo);
  }
  random(): number {
    return this.next();
  }
  // Integer in [0, n). Used by agent decision routines that pick from
  // a list of candidate cells/agents.
  randint(n: number): number {
    return Math.floor(this.next() * n);
  }
  // Bernoulli(p) — true with probability p. Used for stochastic per-step
  // events (predation success, colonization arrivals).
  bernoulli(p: number): boolean {
    return this.next() < p;
  }
}

let rng = new SeededRandom(42);
