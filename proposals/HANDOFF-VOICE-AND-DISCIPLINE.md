# HANDOFF — Voice and Discipline

**Audience:** the next contributor (human or agent) who adds a species
narrator, a scenario, or modifies an evidence_level entry.

**Author:** Claude, drafting at the end of v0.7.0. **Date:** 2026-05-14.

**Why this exists:** Bug Simulator inherits its voice + discipline
spine from its older sibling [wasteland-crystals](https://github.com/Syntaxswine/wasteland-crystals/blob/main/proposals/HANDOFF-VOICE-AND-DISCIPLINE.md).
That document is the authoritative manual. **This file documents the
two tonal shifts bug-simulator makes** and otherwise points at the
wasteland HANDOFF.

Read both. The wasteland HANDOFF has the structural rules + the
canonical `_narrateMalachite` walkthrough; this file says how to
translate that into bug-sim's register.

---

## Where the discipline is identical

All five wasteland voice rules port to bug-sim verbatim:

1. **Third-person observational.** Never "you find," never "amazing."
   The species does what it does; the prose records.
2. **Closer-as-aphorism.** End the paragraph with a register-shifting
   line. This is the Borges pattern and it is the hardest part of
   the prose. First drafts are almost never right.
3. **Causal chain, not catalog.** Trace the species through its
   role: where it appears → what it eats / decomposes → what eats
   or succeeds it → what it leaves behind.
4. **Hedge by basis, never by tone.** "Likely" is reserved for
   tokens the species spec marks `evidence_level:
   inferred_from_guild`. Don't smuggle uncertainty into tone-hedges.
5. **Cite the locality when documented there.** Białowieża for the
   beech-log assemblage; Cedar Bog for the pitcher-plant community.
   When the species is documented at the active scenario's
   locality, name it and the paper.

And the three structural disciplines port verbatim too:
**evidence_level honesty**, **precursor-origin hedging**, **citation
pedigree**. See the wasteland HANDOFF for the canonical writeup.

---

## Where bug-sim differs — the tonal shift

Wasteland Crystals targets **clinical-Borges cyberpunk** —
"Diagenesis re-making the same mineral in eight decades that geologic
systems make in eight thousand." Bug Simulator targets a different
register: **naturalist field-guide / Edwardian entomologist's notebook.**

What this means concretely:

### The voice template

| Wasteland (cyberpunk-clinical) | Bug-sim (naturalist-observational) |
|--------------------------------|-------------------------------------|
| Surveyor reporting from a future landfill-mining operation | Field naturalist reporting from a long-term ecological survey |
| Mining quarterly report register | Borror & DeLong / E.O. Wilson register |
| Cool, slightly mordant | Warm but precise; restrained wonder |
| "Chemistry trapped in transit." | "A small predator working the bark, two weeks ahead of the spring thaw." |

The closer-aphorism rule is the same, but the *content* of the
closer shifts. Wasteland closers reframe through chemistry; bug-sim
closers reframe through **ecology + time** — the species' role across
seasons, its position in a succession, the larger arc the niche is
running.

### Tense + scope

- Present tense, observational. "Lithobius works the bark crevices
  at dusk." Not "*Lithobius forficatus* is a centipede that works..."
- Third person *species*, not third person *specimen*. The narrator
  is talking about how the species behaves, not "this particular
  centipede." A specific specimen lives or dies in the sim; the
  narrator describes the kind of thing it is.
- The niche is the frame. Open with where the species fits in the
  active scenario's niche. "On a year-five beech log..." or "In the
  water column of a *Sarracenia purpurea* pitcher..."

### What to lean into

- **Real natural history.** Use the species' actual biology — venom
  glands, marsupial brood pouches, hyphal foraging, ambush hunting.
  These details are the spectacle.
- **Time scale.** Bug-sim niches turn over in months to years (vs
  wasteland's decades and vugg's millennia). The narrator should
  cite the time scale appropriate to the species — "two-week
  pupation," "annual generation," "the colony's first summer."
- **The closer should compress, not summarize.** Best closers turn
  the paragraph's content into a single shift — an aphorism, an
  analogy, a register switch from biology to time or back.

### What to avoid

- **No "watch as..." or "see how...".** No second person.
- **No tutorial framing.** The narrator isn't telling the player how
  to play. It's writing about the species.
- **No anthropomorphism.** "The springtail hunts" is fine. "The
  springtail is determined to find food" is not.
- **No promotional adjectives.** "Beautiful," "fascinating,"
  "remarkable." The biology IS already remarkable; saying so deflates it.
- **No undue cuteness.** This is the entomologist's notebook, not a
  picture-book caption. Bug-sim is a science simulator that happens
  to be cute. The prose should be precise; the cuteness is emergent.

---

## Canonical example — `_narrateLithobiusForficatus`

```ts
function _narrateLithobiusForficatus(scenario: any): string {
  return [
    "On a year-five beech log, Lithobius works the bark crevices at",
    "dusk. The body is long and segmented, fifteen pairs of legs",
    "moving in waves, the head's pedipalps tasting the substrate ahead.",
    "Where the springtail population reaches density enough that a",
    "centipede can run a circuit through it, Lithobius establishes —",
    "and then sets the upper limit of the springtail's range.",
    "",
    "Real prey for the size: anything under fifteen millimetres,",
    "soft-bodied, slower than its strike. Glomeris's pill-roll",
    "defense fails against the venom mandibles. Ceratophysella's",
    "spring escape works on most predators but Lithobius is faster",
    "than the launch.",
    "",
    "The centipede is the saproxylic community's regulator —",
    "without it the detritivores climb until they hit the substrate's",
    "carrying capacity. Spring through autumn, a single Lithobius can",
    "cull a season's springtail surplus.",
    "",
    "Three years of generation time inside a log that has another",
    "twenty before it goes back to soil.",
  ].join(" ");
}
```

Five things to notice:

1. **Opens with the niche.** "On a year-five beech log..." sets
   scenario before species.
2. **Causal chain explicit.** Hunts → controls prey → regulates the
   community. The closer doesn't restate this; it reframes it.
3. **Real natural-history details.** Pedipalps, venom mandibles,
   fifteen leg-pairs — these aren't flavor; they're what makes
   *Lithobius* the kind of thing it is.
4. **Closer compresses through time.** Three years of centipede life
   nested inside a log's twenty-year decay cycle. The body of the
   paragraph said what it does; the closer says what scale it does
   it at.
5. **No locality citation.** This narrator is generic to the species,
   so it doesn't name Białowieża. A scenario-specific narrator
   version (when a paper documents *Lithobius* at the active
   locality) would add it with a basis-hedge.

---

## Checklist for adding a species narrator

Before authoring `_narrate<Species>`:

- [ ] Species has an entry in `data/species.json` with
      `evidence_level`, `citations`, and `biology_notes`.
- [ ] You have read at least one of the cited papers, or you can
      defend the citation tier honestly.
- [ ] You know which scenario(s) the species appears in.

Authoring the function:

- [ ] Open with the species in its niche, not the species in the
      abstract.
- [ ] Build the causal chain: where → what it does → who it affects.
- [ ] Lean on real natural-history details.
- [ ] Close with an aphorism that compresses, not restates.
- [ ] Reference the locality if the cited paper documents the
      species there (always with a paper-name parenthetical).

Reviewing your own narrator:

- [ ] No second-person, no game framing.
- [ ] No promotional adjectives.
- [ ] No anthropomorphism beyond what the biology supports.
- [ ] If you removed the closer, the paragraph would still read as
      observation — the closer is doing register-shift work.
- [ ] The closer is a *different sentence* from how the paragraph
      ended; it's not "and so this is interesting."

---

## When the project grows

When bug-sim adds more scenarios (carrion succession, leaf litter,
dung pile, tree hole), each scenario brings its own species set.
Narrators are species-level by default; scenario-specific variants
can be added when a species behaves notably differently in different
niches (e.g., a soil mite has different behavior in litter vs in a
nest).

The dispatch pattern (vugg-simulator's `92x-narrators-<class>.ts`,
wasteland-crystals's `04-narrators.ts`) is the canonical shape. Each
narrator function takes the active scenario as a parameter so it can
hedge locality references.

Preserve the discipline. It compounds.

---

## Lessons from the first 31 narrators (v0.2.0 → v0.14.0)

Notes after writing thirty-one narrators in a single session (one
sitting, roughly twelve scenarios' worth of work). The five voice
rules above held *most* of the time; what follows is what didn't
hold and how to catch it. Read this section *in addition to* the
five rules — the rules tell you the principles, this section tells
you the drifts to expect.

### What the smoke test catches

Two of the discipline rules can be regex-tested in
`tests-js/smoke.test.ts`:

- **Bare second person.** `/\byou\b/i` against every narrator's
  output. Caught two regressions during this session (Semibalanus
  "if you watch a submerged barnacle" and Patella "stuck so firmly
  to a rock that you cannot pry it off"). Both were rewritten in
  the same commit before merging.
- **Cardinal promotional adjectives.** `/\b(amazing|beautiful|stunning|fascinating)\b/i`.
  Caught zero regressions — these are the obvious words the rule
  warns against, and they didn't slip through.

### What the smoke test missed

Three subtler drifts that the regex can't see. Search for them by
hand at narrator-review time.

**1. Soft promotional adjectives.** The obvious words ("amazing",
"beautiful") got filtered, but a softer set drifted through:

- *"famous"* — appeared once in `_narrateDytiscusMarginalis`: "the
  famous 'water tigers'." Promotional in that it leans on the
  species' reputation rather than letting the body deliver the
  impact. Replace with neutral framing — "the so-called water
  tigers", or just describe the larva directly.
- *"signature"* — `_narrateTramatesVersicolor`: "the species'
  signature." Mild promotional. Replace with "diagnostic" or
  describe what specifically distinguishes the structure.
- *"the famous", "the classic", "the canonical"* — all in the same
  family. They tell the reader the thing matters; the body should
  do that instead.

Search pattern at audit time:
`/\b(famous|signature|striking|distinctive|notable|celebrated|iconic|spectacular|extraordinary)\b/i`

A future smoke-test extension could regex these. Decide per-word
which are pure promotional vs which are sometimes load-bearing
descriptive ("distinctive" is borderline; "famous" is not).

**2. Anthropomorphic verbs disguised as description.** When the
species does something via reflex or chemotaxis or hydraulic
response, certain verbs sneak in that imply purposeful cognition:

- *"navigates"* — appeared in `_narrateCalliphoraVicina`: "A
  flying female ... navigates by volatiles." Chemotaxis is not
  navigation in the cognitive sense — the female is following a
  gradient, not choosing a path. Better: "locates by volatile
  compounds" or "is drawn by volatile compounds."
- *"decides"*, *"chooses"*, *"prefers"*, *"hopes"*, *"wants"*,
  *"tries"* — all imply intentional cognition. Use only when the
  biology specifically describes a decision (e.g., honeybee waggle-
  dance recruitment is a real decision-making process; chemotaxis
  is not).
- *"home"* — `_narrateApisMellifera` says "returns to the hive."
  This one is OK — honeybee homing is a documented orientation
  behavior, not anthropomorphism. The test for whether a verb is
  load-bearing or merely flavoring: can the species be observed
  doing the verb at the cited behavioral level? If yes, use it;
  if no, find the mechanism word.

Search at audit time for the verb list:
`/\b(navigates|decides|chooses|prefers|hopes|wants|tries|aims|considers|knows)\b/i`

**3. Closers that summarize rather than reframe.** This is the
hardest discipline because there's no regex for it. Re-read each
closer alone, ignoring the paragraph body, and ask: *does this
sentence make me see the species differently than the body did,
or does it just say the body again in shorter form?*

Three of the v0.2.0–v0.14.0 closers are weaker than the rest:

- `_narrateBeauveriaBassiana`: "The species' name is the original
  credit." — Historical fact, not register shift. The previous
  sentence already credited Bassi 1835; the closer just restates it.
  A stronger closer would reframe the discovery — something about
  the first proven microorganism cause of disease being a fungus
  that grew out of the silkworm industry that funded the
  microscopes that found it.
- `_narrateWyeomyiaSmithii`: "An entire mosquito species whose
  life cycle hinges on a leaf-shaped carnivorous reservoir at the
  northern edge of its host plant's range." — Descriptive
  summary; reads as one more body sentence with adjectives. The
  closer should compress the species' position into something
  surprising.
- `_narrateCalliphoraVicina`: "A two-week sprint from the freshest
  substrate available, then departure as pupae buried in the soil
  beneath." — Descriptive timeline. Could be stronger by reframing
  what the maggot mass IS — e.g., a self-heating biochemical reactor
  the species cannot survive outside of, then a body of pupae
  buried.

The strong closers from this corpus, for calibration:

- *Lithobius*: "Three years of generation time inside a log that
  has another twenty before it goes back to soil." (nested time
  scales)
- *Coeloides*: "Idiobionts kill on contact; koinobionts like
  Coeloides keep the host alive as a meat-larder. The latter
  strategy looks gentler. It is not." (moral reversal)
- *Mantis*: "Forty days into adult life is the species' peak, and
  the rest is decline." (time perspective)
- *Patella*: "An animal whose teeth are stronger than its skeleton
  and whose skeleton is fused to the ground." (paradox)
- *Carcinus*: "A predator whose ecological role is identical
  wherever it occurs; what differs is whether its prey have
  evolved to recognise it." (context shift)
- *Ips*: "The arithmetic of one extra generation across millions
  of hectares is what European foresters now think about
  full-time." (scale shift)

Common shape: the closer either compresses through *time*
(nested scales), *paradox* (two opposite truths held together),
*reversal* (the gentler-seeming choice is the crueler), or
*context shift* (the species' meaning depends on something
outside the species). A descriptive closer is not closing — it's
trailing off.

### Discipline-of-the-reread

The most actionable lesson from the session: the voice was
strongest in the first ten narrators, drifted around #15, and
recovered only when the smoke test caught the "you" regressions
in #28 and #29 (Semibalanus, Patella) which forced a re-reading
of the rules.

**Re-read this document before each new narrator.** It is short.
The whole point of having a voice manual is that the discipline
is forgettable; re-reading restores it. Five minutes of re-reading
saves an hour of audit later.

If the project ever grows past forty narrators, the per-narrator
re-read becomes impractical. At that point: do a per-batch audit
(every five narrators, re-read this doc, re-audit the last five
against the drift patterns above) and extend the smoke-test
regexes to cover the soft-promotional + anthropomorphism word
lists.

### Suggested smoke-test extensions

Three patterns that would catch v0.14.0-style drift if added to
`tests-js/smoke.test.ts`:

```typescript
// Soft promotional adjectives (after the existing /\byou\b/i check)
expect(prose).not.toMatch(/\b(famous|striking|spectacular|extraordinary|incredible)\b/i);

// Common anthropomorphic verbs
expect(prose).not.toMatch(/\b(decides|chooses|prefers|hopes|wants to|tries to|considers|knows that)\b/i);

// Closer-as-summary detector — heuristic only: if the last
// sentence shares >70% of its content words with the previous
// sentence, flag for human review. Hard to encode precisely;
// possibly defer to manual audit.
```

Doing this would have caught the Dytiscus "famous water tigers"
and the Calliphora "navigates" in CI. The closer-as-summary
heuristic is harder; for now it's a manual-audit concern.

### Status note — v0.15.0

The seven drifts named above were rewritten and the two suggested
smoke-test regexes added. The corpus is now clean against both
regexes. The named instances remain in this document as
calibration material — pair the descriptions here with the
original-and-rewritten text in the v0.15.0 commit message
(`git show v0.15.0` or search the log) to feel each rewrite. The
*patterns* this section documents are still load-bearing: the
next contributor should expect the same drifts to re-appear and
should treat this list as the audit checklist.

The closer-as-summary heuristic remains unautomated. Closers are
the hardest discipline; manual re-read is the only check.
