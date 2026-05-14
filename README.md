# Bug Simulator

A vugg-simulator sibling. The cavity is now a **niche** at insect scale —
a rotting log, a pitcher plant, a vertebrate carcass, a leaf-litter pocket,
a dung pile. Sessile organisms (mosses, fungi, lichens, algae) nucleate
and grow on the substrate with vugg-style mechanics. **Motile bug agents
colonize, hunt, and breed on top** — a new layer with position, range,
diet, and a predator–prey graph.

The science is the foundation: real entomology, real community ecology,
real successional sequences. Forensic entomology IS paragenesis — the
assemblage tells the story of how the substrate has decayed and which
species arrived in which order.

The natural world's small life deserves a simulator that takes it
seriously.

---

## Status

🚧 **Empty repo, ready for the receiving agent.** The canonical proposal
lives at [`proposals/PROPOSAL-BUG-SIMULATOR.md`](proposals/PROPOSAL-BUG-SIMULATOR.md).

That document is the handoff: it's a self-contained brief for the agent
(or human) starting this project. It covers the concept, the vugg → bug-sim
translation table, the new agent layer, what to fork from vugg-simulator
and what to build fresh, the bootstrap sequence, niche-geometry
recommendations, the naturalist field-guide aesthetic, and a
priority-ordered reading list.

---

## Reference: vugg-simulator and wasteland-crystals

This project is a fork-and-modify derivative of
[vugg-simulator](https://github.com/Syntaxswine/vugg-simulator). The
vugg-simulator codebase has 60+ SIM_VERSION iterations of chemistry-true
nucleation-and-growth, a per-cell shader-clipped Three.js renderer, host-rock
architecture (Mechanic 5), a deterministic test/baseline pattern, and a
TS-to-single-HTML build pipeline. Most of the substrate / sessile layer
ports directly; see the proposal for the full reuse plan.

The vugg-simulator canonical fork is at
[StonePhilosopher/vugg-simulator](https://github.com/StonePhilosopher/vugg-simulator).

Bug Simulator's older sibling is
[wasteland-crystals](https://github.com/Syntaxswine/wasteland-crystals)
— another vugg fork where the cavity became an industrial waste cell.
Its [`HANDOFF-VOICE-AND-DISCIPLINE.md`](https://github.com/Syntaxswine/wasteland-crystals/blob/main/proposals/HANDOFF-VOICE-AND-DISCIPLINE.md)
is the authoritative voice manual for any vugg-family sibling, including
this one — read it before writing a single narrator.

This Bug Simulator repo follows the same workflow as both: development on
Syntaxswine; the boss promotes to StonePhilosopher when canonical.

---

## Concept in three sentences

A bounded microhabitat at insect scale — a rotting beech log, a
*Sarracenia* pitcher, a dead deer in week three, a leaf-litter patch in
a tropical forest — is the cavity. The substrate decays through known
biochemistry, providing niche-specific resources that gate which sessile
organisms nucleate and which motile bugs colonize, hunt, and breed.
The game models this as a community-ecology simulator (sessile layer
ported from vugg-simulator's crystal-growth engine, agent layer net new)
with the same defer-to-actual-biology principle vugg applies to mineralogy.

---

## Reading order for the receiving agent

1. [`proposals/PROPOSAL-BUG-SIMULATOR.md`](proposals/PROPOSAL-BUG-SIMULATOR.md) — this repo's design brief
2. [vugg-simulator/ARCHITECTURE.md](https://github.com/Syntaxswine/vugg-simulator/blob/main/ARCHITECTURE.md) — overall structure pointer
3. [vugg-simulator/js/README.md](https://github.com/Syntaxswine/vugg-simulator/blob/main/js/README.md) — module index
4. [wasteland-crystals/proposals/PROPOSAL-WASTELAND-CRYSTALS.md](https://github.com/Syntaxswine/wasteland-crystals/blob/main/proposals/PROPOSAL-WASTELAND-CRYSTALS.md) — the sibling-project template
5. [wasteland-crystals/proposals/HANDOFF-VOICE-AND-DISCIPLINE.md](https://github.com/Syntaxswine/wasteland-crystals/blob/main/proposals/HANDOFF-VOICE-AND-DISCIPLINE.md) — the voice manual
6. [vugg-simulator/js/15-version.ts](https://github.com/Syntaxswine/vugg-simulator/blob/main/js/15-version.ts) — recent SIM_VERSION history

The proposal in this repo lays out the full bootstrap sequence after that.

---

## License

TBD — same as vugg-simulator (which is currently unlicensed; the boss
will set this for both projects).
