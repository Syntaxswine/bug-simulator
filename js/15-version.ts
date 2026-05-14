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

const BUG_SIM_VERSION = "v0.5.0";

// History (most recent first):
//
//   v0.5.0 (2026-05-14) — engine richness: two more species + fungal
//                          mycelium spread + display bugfix.
//                          New: Oniscus asellus (common woodlouse,
//                          detritivore, body 16mm, tolerates wider
//                          decay range than Glomeris) and Neobisium
//                          muscorum (moss pseudoscorpion, predator,
//                          body 3mm, hunts springtails specifically —
//                          guild-filtered prey selection). Trametes
//                          now spills 25% of its fungal production
//                          into adjacent cells via hyphal extension
//                          (mycelium_spread_fraction in growth_params),
//                          modeling real bracket-fungus mycelial
//                          foraging — the fungal patches grow
//                          spatially rather than staying point-like.
//                          Bugfix: history.by_species was counting
//                          eggs + adults together, which made the UI
//                          "4 (+2 eggs)" notation ambiguous (looked
//                          like "4 plus 2 = 6" when it was actually
//                          "4 total, 2 of which are eggs"). Now
//                          by_species = adult-equivalent only;
//                          by_species_eggs is a separate dict for
//                          the "(+N eggs)" annotation. Chart includes
//                          new species lines; bark substrate gains
//                          0.3g initial leaf_litter so woodlice have
//                          food at colonization.
//
//   v0.4.0 (2026-05-14) — readability + tooling layer. Adds a
//                          population time-series chart below the
//                          canvas (canvas-2D, one line per species,
//                          y-axis = alive count, x-axis = day with
//                          quarter ticks, current-day vertical marker),
//                          a SPEED slider in the controls panel
//                          (1×/2×/4×/8×/16×/32× days-per-second; the
//                          slider rebuilds the PLAY interval live so
//                          you can speed-up mid-run), and a headless
//                          CLI tool (tools/bug-agent.mjs) that loads
//                          the dist bundle in jsdom and prints a
//                          day-by-day population table — the
//                          bug-simulator analog of vugg's
//                          agent-api/vugg-agent.js. Also one biology
//                          tuning fix: springtails now wait until
//                          fungal_biomass_g >= 0.5 (was 0.1) to
//                          colonize, and centipedes wait until >= 1.0
//                          before arriving — reduces the early
//                          starvation cascade where springtails
//                          colonized empty wood and starved. Seed-42
//                          120-day sweep: 12 Trametes / 13 springtails
//                          / 2 millipedes / 1 centipede / 3 eggs at
//                          end, 169 events recorded.
//
//   v0.3.0 (2026-05-14) — life cycles, tooltips, event log. Each motile
//                          species now has an `egg` stage (7 days for
//                          Ceratophysella, 30 for Glomeris, 40 for
//                          Lithobius) that hatches into an `adult`.
//                          Eggs are static — no movement, no feeding,
//                          no breeding — and render as small translucent
//                          dots with a dotted outline. Colonizers still
//                          arrive as adults (they had to be adult to
//                          disperse), but breeding now lays an egg.
//                          BugSimulator.events records colonization,
//                          hatching, predation, and death events; the
//                          sidebar shows the last 12. Hovering a cell
//                          on the canvas pops a floating tooltip with
//                          substrate / moisture / wood / fungal / decay
//                          values + per-stage agent breakdown. Generic
//                          _advanceLifeStage helper in 12-agent.ts
//                          handles stage transitions cleanly; tickers
//                          early-return when the active stage's
//                          {movable, feeds, breeds} flags are all false.
//                          Seed-42 baseline shifts vs v0.2.0 because
//                          breeding now lays eggs instead of instant
//                          adults — populations rise slower but more
//                          realistically.
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
