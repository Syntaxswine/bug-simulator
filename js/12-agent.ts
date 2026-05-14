// ============================================================
// js/12-agent.ts — Agent class (the motile-bug layer)
// ============================================================
// THE new architectural piece, no vugg analog. An Agent is a motile
// bug — an individual animal that occupies a cell, perceives its
// surroundings, and decides each step what to do (move / eat / breed
// / flee). The trophic graph (js/14-trophic-graph.ts) declares what
// it eats and what eats it.
//
// Per-species behavior plugs into AGENT_TICKERS (registered by later
// files). The default tick is a no-op so an empty catalog still
// produces a valid, run-able simulation.
//
// SCRIPT-mode TS.

type LifeStage = "egg" | "larva" | "pupa" | "adult" | "senescent";

class Agent {
  // Catalog id (key into SPECIES_SPEC).
  species: string = "";

  // Position in the niche. Currently a cell index — the granular
  // motion model (sub-cell positions, vector velocity) can land later
  // if the renderer needs it.
  cell_idx: number = -1;

  // Life stage. Different stages can have different diet, range,
  // predators — the catalog defines per-stage overrides.
  life_stage: LifeStage = "adult";

  // Age in steps (typically days). Drives life-stage transitions and
  // old-age mortality.
  age_steps: number = 0;

  // Energy reserve (joules, kJ, or arbitrary units calibrated per
  // species). Eating credits; idle metabolism debits; starvation
  // kills when energy reaches 0.
  energy: number = 1;

  // Step the agent was created (egg laid or colonization arrival).
  step_born: number = 0;

  // Is the agent alive? Dead agents stay in the array briefly so
  // narrators / renderers can show "X died on day N", then get GC'd.
  alive: boolean = true;

  [key: string]: any;
}

// Per-species per-step tick function. Reads the niche state + agent's
// own state, decides an action, mutates both. Returns nothing — side
// effects only, same pattern as vugg's grow_* engines.
// Signature: (agent, niche, sim) -> void
const AGENT_TICKERS: Record<string, (
  agent: Agent,
  niche: NicheState,
  sim: any,
) => void> = {};

// Default tick: nothing happens. Species without a registered ticker
// just sit. Useful for content stubs and the empty-catalog tests.
function _defaultAgentTick(_agent: Agent, _niche: NicheState, _sim: any): void {
  // intentionally blank
}
