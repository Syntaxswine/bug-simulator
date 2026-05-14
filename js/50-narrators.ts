// ============================================================
// js/50-narrators.ts — per-species naturalist-field-guide narrators
// ============================================================
// Per-species prose, following the voice + discipline rules in
// proposals/HANDOFF-VOICE-AND-DISCIPLINE.md. Register: naturalist
// observational. Third person, present tense, the niche as the
// frame, the closer as aphorism. No second-person, no promotional
// adjectives, no anthropomorphism beyond what the biology supports.
//
// Dispatch via NARRATORS[species_id]. UI reads narrate(species_id,
// scenario_id) and displays the result in the species modal.
//
// SCRIPT-mode TS.

const NARRATORS: Record<string, (scenario: any) => string> = {};

function narrate(speciesId: string, scenario: any = null): string {
  const fn = NARRATORS[speciesId];
  if (!fn) return _genericNarrator(speciesId);
  return fn(scenario);
}

function _genericNarrator(speciesId: string): string {
  const spec = SPECIES_SPEC?.[speciesId];
  if (!spec) return "";
  const guild = spec.guild ?? "organism";
  const role = spec.biology_notes
    ? spec.biology_notes
    : `A ${guild} in the niche.`;
  return role;
}

// ───────────────────────────────────────────────────────────────────
// Saproxylic (rotting-log) species
// ───────────────────────────────────────────────────────────────────

NARRATORS["trametes_versicolor"] = (_scn) => [
  "On a year-five beech log, Trametes works the sapwood from outside in.",
  "Hyphae thread through the cellulose ahead of the fruiting body —",
  "the bracket itself is the part the rest of the community will use.",
  "White-rot decay leaves the wood spongy and stripped of lignin; the",
  "spent substrate becomes a feeding ground for everything that arrives",
  "afterward.",
  "",
  "The fan-shaped pore surface is the species' signature. Banded growth",
  "rings record each season's expansion: warm-wet bands wide, cold-dry",
  "bands narrow.",
  "",
  "A bracket fungus is not a single event but a chemistry running for",
  "years, mineralizing wood into food that no animal could extract directly.",
  "Springtails and woodlice catalog the difference.",
].join(" ");

NARRATORS["ceratophysella_denticulata"] = (_scn) => [
  "Ceratophysella lives where Trametes has already been — the fungus's",
  "hyphae are food, and the spent wood underneath is humid enough to keep",
  "the springtail's cuticle from drying. Movement is short bursts of the",
  "tail-spring, perhaps two centimetres per launch, then a stop to taste",
  "the substrate again. Parthenogenetic; one female fills a niche pocket",
  "in a few generations.",
  "",
  "The springtail is the saproxylic community's smallest filter on the",
  "fungal-biomass pool. Each individual processes a few hundredths of a",
  "gram of hyphae per day. The community matters because a few hundred",
  "individuals matter.",
  "",
  "A population that exists because Trametes was here first, and will not",
  "exist after Trametes has finished.",
].join(" ");

NARRATORS["glomeris_marginata"] = (_scn) => [
  "Glomeris arrives at the bark when the wood has begun to soften —",
  "anything below decay stage three is too dense for the millipede's",
  "mandibles to fragment. The pill-roll defense works against most",
  "predators in this niche; the centipede is the exception. Annual",
  "generation, multi-year individual.",
  "",
  "The diet is everything the millipede can break into smaller pieces:",
  "partially-decayed wood, leaf litter, bark fragments. Each bite",
  "fragments the substrate further; what passes through becomes",
  "consumable by smaller detritivores and bacteria.",
  "",
  "A slow, segmented engine for converting structure into surface area.",
].join(" ");

NARRATORS["oniscus_asellus"] = (_scn) => [
  "Oniscus settles wherever the wood is damp and the bark is loose enough",
  "to lift. The flat seven-segment body fits the crevice; the marsupial",
  "brood pouch carries thirty or so juveniles to nymph stage before",
  "release. Tolerates a wider decay range than Glomeris — by year five",
  "the woodlouse can work zones the millipede won't touch.",
  "",
  "Diet overlaps with the millipede on litter; below it on bark; and",
  "extends into the early stages of wood decay the millipede skips.",
  "Slower escape than Glomeris and no conglobation defense — Lithobius",
  "takes them readily.",
  "",
  "An isopod working a niche that wasn't there a year ago, on a substrate",
  "that won't be there a decade from now.",
].join(" ");

NARRATORS["neobisium_muscorum"] = (_scn) => [
  "Neobisium hunts springtails in the moss and litter — three millimetres",
  "of soft body with two oversized pedipalps, each tipped with a venom",
  "gland. The gait is a slow forward creep punctuated by a fast strike. A",
  "successful strike injects, immobilizes, and pre-digests the prey;",
  "everything that follows is consumption.",
  "",
  "The size range matters. Anything larger than about six millimetres is",
  "outside the pseudoscorpion's reach. Millipedes, woodlice, and centipedes",
  "are not on the menu. The community has a second predator tier that",
  "doesn't compete with Lithobius.",
  "",
  "An arachnid built to fit the spaces other arachnids can't.",
].join(" ");

NARRATORS["lithobius_forficatus"] = (_scn) => [
  "On a year-five beech log, Lithobius works the bark crevices at dusk.",
  "The body is long and segmented, fifteen pairs of legs moving in waves,",
  "the head's pedipalps tasting the substrate ahead. Where the springtail",
  "population reaches density enough that a centipede can run a circuit",
  "through it, Lithobius establishes — and then sets the upper limit of",
  "the springtail's range.",
  "",
  "Real prey for the size: anything under fifteen millimetres, soft-bodied,",
  "slower than its strike. Glomeris's pill-roll defense fails against the",
  "venom mandibles. Ceratophysella's spring escape works on most predators",
  "but Lithobius is faster than the launch.",
  "",
  "The centipede is the saproxylic community's regulator — without it the",
  "detritivores climb until they hit the substrate's carrying capacity.",
  "Spring through autumn, a single Lithobius can cull a season's springtail",
  "surplus.",
  "",
  "Three years of generation time inside a log that has another twenty",
  "before it goes back to soil.",
].join(" ");

// ───────────────────────────────────────────────────────────────────
// Phytotelma (Sarracenia pitcher-plant) species
// ───────────────────────────────────────────────────────────────────

NARRATORS["sarracenia_purpurea"] = (_scn) => [
  "Sarracenia is the niche itself — the pitcher is a leaf evolved into",
  "a trap, the trap holds water, the water holds the community. The waxy",
  "interior + downward-pointing hairs make exit impossible for any insect",
  "that climbs in; the pitcher's enzymatic and bacterial chemistry handles",
  "the rest.",
  "",
  "The plant does not eat the trapped insects directly. The community of",
  "rotifers, midge larvae, mosquito larvae, and bacteria inside the trap",
  "fragment + mineralize the prey; the nitrogen and phosphorus that result",
  "are what the plant absorbs.",
  "",
  "A carnivorous plant that outsourced its digestion to inquilines, and",
  "outsourced its food acquisition to the wind that blew the insects in.",
].join(" ");

NARRATORS["wyeomyia_smithii"] = (_scn) => [
  "Wyeomyia spends its larval stage suspended in the pitcher's water column,",
  "filtering bacteria with feathered mouthparts twenty times per second. The",
  "larva cannot survive outside a Sarracenia pitcher — the species is",
  "obligate to its niche. Three to four weeks to pupation, then emergence",
  "as a flying adult that lays into a different pitcher for the next",
  "generation.",
  "",
  "The water column's bacterial load is set by Metriocnemus's fragmentation",
  "below and the pitcher's daily prey intake above. Wyeomyia is the top of",
  "the filter chain: more bacteria means more larvae means more emergence",
  "events.",
  "",
  "An entire mosquito species whose life cycle hinges on a leaf-shaped",
  "carnivorous reservoir at the northern edge of its host plant's range.",
].join(" ");

NARRATORS["metriocnemus_knabi"] = (_scn) => [
  "Metriocnemus settles on the pitcher floor and works the accumulated prey",
  "carcasses, fragmenting chitin and cuticle into pieces small enough for",
  "bacteria to act on. Each larva is a four-millimetre engine of",
  "comminution. The fragmentation rate is the community's bottleneck:",
  "without midge larvae the prey would sit largely intact, and Wyeomyia",
  "above would have nothing to filter.",
  "",
  "The midge is one of the few macroinvertebrates that overwinters inside",
  "a pitcher — the trap's water column freezes solid in northern winters",
  "and the larva survives by anhydrobiosis.",
  "",
  "A detritivore whose ecosystem service is making the niche feedable for",
  "everyone else.",
].join(" ");

NARRATORS["habrotrocha_rosa"] = (_scn) => [
  "Habrotrocha colonies anchor to the detritus on the pitcher floor —",
  "microscopic patches of pinkish bdelloid rotifers feeding by ciliary",
  "currents that pull water through the colony. Each individual is a",
  "third of a millimetre long, but a healthy patch contains thousands.",
  "Asexual reproduction; the entire community is clonal female.",
  "",
  "Diet is bacterial: the same bacterial pool Wyeomyia filters from",
  "above, but Habrotrocha takes it sessile and benthic. The rotifers also",
  "mineralize residual prey detritus by ingestion-and-excretion, accelerating",
  "the breakdown beyond what Metriocnemus's fragmentation alone produces.",
  "",
  "Bdelloids have survived without males for forty million years; the",
  "pitcher's water column is one of the small environments where this",
  "still works.",
].join(" ");
