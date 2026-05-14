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
// SCRIPT-mode TS.

const BUG_SIM_VERSION = "v0.2.0";

// History (most recent first):
//
//   v0.2.0 (2026-05-14) — first content. The Białowieża beech-log
//                          year-5 scenario lands with four species
//                          (Trametes versicolor + Glomeris marginata
//                          + Ceratophysella denticulata + Lithobius
//                          forficatus), the rotting_log geometry
//                          builder, one sessile growth engine, three
//                          agent tickers, the colonization phase
//                          wired into the simulator's run_step, and
//                          a minimal canvas-2D renderer with HTML
//                          step / play controls. Engine seams from
//                          v0.1.0 become load-bearing for the first
//                          time. Seed-42 a 90-day sweep produces a
//                          deterministic small assemblage (Trametes
//                          establishes by day ~10, springtails arrive
//                          once fungal_biomass crosses threshold,
//                          centipedes follow with a lag, millipedes
//                          steady on bark/litter).
//
//   v0.1.0 (2026-05-14) — initial scaffold. Empty catalog, empty
//                          scenarios, no engines. Build pipeline +
//                          tsconfig + vitest harness + minimal class
//                          skeletons (Agent, SessileOrganism,
//                          TrophicGraph, NicheState, ResourceProfile,
//                          BugSimulator). Smoke test asserts the
//                          simulator constructs and run_step(0) is
//                          a no-op.
