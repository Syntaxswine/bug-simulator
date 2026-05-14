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

// ─── Life-cycle helpers ──────────────────────────────────────────────
//
// life_stages spec on a species declares { stage: { duration_steps,
// movable, feeds, breeds } }. _stageInfo reads the active stage; the
// `stage_age` counter on the agent tracks steps spent in the current
// stage. _advanceLifeStage promotes the agent to the next stage when
// its stage_age reaches the configured duration. Per-species tickers
// call _advanceLifeStage at the top of the tick and then read
// .feeds / .movable / .breeds from _stageInfo to decide which behaviors
// to run.

const LIFE_STAGE_ORDER: LifeStage[] = ["egg", "larva", "pupa", "adult", "senescent"];

function _stageInfo(agent: Agent): any {
  const stages = SPECIES_SPEC?.[agent.species]?.life_stages || {};
  return stages[agent.life_stage] || {
    duration_steps: 9999, movable: true, feeds: true, breeds: true,
  };
}

function _advanceLifeStage(agent: Agent, sim: any): void {
  agent.stage_age = (agent.stage_age ?? 0) + 1;
  const info = _stageInfo(agent);
  if (agent.stage_age < (info.duration_steps ?? 9999)) return;
  // Promote to next defined stage. Skip stages with no spec.
  const stages = SPECIES_SPEC?.[agent.species]?.life_stages || {};
  const cur = LIFE_STAGE_ORDER.indexOf(agent.life_stage);
  for (let i = cur + 1; i < LIFE_STAGE_ORDER.length; i++) {
    const next = LIFE_STAGE_ORDER[i];
    if (stages[next]) {
      const prev = agent.life_stage;
      agent.life_stage = next;
      agent.stage_age = 0;
      if (sim?.events) {
        sim.events.push({
          step: sim.step,
          kind: prev === "egg" ? "hatched" : "matured",
          species: agent.species,
          cell_idx: agent.cell_idx,
          stage_from: prev,
          stage_to: next,
        });
      }
      return;
    }
  }
  // No further stage defined — senescence. Tickers treat this as
  // dying-of-old-age territory.
  agent.life_stage = "senescent";
  agent.stage_age = 0;
}
