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
