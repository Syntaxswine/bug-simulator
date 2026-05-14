// ============================================================
// js/15-version.ts — BUG_SIM_VERSION + per-bump change log
// ============================================================
// Monotonic version tag bumped by any change that could shift seed-42
// output. Mirrors SIM_VERSION (vugg-simulator) and WASTELAND_VERSION
// (wasteland-crystals).
//
// Bump rules:
//   • Any change to RNG draws (new agent decision branch, new sessile
//     growth engine, new colonization roll) -> bump.
//   • Any change to species spec, scenario spec, or substrate
//     defaults -> bump.
//   • Pure renderer / UI / narrator changes -> no bump.
//
// After a bump, regenerate seed-42 baselines (tools/gen-js-baseline.mjs
// once it exists) and inspect the diff. Drift should be intentional.
//
// SCRIPT-mode TS.

const BUG_SIM_VERSION = "v0.1.0";

// History (most recent first):
//
//   v0.1.0 (2026-05-14) — initial scaffold. Empty catalog, empty
//                          scenarios, no engines. Build pipeline +
//                          tsconfig + vitest harness + minimal class
//                          skeletons (Agent, SessileOrganism,
//                          TrophicGraph, NicheState, ResourceProfile,
//                          BugSimulator). Smoke test asserts the
//                          simulator constructs and run_step(0) is
//                          a no-op.
