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

const BUG_SIM_VERSION = "v0.12.0";

// History (most recent first):
//
//   v0.12.0 (2026-05-14) — sixth scenario (bark beetle gallery) +
//                          real parasitism mechanic. Ips typographus
//                          (European spruce bark beetle) — the
//                          species currently driving the largest
//                          European boreal forest dieback — runs
//                          its three-stage life cycle (egg → larva
//                          → adult) inside a horizontal-cross-section
//                          of spruce bark with a pre-built maternal
//                          gallery. Larvae tunnel through phloem cells,
//                          converting them to gallery as they
//                          deplete. New species: Thanasimus formicarius
//                          (red-and-black ant beetle, the principal
//                          European predator, eavesdrops on Ips
//                          aggregation pheromone — modeled as
//                          standard predation); Coeloides bostrichorum
//                          (braconid parasitoid wasp); Ophiostoma
//                          bicolor (the blue-stain mutualist fungus,
//                          sessile, tints phloem cells visible blue
//                          as it spreads). New parasitism mechanic:
//                          parasitized_by + parasitized_at_step
//                          fields on Agent. When Coeloides finds an
//                          Ips larva it stamps the host; host
//                          continues alive for host_development_steps
//                          (7 days at 18°C); then host dies and a
//                          new Coeloides adult spawns in the cell.
//                          Visually, parasitized agents render with
//                          a small red overlay dot — distinguishing
//                          hosts marked for death from healthy agents.
//                          Renderer also tints phloem cells blue as
//                          blue_stain rises (Ophiostoma's diagnostic
//                          signature). Six scenarios, 22 species,
//                          new event kinds parasitized + parasitoid_emerged.
//
//   v0.11.0 (2026-05-14) — fifth scenario + polish. A Tuscan meadow
//                          patch in July: Mantis religiosa as apex
//                          ambush predator (perches on a stem,
//                          eats any in-cell prey within strike range,
//                          30% chance of sexual cannibalism per
//                          mating encounter per Lelito & Brown 2006),
//                          Pieris brassicae (large white butterfly,
//                          pollinator + classic mantis prey), Apis
//                          mellifera (honeybee, faster pollinator),
//                          Chorthippus brunneus (field grasshopper,
//                          herbivore + prey). A new meadow_patch
//                          niche geometry: vertical column with
//                          flower / stem / grass_blade / soil_surface
//                          bands; new meadow_growth event regenerates
//                          nectar + leaf biomass daily. Polish: each
//                          scenario gets a one-paragraph preamble
//                          shown above the chart when running; event
//                          log adds a cannibalism caption when a
//                          mantis (or starving Lithobius) eats a
//                          conspecific. Cross-scenario species count
//                          unchanged (Beauveria still the only one);
//                          motile-species count rises to 14, sessile
//                          to 4, total 18.
//
//   v0.10.0 (2026-05-14) — Beauveria bassiana, the white muscardine
//                          fungus. First cross-scenario species: an
//                          entomopathogenic fungus that grows from
//                          bug corpses across the rotting log,
//                          carrion, and dung scenarios (and would
//                          work in any future scenario where motile
//                          agents die). New `bug_corpse_g` field on
//                          ResourceProfile: when _killAgent fires it
//                          deposits the agent's body mass on the
//                          death cell (15% retained for predation
//                          deaths, 100% for natural / starvation
//                          deaths — the predator ate most of the
//                          body). Beauveria nucleates where corpse
//                          mass crosses 0.005g and consumes it,
//                          producing fungal_biomass. Cordycipitaceae;
//                          host range covers nearly every terrestrial
//                          arthropod order (Boucias & Pendland 1998).
//                          First fungal species since Trametes;
//                          first species to appear in three
//                          scenarios simultaneously.
//
//   v0.9.0 (2026-05-14) — fourth scenario: dung-pile succession.
//                          European pasture cow pat, 18cm diameter,
//                          30-day duration. Three species: Aphodius
//                          rufipes (surface-dwelling coprophage),
//                          Geotrupes stercorarius (large tunneling
//                          coprophage), and Saprinus semistriatus
//                          (predator on dung-fly larvae). The
//                          fly_larvae_density field on ResourceProfile
//                          is a subliminal prey pool — peaks day 4-6
//                          (Gaussian bump set by the new dung_decay
//                          event) and depletes as Saprinus feeds.
//                          Dung_decay event removes 6%/day of remaining
//                          dung_g; substrate dries faster than carrion
//                          (the scenario plays out in 14-30 days, not
//                          90). Hanski & Cambefort 1991 + Lumaret 1990
//                          are the spine. Three new species' narrators
//                          + chart species order extended. CLI's
//                          SPECIES_SHORT updated to cover all 16
//                          species across all four scenarios.
//
//   v0.8.0 (2026-05-14) — third scenario: carrion succession +
//                          predator cannibalism bugfix. A 1.5kg
//                          small-mammal carcass at temperate-woodland
//                          summer temperatures decomposes over 90
//                          days while three successive insect waves
//                          inhabit it: Calliphora vicina (fresh-stage
//                          blowfly larvae, day 1-15), Necrodes
//                          littoralis (active-decay carrion beetle
//                          that eats both soft tissue and Calliphora
//                          larvae, day 5-25), Dermestes lardarius
//                          (advanced-decay keratinophage, day 20+).
//                          Carrion niche geometry is a top-down
//                          ellipse with skin / soft_tissue band
//                          structure; renderer transitions cell
//                          colors from pink soft_tissue → leathery
//                          skin → bone as the cell's resources
//                          deplete. New event kind "carrion_decay"
//                          mineralizes soft_tissue at 2%/day baseline
//                          (Goff 2009, Byrd & Castner 2009).
//                          Plus a real bugfix for the v0.5.0
//                          predator extinction issue: Lithobius now
//                          eats smaller (non-adult) conspecifics
//                          when starving (energy < 40% of starting),
//                          modeling real centipede cannibalism. Adult
//                          conspecifics are still off-limits.
//
//   v0.7.0 (2026-05-14) — narrators. Per-species naturalist
//                          field-guide prose for all 10 species,
//                          following the voice + discipline rules
//                          ported from wasteland-crystals (see
//                          proposals/HANDOFF-VOICE-AND-DISCIPLINE.md
//                          for the tonal-shift notes — wasteland is
//                          clinical-Borges cyberpunk, bug-sim is
//                          naturalist-observational Edwardian-notebook).
//                          New js/50-narrators.ts with NARRATORS
//                          dispatch dict + 10 narrator functions.
//                          UI: clicking a species in the sidebar
//                          panel opens a modal showing common name,
//                          Latin binomial, guild + body size, the
//                          narrator prose, and citations. Closes
//                          on backdrop click or Esc. No engine
//                          changes; seed-42 trajectories unchanged.
//
//   v0.6.0 (2026-05-14) — second scenario. Pitcher-plant phytotelma
//                          (Sarracenia purpurea, Cedar Bog ON) joins
//                          the beech-log scenario, switchable via a
//                          new scenario-picker dropdown in the UI.
//                          New niche archetype "phytotelma" with a
//                          vertical-cone geometry builder (taller-
//                          than-wide grid, water column at the base,
//                          waxy walls, lip at top). Four new species:
//                          Sarracenia purpurea (host plant, sessile),
//                          Habrotrocha rosa (rotifer, sessile filter
//                          feeder), Metriocnemus knabi (chironomid
//                          midge larva, detritivore, fragments prey
//                          detritus into bacterial biomass — actual
//                          ecosystem service in Kitching 2000),
//                          Wyeomyia smithii (mosquito larva, filter
//                          feeder on bacterial biomass). New event
//                          kind prey_capture lets scenarios add
//                          daily prey detritus at a target substrate
//                          (Sarracenia traps ~0.15g/day at Cedar Bog
//                          per Bradshaw & Holzapfel 1989). Renderer
//                          handles non-square grids; pixelToCellIdx
//                          handles them too. Architectural proof: the
//                          engine generalizes beyond one niche type.
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
