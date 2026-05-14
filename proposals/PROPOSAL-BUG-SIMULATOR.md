# PROPOSAL — Bug Simulator

**Audience:** the AI agent (probably a future Claude session) who will start
the new repo. You probably haven't seen vugg-simulator or wasteland-crystals
before. This document tells you the concept, what to crib, what to invent,
and the order to read things in.

**Author:** Claude, drafting for the boss (StonePhilosopher) who is starting
a new project derived from vugg-simulator. **Date:** 2026-05-14.

**Working title:** *Bug Simulator*. Aesthetic register: **naturalist
field-guide grounded in real entomology and community ecology**. The
specific aesthetic discussion lives further down.

---

## TL;DR

A vugg-simulator sibling. Same engine philosophy — *chemistry-true substrate
chemistry, sessile organisms nucleate and grow on it, the assemblage emerges
from physics, the player learns by watching* — but with two important
substantive changes:

1. **The "crystals" become plants/fungi/lichens** — sessile organisms.
   Mosses, fungi, biofilms, algae, sessile larvae. These nucleate in place
   and grow with vugg-like mechanics. Habit vocabulary ports cleanly
   (crustose, foliose, fruticose lichens are botryoidal / tabular /
   acicular in lichen-speak; fungal mycelia + fruiting bodies are
   directly modeled by zone+habit; mosses are crusts).

2. **A new layer of motile agents — the bugs.** Bugs have **position,
   range, diet, and a predator-prey graph**. They are NOT crystals. They
   move, eat, get eaten, breed, die. This is the architectural addition
   over vugg/wasteland. The bug layer interacts with the sessile-substrate
   layer (eating fungi, sheltering in moss) and with itself (a centipede
   eats a springtail; a parasitoid wasp eats a beetle larva from inside).

The vugg becomes **a niche** — a bounded microhabitat at insect scale. A
rotting log. A leaf-litter pocket. A pitcher plant. A dung pile. A vertebrate
carcass. A tree hole. A soil profile. Each niche is real, studied, has a
documented community structure in the entomology / community-ecology
literature, and decays through known successional stages.

The "fluid chemistry" generalizes to **resource profile**: moisture,
temperature, available food (categorized: woody detritus, leaf litter,
fungal hyphae, fungal fruiting body, sap, blood, dung, carrion at stage N,
pollen, nectar, other bugs by size class), oxygen, pH (for aquatic
phytotelma / soil), gas (CO₂, H₂S in anaerobic pockets, methane).

The game's epistemic move is the same as vugg-simulator's: **the
assemblage tells the story**. A future player should be able to look at a
log they sliced open and identify what stage of decay it's in, what fungi
got established first, which bug succession has been running, just from
the species present. Forensic entomology is real and it works exactly like
mineral paragenesis: the species at the body tell you when it died.

---

## Concept in three sentences

A bounded microhabitat at insect scale — a rotting beech log, a *Sarracenia*
pitcher plant, a dead deer in week three, a leaf-litter patch in a Panama
forest — is the cavity. The substrate (wood, leaf litter, water, carrion,
dung) decays through known biochemistry, providing nichely-specific
resources that gate which sessile organisms nucleate and which motile
bugs colonize, hunt, and breed. The game models this as a community-ecology
simulator (the sessile layer ported from vugg-simulator's crystal-growth
engine, the agent layer net new) with the same defer-to-actual-biology
principle vugg-sim applies to mineralogy.

---

## Aesthetic — naturalist field-guide on real ecology

The vugg-simulator look (ASCII title, monospace panels, dark CRT-style
chrome) carries forward but rotates **tonally**:

- **Palette is real coloration.** Beetle elytra are already iridescent.
  Mosses are real greens. Slime molds are sulfurous yellow. Carrion
  beetles are matte black with cream stripes. Phasmid eggs look like
  seeds. Don't invent colors — the entomological reality is already
  saturated, varied, and weird (a *Chrysochroa* jewel beetle next to a
  white *Collembola* next to an orange *Reduvius* is a palette).

- **Typography stays monospace, but loses the cyberpunk overlay** that
  wasteland-crystals adopted. The right register here is the Victorian
  / Edwardian entomologist's pocket notebook, or the modern field guide
  (Borror & DeLong, Stehr's *Immature Insects*, Triplehorn). Crisp
  hand-drawn-style ASCII for habit silhouettes, italicized Latin
  binomials, modest decorative restraint.

- **The framing is "field notes from a niche under observation."** Not
  god-mode-spawning-bugs, not pet-keeping, not nature documentary. The
  narrator is a careful field worker reporting what they saw on day
  N of a long survey. The narrators (the per-species prose system
  vugg-sim has and wasteland-crystals refined) inherit the
  **clinical-observational voice** with five rules cribbed verbatim
  from wasteland-crystals'
  [HANDOFF-VOICE-AND-DISCIPLINE.md](../../wasteland-crystals/proposals/HANDOFF-VOICE-AND-DISCIPLINE.md)
  (read that document — it is the authoritative voice manual for any
  vugg-family sibling):

  1. Third-person observational. No "you find," no "amazing."
  2. Closer-as-aphorism (the Borges pattern). The last sentence
     compresses the paragraph into a register shift.
  3. Causal chain, not catalog. Substrate → decomposer → consumer →
     predator. Energy flows in order.
  4. Hedge by basis, never by tone. If the species is *documented*
     at this locality, name it. If *inferred from regional fauna
     lists*, prepend `likely` automatically — don't smuggle uncertainty
     into prose tone.
  5. Cite the locality and the cited authority when the assemblage is
     observed there (Speight's saproxylic database, Kitching's
     phytotelma catalog, BCI mesofauna inventory, Goff/Catts forensic
     succession papers).

- **The localities are real places** (see Open Design Q7). When the
  player loads a scenario, it should say "Białowieża primeval forest,
  *Fagus sylvatica* log, year 5 post-fall" or "*Sarracenia purpurea*,
  Cedar Bog, southern Ontario" or "Sus scrofa carrion, Knoxville
  Anthropology Research Facility, ARF, day 14." Real coordinates of
  real ecology.

- **Don't invent visual gimmicks the biology doesn't justify.** No
  glowing-bug overlays, no fantasy-species inserts, no neon. The real
  entomology IS the spectacle — a *Necrophila americana* adult next
  to a *Dermestes* larva on a mouse carcass is a tableau no fantasy
  bug-game has touched. Same load-bearing principle as vugg
  (`feedback_defer_to_geology`): defer to what's actually there. For
  this project, rename the principle: **defer to actual ecology**.

The receiving agent should treat aesthetic decisions the same way they
treat biology decisions — by looking at real species, real food webs,
real successional sequences from the literature, and translating those
faithfully. The game is most beautiful when it is most accurate.

---

## Map view — recommendation: zoomable niche diagram

vugg-simulator's vertical-rings + 3D-Three.js renderer was designed for a
geode-shaped cavity. Wasteland-crystals rotated it into a stratified
landfill cross-section. **Bug-sim's natural geometry is the niche
diagram** — and the right shape varies by scenario:

| Scenario | Natural geometry |
|----------|-----------------|
| Rotting log | Longitudinal section through a cylinder, optionally cross-section through bark→sapwood→heartwood→pith concentric rings |
| Pitcher plant | Vertical section through the pitcher, water column at base, fluid-trapped insects suspended |
| Carrion | Animal silhouette in cross-section, with surface / subcutaneous / internal cavities zones |
| Leaf litter | Vertical column (L horizon → F horizon → H horizon → A soil), bug column rather than mineral rings |
| Tree hole | Cylinder-in-cylinder (the tree's hollow), water column inside |
| Dung pile | Hemisphere with surface / crust / interior moist / interior anaerobic zones |
| Soil profile | Vertical layered (O / A / B / C horizons), like wasteland's stratification |

The rings-and-cells architecture from vugg ports to all of these — you're
re-using the per-cell substrate-typed grid, but the projection into pixels
changes per scenario. This is a renderer-only specialization;
the engine doesn't care.

### Recommended renderer architecture

Two zoom levels, mirroring vugg-sim's existing tier system:

1. **Schematic 2D niche-cross-section** as default. Clean, labeled,
   fast — looks like the figure-in-an-ecology-textbook of the niche.
   Built on canvas-2D, similar in spirit to
   `99b-renderer-topo-2d.ts` but with per-scenario geometry generators.
   Shows niche-specific zones (bark / sapwood / heartwood for a log;
   surface / midwater / debris for a pitcher), with sessile-organism
   crusts/colonies visible at the zone scale.

2. **Three.js detail / agent-layer view** when the player zooms in.
   Shows individual sessile colonies at their visual scale (a moss
   patch, a fungal fruiting body, a lichen crust) AND the motile bug
   agents as ASCII or vector sprites with their range circles. The
   per-cell shader clip (vugg commit `4fb128f`) ports verbatim for
   irregular niche surfaces.

The **agent overlay** is new and important. Bugs need:
- A position dot (where in the niche)
- A range halo (perception/movement radius)
- A direction indicator if currently moving toward target
- A diet/guild tint so the player reads "this dot is a predator,
  that dot is a fungivore" at a glance
- A life-stage glyph (egg / larva / pupa / adult)

That overlay is the visual new thing the player sees compared to a
vugg/wasteland session. Most of the renderer work is reuse; the agent
overlay is the new module.

### Why this works for the field-guide aesthetic

A cross-section diagram of a log or a pitcher or a corpse IS the
classic ecology-textbook image. The player is looking at the figure
from a paper. Lean into it. Use the schematic for the map; use the
zoom-in for the live community.

---

## Mapping vugg-simulator → bug-simulator

The conceptual map is direct enough that ~70%+ of vugg-simulator's
engine should fork-and-modify cleanly. The new architectural piece is
the agent layer.

```
vugg-simulator                   bug-simulator
─────────────────                ─────────────────
vug (cavity in rock)             niche (microhabitat at insect scale)
host rock                        substrate type (wood, litter, carrion,
                                   dung, water, soil, bark)
wall_state.rings[r][c]           niche_state — per-cell substrate +
                                   resource state
fluid chemistry (Ca, CO3, ...)   resource profile (moisture, temp, O₂,
                                   food-by-category, pH, gas)
temperature                      ambient temperature + decomposition heat
host rock dissolves              substrate decays (lignin → cellulose →
                                   simple sugars by fungal degradation;
                                   protein → amino acids → ammonium →
                                   nitrate by bacterial)
crystal nucleates on wall        SESSILE ORGANISM colonizes a cell
                                   (moss, lichen, fungus, algae, biofilm,
                                   sessile-larva attachment)
crystal habit                    growth habit (crustose, foliose,
                                   fruticose, mycelial, hyphal,
                                   filamentous — real organism morphologies)
paragenesis                      ecological succession (the same epistemic
                                   move — assemblage tells the story.
                                   Forensic entomology IS paragenesis.)
events (fluid pulse, cooling)    events (rain, frost, predator arrival,
                                   substrate destruction, fire,
                                   colonization wave, parasitoid emergence)
scenario (locality recipe)       scenario (niche recipe — log type / age,
                                   pitcher species / location, carrion
                                   species / day, dung type, etc.)
host_rock architecture           niche_geometry archetypes — different
  (Mechanic 5)                     geometry generator per niche type

                                 NEW LAYER, no vugg analog:
                                 ─────────────────────────
                                 agent (motile bug)
                                 agent.position (cell index)
                                 agent.range (perception + move radius)
                                 agent.diet (what cells/agents it eats)
                                 agent.predators (what eats it)
                                 agent.life_stage (egg/larva/pupa/adult)
                                 agent.energy (eaten → +energy; idle → -energy)
                                 trophic_graph (species → species edges)
                                 colonization_event (a new species arrives
                                   in the niche, propagule from outside)
```

The substantive new things are:

1. **An agent layer with movement.** Bugs do things crystals don't:
   they MOVE, sense conspecifics and prey, choose, breed, die. The
   per-step loop adds an "agent tick" phase after the sessile-grow
   phase: each agent perceives within range, picks an action (move
   toward food / mate / shelter, eat, breed, flee), executes.

2. **A trophic graph as a first-class data structure.** Each species
   declares what it eats and what eats it, both at agent-level
   (predator–prey) and at substrate-level (a fungivore eats fungal
   biomass from a cell; a xylophage eats wood substrate; a parasitoid
   eats from inside a host of species X). This is the bug-sim
   equivalent of the mineral paragenesis lattice.

3. **Life cycles.** Many bugs have radically different niches as
   larva vs adult. A dragonfly larva lives in water and eats other
   aquatic larvae; the adult flies and eats midges. Caddisfly larvae
   build cases from substrate fragments. Forensic entomology is
   literally an analysis of which larval stages of which species are
   present. Life stage is a first-class state, not a flag.

4. **Resource budget per cell.** Vugg's fluid chemistry diffuses
   between rings; bug-sim's resource budget per cell is consumed by
   feeding and depletes — a dung pile has finite shit. Substrate
   exhaustion is the dominant succession driver: the early colonizers
   exhaust their resource, the next-stage species find a substrate
   that's been pre-processed by the first.

5. **Time scale is days to years.** Faster than vugg (Ma), comparable
   to wasteland (decades). A log decay scenario is 5–30 years; a
   carrion succession is 30–90 days; a pitcher-plant community
   turns over seasonally. One sim-step ≈ one day is a reasonable
   default; sub-day for fast scenarios; one week for slow ones.

6. **No deep-Earth chemistry.** Drop the high-T mineral classes,
   the high-P pegmatites, the supergene oxidation engines. Replace
   with decomposition biochemistry — lignin→cellulose→sugar,
   protein→amine→ammonia→nitrate, lipid→fatty acid. The chemistry
   engine still exists, but the equations are wildly different.

---

## What to reuse (fork-and-modify)

vugg-simulator's infrastructure took 60+ SIM_VERSION iterations to settle.
Fork the repo, rename, and gut per the list below.

### Reuse as-is (renames only)

- **Build pipeline.** `tools/build-all.mjs` + `tools/build.mjs`
  concatenate `js/<NN>-<name>.ts` into `index.html`. Numeric prefixes
  control order. No bundler, no framework, no build step for the
  player — they open `index.html`. Keep this verbatim.

- **Test + baseline pattern.** `tests-js/calibration.test.ts` reads
  seed-42 baselines and asserts parity. Bump `SIM_VERSION` when
  chemistry/ecology changes, regenerate baselines, inspect diff. This
  catches regressions instantly. Port verbatim.

- **TypeScript SCRIPT-mode + tsconfig.** Loose types, global functions,
  no `import`/`export`. The shipped bundle is one inline `<script>`.

- **Renderer architecture (three tiers).** 2D strip canvas + vector
  3D canvas + Three.js. The per-cell shader clip ports verbatim for
  irregular niche surfaces.

- **Habit dispatch + geometry primitives.** `27-geometry-crystal.ts`
  is "shape + zones" agnostic. Mosses are crusts, lichens are
  foliose/fruticose, fungi are mycelial+stipitate, algae are
  filamentous — all reducible to the existing habit vocabulary plus
  a few new tokens.

- **Scenarios.json5 format.** Same schema works (initial conditions,
  events, expected species).

- **Tutorial system.** Port verbatim. New tutorials for "your first
  springtail," "the first fungus to colonize," "what happens on day
  three of carrion succession."

- **Per-species narrators.** The per-mineral narrator pattern
  (`92*-narrators-*.ts`) ports as per-species narrators
  (`9*-narrators-<guild>.ts`). The wasteland voice rules apply.

- **Modular file split + numbering.** Keep the convention. Most slot
  ranges still apply, with relabeled contents.

- **Evidence-level discipline.** Wasteland-crystals' `evidence_level`
  field (`landfill_specific` / `anthropogenic_documented` /
  `geological_analog` / `chemistry_predicted`) ports as
  `evidence_level` for ecology (`locality_observed` /
  `regional_typical` / `genus_documented` / `inferred_from_guild`).

- **Precursor-origin hedging.** The `_phrase` / `_phraseAny`
  mechanism that prepends `likely` when a substrate is
  `implied_typical_msw` ports as `inferred_from_guild` for bugs.

### Fork and substantially modify

- **`22-geometry-wall.ts` (vug cavity) → niche geometry generators.**
  One geometry-builder per scenario type. The bubble-merge cavity
  build is wrong for a log (use a cylinder); for a pitcher plant
  (use a cone); for carrion (use a body silhouette); for litter
  (use a layered column). Per-cell substrate type replaces the
  uniform-wall assumption.

- **`data/minerals.json` → `data/species.json`.** Use the same
  schema with renamed fields: instead of crystal `habit` + `color`
  + `density` + chemistry, you have `growth_form` + `color` +
  `body_size_mm` + `guild` + `diet` + `predators` + `life_stages`.
  Sessile species have a subset; motile species have the full set
  including motility fields (`movement_speed_per_day_cm`,
  `perception_radius_cm`, `flight: bool`).

- **`data/locality_chemistry.json` → `data/niche_substrates.json`.**
  Per-scenario substrate profile: wood (species, decay stage), litter
  (composition by leaf species, age), carrion (species, day, state),
  dung (mammal source, freshness), water (pH, dissolved O₂).

- **`data/scenarios.json5` → niche scenarios.** New scenario set:
  "Beech log, year 5, Białowieża"; "Sarracenia purpurea, Cedar Bog,
  ON, July"; "Sus scrofa carrion, Knoxville ARF, day 14, 25°C";
  "Leaf litter, BCI Panama, dry season"; "Cow dung, Serengeti, day 7";
  "Tree hole dendrotelma, Sphagnum forest"; "Soil profile, prairie A
  horizon."

- **`50–61-engines-*.ts` (per-mineral growth) → per-species growth /
  per-agent behavior.** Sessile species port directly (rename
  `grow_calcite` to `grow_pleurococcus`). Motile species need a new
  `tick_<species>` function that runs the agent decision (sense /
  move / eat / breed / die).

- **Color palette.** Vugg color-codes by mineral class. Bug-sim
  color-codes by **guild**: detritivores warm-brown, fungivores
  green-grey, predators dark, parasitoids red, herbivores green,
  pollinators yellow, decomposers white-brown. Plus per-species
  realistic coloration over the guild base.

### Drop entirely

- **High-T mineral chemistry.** Porphyry, schneeberg, gem pegmatite,
  radioactive pegmatite, the deep-Earth scenarios.
- **The mineral set itself.** Almost nothing in vugg's mineral catalog
  has a bug-sim analog. Start fresh from real entomology lists.
- **Python tree.** Dead in vugg as of 2026-05-07. Don't port it.
- **Some of the geometry math.** Spherical bubble-merge cavities
  are wrong-shape for most bug niches. Re-think geometry per scenario
  type rather than porting.

### New, no vugg analog

- **`js/<NN>-agent.ts`** — the `Agent` class. Fields: species, position,
  energy, life_stage, age_days. Methods: tick (per step), perceive,
  decide, move, eat, breed, die.

- **`js/<NN>-trophic.ts`** — the trophic graph data structure and
  query functions ("who eats X in this scenario?", "what does X eat
  here?"). Loaded from `data/species.json` `diet` and `predators`
  fields.

- **`js/<NN>-life-cycle.ts`** — the life-stage transition machinery
  (egg → larva → pupa → adult), with per-stage diet/range/predator
  overrides.

- **`js/<NN>-colonization.ts`** — the propagule arrival model. Bugs
  appear in a niche by dispersal from outside. Per-species
  `colonization_rate` × per-niche `accessibility` × per-day random
  roll = new agent. The bug-sim analog of vugg's nucleation, but
  driven by dispersal probability rather than supersaturation.

- **`js/<NN>-population.ts`** — population-level summaries + trends.
  Lotka-Volterra-style coupling between predator and prey populations.
  This is what makes the long-time behavior interesting: predator
  overshoot causes prey crash causes predator crash, on real time
  scales (weeks to months).

---

## Bootstrap path

Recommended sequence for the receiving agent.

### 1. Read vugg-simulator + wasteland-crystals architecture (2-3 hours)

Priority reading list at the bottom of this doc. Top items:

1. `vugg-simulator/ARCHITECTURE.md` (10 min)
2. `vugg-simulator/js/README.md` (30 min) — **the module index. Critical.**
3. `wasteland-crystals/proposals/PROPOSAL-WASTELAND-CRYSTALS.md` (30 min)
   — your sibling project's structural model
4. `wasteland-crystals/proposals/HANDOFF-VOICE-AND-DISCIPLINE.md` (20 min)
   — **the voice manual. Read this before writing a single narrator.**
5. `vugg-simulator/proposals/PROPOSAL-HOST-ROCK.md` — substrate model
   parent design (20 min)
6. `vugg-simulator/js/15-version.ts` — last 15 versions of the engine's
   accumulated learning (30 min)

### 2. Run vugg-simulator end to end (15 min)

```bash
cd vugg-simulator
npm install
npm run build
npm test
```

Open `index.html`, try the `supergene_oxidation` scenario. Toggle the
3D renderer. This is the bar you're inheriting.

### 3. Fork the repo

The wasteland-crystals approach: clone fresh, copy what you want.
Faster than `gh repo create --source` and you don't drag in
geological-specific history.

```bash
git clone https://github.com/Syntaxswine/bug-simulator.git
cd bug-simulator
# Copy build pipeline, tsconfig, package.json baseline, vitest config
# from vugg-simulator. Adjust names.
```

### 4. Strip vugg-specific content, keep the chassis

Same order as wasteland did:

1. Empty `data/species.json` → keep schema, drop entries.
2. Empty `data/scenarios.json5` → keep schema, drop entries.
3. Empty narratives.
4. Strip `js/5?-engines-*.ts` to no-op skeletons.
5. Strip `js/92?-narrators-*.ts` to no-op skeletons.
6. Rename `WallState` → `NicheState`, `vug_diameter_mm` → niche-appropriate.
7. **New**: scaffold the agent layer (Agent class, agent registry,
   per-step tick loop) with one placeholder species. Compile + test.
8. Run `npm run build && npm test` after each step.

### 5. First species: pick a saproxylic guild on a beech log

The canonical "hello world" for bug-sim is a single rotting-log
scenario with these initial four species (one per guild):

| Guild | Species | Why |
|-------|---------|-----|
| Sessile decomposer | *Trametes versicolor* (turkey-tail bracket fungus) | Visually instantly recognizable; vugg-engine ports verbatim; primary decomposer that conditions wood for the bugs |
| Detritivore | *Glomeris marginata* (pill millipede) | Eats partially-decayed wood + leaf litter; well-known European species |
| Fungivore | *Ceratophysella denticulata* (springtail) | Eats fungal hyphae + spores; bug-sim's "first agent" |
| Predator | *Lithobius forficatus* (stone centipede) | Eats springtails + small detritivores; closes the basic trophic chain |

If you can ship a tutorial that says "place a *Fagus* log at year 5,
simulate one summer, watch the *Trametes* establish and the springtail
population stabilize and the centipede population follow with a lag" —
you have a working game. Everything else is content.

The vugg pattern to crib for the first engines is the same:
`grow_quartz` in `js/89-engines-silicate.ts` is the model for the
sessile `grow_trametes`. The new pattern to write is the agent tick
loop for `Ceratophysella` — see the `Agent class` section above.

### 6. Iterate by scenario, not by species

Vugg-sim and wasteland both expanded by scenario family. Same here.
Suggested order:

1. **Rotting log** (saproxylic) — easiest, well-studied, big literature
   (Stokland, Siitonen, Jonsson 2012; Speight 1989).
2. **Carrion succession** — dramatic time-scale, real forensic literature
   (Goff 2009 *A Fly for the Prosecution*, Byrd & Castner 2009).
3. **Pitcher plant** (phytotelma) — aquatic-bounded community, small
   species list, big-name literature (Kitching 2000 *Food Webs and
   Container Habitats*).
4. **Dung pile** — fastest community succession, beautiful behavior
   diversity (Hanski & Cambefort 1991 *Dung Beetle Ecology*).
5. **Leaf litter** — most species but well-cataloged at long-term sites
   (Smithsonian BCI, Hubbard Brook).
6. **Tree hole / dendrotelma** — aquatic in wood, small species count,
   Kitching again.
7. **Soil profile** — most complex; defer until basic mechanics are
   solid.

---

## Open design questions

These need a decision between the boss and the receiving agent before
serious implementation. Don't pick blindly.

1. **Agent representation: object-per-bug or aggregated population?**
   Two ways to model 500 springtails in a log. (a) 500 individual
   `Agent` instances each running tick logic. (b) One `Population`
   object with a count + mean state, that ticks population-level
   dynamics. (a) is what the boss's literal description ("bugs have
   a range and eat or get eaten") implies — individual agents. (b) is
   far cheaper to simulate. **Recommendation:** start with (a) for the
   tutorial / showcase species at small population sizes (≤ 100 per
   species per niche), keep (b) available for high-population species
   (springtails, ants) where individual tracking is overkill and gives
   no visual benefit. The renderer can show population (b) as a heat
   tint rather than per-dot.

2. **Time-step granularity.** Vugg's step is geological-time-abstract;
   wasteland's step ≈ months. Bug-sim could use one step = one day
   as default, with per-scenario overrides (one step = one hour for
   carrion first-wave, one step = one week for slow log decay).
   Recommendation: parameterize and default to one-day.

3. **Spatial resolution.** A log can be modeled at cm-cells, mm-cells,
   or as a few discrete zones (bark / sapwood / heartwood / pith).
   Cm-cells is the right granularity — it matches bug body sizes
   (springtails 1-5 mm, beetles 5-30 mm, centipedes 30-100 mm) and
   keeps the cell count reasonable (a 50cm × 20cm log cross-section
   at cm grid = 1000 cells).

4. **Stochasticity vs. determinism.** Vugg-sim is deterministic per
   seed (the calibration tests rely on this). Ecological agents are
   typically stochastic (random walks, probabilistic predation
   outcomes). The vugg seeded-RNG approach (`10-seeded-random.ts`)
   ports — every agent decision draws from the seeded PRNG, so
   seed-42 sweep parity is preserved. Don't break this. The boss
   memory (`feedback_defer_to_geology`) implies the science
   discipline; reproducible runs are the science discipline for
   computational ecology.

5. **Visualization of the agent layer.** Dots? ASCII glyphs? Vector
   sprites? Field-guide silhouettes? Recommendation: **ASCII glyphs
   on the 2D strip view + vector silhouettes on the Three.js detail
   view + range circles when hovered**. Matches the field-guide
   aesthetic and stays within renderer-port territory.

6. **Mortality realism.** Real ecology has many causes of death:
   predation, parasitism, starvation, dessication, old age, fire,
   substrate destruction. Implement all? Just predation + starvation?
   Recommendation: minimum viable is **predation + starvation + old
   age**. Add parasitism + desiccation + substrate-destruction
   per-scenario as the catalog expands. Fire is event-driven (same
   as wasteland's burn-zone overlay).

7. **Scenarios as real localities.** Vugg anchors to real geological
   localities; wasteland anchors to real landfills. Bug-sim should
   anchor to real ecological-survey sites with cited fauna lists
   (Białowieża for European saproxylic, BCI for tropical mesofauna,
   ARF Knoxville for forensic, Cedar Bog for *Sarracenia*). This
   requires entomology homework: find the fauna lists, the
   community-ecology papers, the long-term-monitoring datasets.
   Strongly worth doing — it's what makes the game's claims
   defensible.

8. **Ethical framing for carrion / parasitism scenarios.** Forensic
   entomology is real and important but uses vertebrate decomposition
   imagery. Parasitoid wasps eating their hosts from inside is real
   and important and visually intense. The boss can decide whether
   to include these; the science argument is that they're textbook
   ecology and the player learns by seeing them. Recommendation:
   include but gate behind an explicit content acknowledgment at
   first launch — same way vugg-sim doesn't shy from supergene-oxidation
   chemistry just because it requires acid drainage.

9. **What about plants beyond the substrate role?** The boss said
   "swap crystals with plants and bugs." Plants at this scale are
   mostly substrate (a log IS a dead plant) or sessile organisms
   (mosses, lichens), already covered. Truly motile plant agents
   don't exist at this scale. But: if the scenario is "leaf litter,"
   live plants (seedlings emerging) could be modeled as a slow-growth
   sessile species type. The proposal puts plants in the sessile
   layer alongside fungi/mosses/lichens and considers them solved.

---

## Reading list (priority order)

| Priority | File | What you'll learn |
|----------|------|-------------------|
| **1** | `vugg-simulator/ARCHITECTURE.md` | Overall structure pointer (~10 min) |
| **2** | `vugg-simulator/js/README.md` | Every JS module's purpose (~30 min) |
| **3** | `wasteland-crystals/proposals/PROPOSAL-WASTELAND-CRYSTALS.md` | The sibling-project template (~30 min) |
| **4** | `wasteland-crystals/proposals/HANDOFF-VOICE-AND-DISCIPLINE.md` | The voice manual — read before writing prose (~20 min) |
| **5** | `vugg-simulator/proposals/PROPOSAL-HOST-ROCK.md` | The parent substrate design (~20 min) |
| **6** | `vugg-simulator/js/15-version.ts` (last 15 entries) | Engine learning history (~30 min) |
| **7** | `vugg-simulator/js/27-geometry-crystal.ts` | Crystal data model — port directly to sessile organisms (~20 min) |
| **8** | `vugg-simulator/js/22-geometry-wall.ts` | Wall/cavity model — your starting point for niche geometry (~30 min) |
| **9** | `vugg-simulator/js/85-simulator.ts` + 85b + 85c | The main loop (~30 min) |
| **10** | `vugg-simulator/js/52-engines-carbonate.ts` | Growth-engine reference; sessile species port like this (~20 min) |
| **11** | `vugg-simulator/proposals/HANDOFF-ADDING-MINERALS.md` | Per-mineral checklist; the bug-sim analog is per-species (~15 min) |
| **12** | `vugg-simulator/js/99i-renderer-three.ts` | Three.js renderer (long but essential) |
| **13** | `vugg-simulator/tests-js/calibration.test.ts` | Baseline pattern (~10 min) |
| **14** | `vugg-simulator/tools/build-all.mjs` | Build pipeline (~10 min) |
| **15** | Stokland, Siitonen, Jonsson 2012 — *Biodiversity in Dead Wood* (Cambridge) | Saproxylic ecology spine; the rotting-log scenario's reference |
| **16** | Kitching 2000 — *Food Webs and Container Habitats: the natural history and ecology of phytotelmata* (Cambridge) | Pitcher-plant / tree-hole community spine |
| **17** | Hanski & Cambefort 1991 — *Dung Beetle Ecology* (Princeton) | Dung-pile scenario |
| **18** | Byrd & Castner (eds.) 2009 — *Forensic Entomology* | Carrion succession |
| **19** | Coleman, Callaham, Crossley 2017 — *Fundamentals of Soil Ecology* | Soil profile + leaf-litter mesofauna |
| **20** | Speight 1989 — *Saproxylic invertebrates and their conservation* (Council of Europe) | The original saproxylic fauna list |
| **21** | Hutchinson 1957 — *Concluding Remarks* (Cold Spring Harbor) | Niche theory founder paper, ~30 pages, foundational |

---

## A note on principle

vugg-simulator's core design principle, articulated by the boss and saved
in agent memory as **"defer to actual geology"**: when there's tension
between visual cleanness, simulation convenience, and reality — pick
reality. The simulator's value is that the assemblages emerge from real
chemistry, not from coded compromises.

Carry this principle directly into bug-sim, renamed: **defer to actual
ecology**. The temptation in a bug game is to invent fun-looking creatures
because the setting feels permissive. Don't. The real entomology is
already weirder, more violent, more cooperative, more strange than
anything fantasy would let through. A *Cordyceps* fungus growing out of
an ant's brain. A bombardier beetle's binary chemical artillery. A
parasitoid wasp larva that keeps its caterpillar host alive but immobilized
for two weeks until it pupates. A click beetle that can launch itself
into the air. A *Onthophagus* dung beetle whose males have horns the
species evolved twice.

Cite the literature. Model the biology. Let the visuals follow.

The natural is already strange enough. Trust the bugs.

---

## What this proposal is and isn't

**Is:** a handoff. A starter map. A pointer at the parts of vugg-simulator
(and wasteland-crystals as the sibling reference) that the new project
should crib, with enough entomology to know where to begin.

**Isn't:** a finished design doc. The receiving agent and the boss will
make the real decisions — agent representation (individual vs aggregated),
time-step granularity, scenario set, which niches to ship first, voice
register details, content-gating for graphic scenarios. This proposal
just makes sure those decisions are well-informed.

If you're the receiving agent: when you have questions, ask the boss.
The boss prefers anticipatory proposals over open-ended check-ins —
do the homework, present a recommendation, name the tradeoffs. See
boss memory file `feedback_anticipatory_proposals.md` for the
collaboration style.

Welcome to the project. The natural world's small life needs a
simulator that takes it seriously. 🪵🐜🍄
