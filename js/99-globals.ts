// ============================================================
// js/99-globals.ts — window-scope exposure for browser DevTools
// ============================================================
// In SCRIPT-mode (non-module) TypeScript compiled with target ES2022,
// top-level `let` / `const` / `class` declarations live in the
// implicit script scope but do NOT become properties of the global
// object. That's fine *inside* the bundle (every later module sees
// every earlier module's names by bare reference), but it breaks two
// external use cases:
//
//   1. Users opening DevTools and trying `window.BugSimulator` —
//      they get `undefined`.
//   2. The Claude-Preview verification harness using preview_eval to
//      inspect engine state from outside the bundle.
//
// This file loads last (prefix 99) and bridges the names we want to
// expose. It does not change runtime behavior of the engine — only
// adds aliases.

(function _exposeGlobals() {
  const g = globalThis as any;
  // Engine version + data
  g.BUG_SIM_VERSION = BUG_SIM_VERSION;
  g.SPECIES_SPEC = SPECIES_SPEC;
  g.SCENARIOS = SCENARIOS;
  g.NICHE_SUBSTRATES = NICHE_SUBSTRATES;
  // Class constructors + dispatch registries
  g.BugSimulator = BugSimulator;
  g.SeededRandom = SeededRandom;
  g.NicheState = NicheState;
  g.NicheCell = NicheCell;
  g.SessileOrganism = SessileOrganism;
  g.GrowthZone = GrowthZone;
  g.Agent = Agent;
  g.TrophicGraph = TrophicGraph;
  g.ResourceProfile = ResourceProfile;
  g.NICHE_BUILDERS = NICHE_BUILDERS;
  g.SESSILE_ENGINES = SESSILE_ENGINES;
  g.AGENT_TICKERS = AGENT_TICKERS;
  // Renderer
  g.renderNiche2D = renderNiche2D;
})();
