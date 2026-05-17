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
// Cross-scenario species (entomopathogens, etc.)
// ───────────────────────────────────────────────────────────────────

NARRATORS["beauveria_bassiana"] = (_scn) => [
  "Beauveria is everywhere. Soil, leaf litter, bark crevices, the bottom",
  "of a pitcher plant — the spores wait. When a weakened or dead arthropod",
  "lands in the right humidity, the hyphae penetrate the cuticle and the",
  "fungus consumes the body from inside. A few days later the corpse is",
  "covered in the fluffy white sporulating mat the species is named for —",
  "muscardine, from the French for white powder.",
  "",
  "The host range is essentially every terrestrial arthropod order. What",
  "limits the fungus is moisture and temperature, not host preference.",
  "Cool wet weather is a Beauveria epidemic; dry heat is not.",
  "",
  "Agostino Bassi watched silkworms die of muscardine in 1835 and proved",
  "the cause was a fungus rather than miasma — the first time anyone",
  "had shown a microorganism causing a specific disease, and the species'",
  "name is his credit.",
  "",
  "The first proven microorganism cause of disease is the same species",
  "sprayed today on commercial fields to kill locusts: the discovery and",
  "the application separated by two centuries of the science it began.",
].join(" ");

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
  "The fan-shaped pore surface is diagnostic. Banded growth rings record",
  "each season's expansion: warm-wet bands wide, cold-dry bands narrow.",
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
  "A mosquito whose photoperiodic genetics have measurably shifted toward",
  "shorter critical day lengths across forty years of warming (Bradshaw",
  "& Holzapfel 2001) — evolution legible on a human calendar, inside a",
  "leaf.",
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

// ───────────────────────────────────────────────────────────────────
// Tide-pool species (Atlantic rocky shore)
// ───────────────────────────────────────────────────────────────────

NARRATORS["fucus_serratus"] = (_scn) => [
  "Fucus serratus is the toothed wrack of the mid-intertidal zone — a",
  "brown alga whose serrated lateral margins are its diagnostic. The",
  "holdfast grips the rock with an adhesive secreted by basal cells;",
  "the thallus dichotomously branches as it grows, reaching half a",
  "metre in sheltered pools. Reproduction by oogamous gametes",
  "released into the water at high tide, fertilization in the open",
  "sea, the zygote sinking back to attach where conditions allow.",
  "",
  "What the fucus does for the pool: it photosynthesizes,",
  "incorporating dissolved CO₂ and producing the macroalgal biomass",
  "that limpets and periwinkles graze. It also provides physical",
  "shelter — the fronds drape across the rock at low tide and",
  "small invertebrates take refuge under them.",
  "",
  "The substrate of the food web, the cover for the prey, the slow",
  "engine of every other species here.",
].join(" ");

NARRATORS["semibalanus_balanoides"] = (_scn) => [
  "Semibalanus balanoides is a crustacean glued to a rock by its own",
  "back, eating with its feet. The volcano-cone calcareous test is",
  "permanent; the modified shrimp-like body inside extends its cirri —",
  "six pairs of feathered hindlimbs — through the operculum at every",
  "high tide, combing plankton from the water in a rhythmic stroke",
  "perfectly visible through a hand lens with thirty seconds of",
  "observation.",
  "",
  "Boreal-Arctic species; its lower distribution limit defines one of",
  "the most-studied biogeographic boundaries on Earth (Crisp & Southward",
  "1958). At higher latitudes Semibalanus dominates the upper mid-",
  "intertidal; at lower latitudes Chthamalus takes over. Climate shifts",
  "are pulling Semibalanus northward at a measured rate.",
  "",
  "A species whose distribution reads as a sea-temperature record",
  "written on a wall of rock.",
].join(" ");

NARRATORS["actinia_equina"] = (_scn) => [
  "Actinia equina is the crimson dome on the rock when the tide is out",
  "and the crown of one hundred and ninety-two stinging tentacles when",
  "the tide returns. The transition is purely hydraulic — the column",
  "fills with sea water and the tentacles extend; expose the anemone",
  "and the water flushes back out and the dome closes around itself.",
  "Eat by tentacle-contact: nematocysts on the tentacles inject venom,",
  "the prey is pulled to the central mouth, the prey is engulfed.",
  "",
  "The blue beads ringed around the column at the base of the tentacles",
  "(the acrorhagi, the species' eponymous beads) are weapons — when a",
  "neighbouring anemone touches Actinia's column, the acrorhagi inflate",
  "and slap against the rival's tentacles, leaving necrotic patches.",
  "The species is highly territorial; individuals at boundaries spend",
  "hours of every tidal cycle fighting.",
  "",
  "A sessile predator on the same scale as the prey it eats, fighting",
  "wars with the neighbours over centimetres of rock.",
].join(" ");

NARRATORS["patella_vulgata"] = (_scn) => [
  "Patella vulgata is the common limpet, the conical shell stuck so",
  "firmly to a rock that a knife cannot pry it off without a sideways",
  "blow first to break the muscular adhesion. Beneath",
  "the shell, a snail-like foot generates suction. Beneath the suction,",
  "an individual scar in the rock — its home scar — that exactly",
  "matches the shape of this limpet's shell base. The limpet returns",
  "to it after every grazing excursion, guided by chemical cues and",
  "its own mucus trail.",
  "",
  "It grazes biofilm + microalgae from the rock with a radula bearing",
  "almost two thousand teeth made of iron-mineralised proteins — the",
  "strongest known biological material, harder than spider silk by an",
  "order of magnitude.",
  "",
  "An animal whose teeth are stronger than its skeleton and whose",
  "skeleton is fused to the ground.",
].join(" ");

NARRATORS["carcinus_maenas"] = (_scn) => [
  "Carcinus maenas is the European shore crab — five centimetres of",
  "dark green carapace, two chelae, eight walking legs, broad salinity",
  "tolerance and the apex motile predator of every Atlantic temperate",
  "rockpool. At low tide it hides under fucus fronds or in rock",
  "crevices; at high tide it walks across the rock taking barnacles",
  "(crushed open by the chelae), limpets (pulled off the rock with",
  "leverage), anemones (torn apart), and conspecifics during",
  "post-moult vulnerability.",
  "",
  "The species has been moved by human shipping to five continents and",
  "is one of the world's hundred worst marine invasive species (IUCN).",
  "On native shores it is a keystone — its predation on barnacles +",
  "limpets keeps the algae from being overgrazed. On invaded shores",
  "it dismantles native communities at the pace of the next tide.",
  "",
  "A predator whose ecological role is identical wherever it occurs;",
  "what differs is whether its prey have evolved to recognise it.",
].join(" ");

// ───────────────────────────────────────────────────────────────────
// Freshwater-pond species
// ───────────────────────────────────────────────────────────────────

NARRATORS["dytiscus_marginalis"] = (_scn) => [
  "Dytiscus is thirty-five millimetres of brown-black beetle with a",
  "yellow elytral rim — the largest carnivorous insect of European",
  "fresh water. Adults swim by paddling both metathoracic legs in",
  "unison, the strokes synchronised like oars; the legs are fringed",
  "with hair-like setae that fan out on the backstroke and fold on",
  "the return. The beetle breathes air from a bubble trapped under",
  "the elytra and surfaces every few minutes to refresh it.",
  "",
  "Diet is whatever can be caught. Tadpoles, small fish, mosquito",
  "larvae, dragonfly larvae, occasionally other Dytiscus. The larvae",
  "of the species — known as 'water tigers' — are more frightening",
  "than the adults: long-bodied, paired forward-curving mandibles that",
  "inject paralytic digestive enzymes, then suck the liquefied prey",
  "out. A pond with breeding Dytiscus is not a pond small amphibians",
  "survive in.",
  "",
  "A predator built to make freshwater small ecosystems feel as",
  "dangerous as they are.",
].join(" ");

NARRATORS["aeshna_juncea"] = (_scn) => [
  "Aeshna juncea is the larva of one of Europe's most common hawker",
  "dragonflies. It sits in pond mud or among submerged vegetation,",
  "almost invisible, waiting. The lower lip — the labium — is a",
  "hinged folded mechanism held under the head. When prey passes",
  "within a centimetre, the labium extends faster than the prey can",
  "respond and grips it with two terminal hooks. The strike is",
  "measured in milliseconds.",
  "",
  "Two to four years of larval life depending on altitude. In a cool",
  "alpine pond, the larva is functionally the apex predator on small",
  "prey for most of its development; only Dytiscus exceeds it. At",
  "emergence the larva climbs an emergent stem, splits its larval",
  "cuticle along the dorsal midline, and emerges as the flying adult",
  "the species is named for. Twenty minutes later the wings have hardened",
  "and the dragonfly has left the pond forever.",
  "",
  "An entire functional adult animal compressed inside a different",
  "functional aquatic animal, growing for years before the second can",
  "be unfolded.",
].join(" ");

NARRATORS["culex_pipiens"] = (_scn) => [
  "Culex pipiens larvae hang head-down from the water surface,",
  "attached by a posterior breathing siphon that pierces the meniscus.",
  "Each larva filters algae and bacteria from the water column with",
  "four mandibular brushes that beat continuously, drawing a microcurrent",
  "across the mouth. A single larva processes about a millilitre of",
  "water per hour.",
  "",
  "Seven to ten days from hatching to pupation at eighteen degrees,",
  "then two more days as a comma-shaped pupa that breathes through",
  "thoracic 'trumpets' at the surface. The adult emerges, dries its",
  "wings, and flies; the female feeds on blood once to develop her eggs",
  "and then lays a raft on the same pond she emerged from.",
  "",
  "Below the surface the larvae are filter feeders; above the surface",
  "their adults are vectors of pathogens that have shaped human",
  "history. The simulator models only the larval phase, but the larval",
  "phase is what makes the rest possible.",
].join(" ");

NARRATORS["daphnia_magna"] = (_scn) => [
  "Daphnia magna is the most-studied animal in freshwater limnology —",
  "the laboratory standard for everything from toxicology to evolutionary",
  "ecology. Three millimetres long; transparent enough that the gut",
  "contents and developing embryos in the brood pouch are both visible",
  "under a hand lens; reproduces parthenogenetically by default and",
  "only switches to sexual reproduction when the pond environment",
  "deteriorates.",
  "",
  "A single founding female can establish a colony of thousands within",
  "a few weeks. In this simulator the species is modeled as a sessile",
  "patch rather than discrete agents — each Daphnia colony entry",
  "represents the swarm at a cell, and the daphnia_density field carries",
  "the prey signal that Aeshna and Dytiscus larvae forage on.",
  "",
  "A grazer of algae whose population doubling time is shorter than",
  "the time it takes any of its predators to digest a single individual.",
].join(" ");

// ───────────────────────────────────────────────────────────────────
// Bark-gallery species (Ips typographus complex)
// ───────────────────────────────────────────────────────────────────

NARRATORS["ips_typographus"] = (_scn) => [
  "Ips typographus is five millimetres of brown beetle that, in",
  "aggregate, is killing European boreal forest faster than any",
  "comparable agent on the continent. A flying female lands on a",
  "stressed Picea abies, drills the bark, and releases an aggregation",
  "pheromone. Within hours hundreds more beetles arrive, the tree's",
  "resin defense is overwhelmed, and the female excavates a maternal",
  "gallery in the inner bark. Eggs hatch in three days; larvae tunnel",
  "perpendicular to the gallery for about three weeks; new adults emerge",
  "and disperse to the next tree.",
  "",
  "The blue-stain fungus the beetle vectors is what does most of the",
  "killing. Without Ophiostoma the spruce can usually drown the",
  "attackers in resin. With it, the phloem dies in a ring around the",
  "trunk and the tree is dead before the second generation matures.",
  "",
  "Three generations per summer in warming Alpine climates — until",
  "2010, two was the maximum. The arithmetic of one extra generation",
  "across millions of hectares is what European foresters now think",
  "about full-time.",
].join(" ");

NARRATORS["thanasimus_formicarius"] = (_scn) => [
  "Thanasimus is the bark beetle's principal European predator and",
  "the species the genus Thanasimus is named after — death-bringer.",
  "Nine millimetres of red-and-black beetle that walks like an ant,",
  "moves fast, hunts adult bark beetles on the bark surface. The",
  "larva hunts bark beetle larvae inside the galleries.",
  "",
  "Both stages locate prey by eavesdropping on the Ips aggregation",
  "pheromone — the same chemical signal that lets bark beetles",
  "concentrate on a tree lets the predator find them at exactly the",
  "right moment. In low-density Ips years, Thanasimus can suppress",
  "the population significantly. In outbreak years the numerical",
  "imbalance defeats the predator.",
  "",
  "A specialist whose efficacy decreases with the abundance of its prey.",
].join(" ");

NARRATORS["coeloides_bostrichorum"] = (_scn) => [
  "Coeloides is a four-millimetre braconid wasp that locates an Ips",
  "larva through the bark by hearing it. The chewing sound carries —",
  "the wasp's pedipalps register the vibration through the outer",
  "bark, and the female stands above the spot, drives her ovipositor",
  "down through the bark and into the larval body cavity, and lays a",
  "single egg.",
  "",
  "The host larva continues feeding for about a week. Inside it, the",
  "wasp larva grows on hemolymph and fat-body without killing the host —",
  "until the wasp pupates, at which point the host dies and an adult",
  "wasp eventually emerges through the bark.",
  "",
  "Idiobionts kill on contact; koinobionts like Coeloides keep the host",
  "alive as a meat-larder. The latter strategy looks gentler. It is not.",
].join(" ");

NARRATORS["ophiostoma_bicolor"] = (_scn) => [
  "Ophiostoma is not visible to the eye on a bark beetle. The fungus",
  "travels in mycangia — specialized spore-pockets on the beetle's body —",
  "and is released when the beetle excavates the gallery. From there",
  "the hyphae spread through the phloem and ray parenchyma of the host",
  "spruce, growing radially through the living tissue, disabling the",
  "tree's defenses and incidentally producing the slate-blue staining",
  "of the sapwood the species is named for.",
  "",
  "The bark beetle without Ophiostoma cannot kill a healthy spruce. The",
  "fungus is the active component of the partnership.",
  "",
  "A mutualism in which the partner that does most of the killing is",
  "the one no one sees.",
].join(" ");

// ───────────────────────────────────────────────────────────────────
// Meadow-patch species
// ───────────────────────────────────────────────────────────────────

NARRATORS["mantis_religiosa"] = (_scn) => [
  "Mantis religiosa perches near the top of a tall-grass stand and",
  "waits. The forelegs are folded into the species' eponymous prayer",
  "position; the head rotates through forty degrees, tracking everything",
  "that moves within about eight centimetres. A butterfly visits a",
  "nearby flower — the mantis adjusts. The strike, when it comes, is",
  "thirty milliseconds end to end. Faster than the prey can react.",
  "",
  "The diet is everything that's not too big. Butterflies, honeybees,",
  "grasshoppers, smaller mantises. In about three of every ten mating",
  "encounters the female eats the male during or after copulation. The",
  "male's nutritional contribution to the eggs is non-trivial; in",
  "experiments where males are protected, female fecundity declines.",
  "",
  "One generation per year in temperate Europe — adult through summer,",
  "ootheca attached to a stem near ground level overwinter, hatch in",
  "April. The adult does not survive autumn. Forty days into adult life",
  "is the species' peak, and the rest is decline.",
].join(" ");

NARRATORS["pieris_brassicae"] = (_scn) => [
  "Pieris is one of the meadow's loudest visual signatures — fifty-",
  "millimetre white wings beating slowly through the canopy at three or",
  "four cells per day. The adult feeds on nectar across a wide range of",
  "flower species; this scenario tracks only adults, not the cabbage-",
  "eating larvae the species is more commonly cursed for.",
  "",
  "The slow flight is the species' vulnerability in a Mantis-occupied",
  "meadow. Anything that flies close to a perched mantis is in range",
  "before it knows the mantis is there. A butterfly that visits the",
  "wrong flower on the wrong stem becomes the mantis's afternoon.",
  "",
  "A pollinator whose visibility is also its risk.",
].join(" ");

NARRATORS["apis_mellifera"] = (_scn) => [
  "Apis workers from a hive several hundred metres away appear in the",
  "meadow during the warmest hours. Each worker visits a few hundred",
  "flowers per session, fills its honey stomach, returns to the hive,",
  "and is replaced by another forager. The pollination is incidental —",
  "from the bee's perspective the visit is nectar collection — but it",
  "is the mechanism by which most of the meadow's flowers set seed.",
  "",
  "Honeybees are faster than butterflies and more wary. The mantis can",
  "still take one occasionally, but the strike-to-hit ratio is lower.",
  "Worker lifespan in summer is about four weeks; modeled here as old-",
  "age departure (the worker returns to the hive and is replaced by",
  "another individual entering the niche).",
  "",
  "A pollinator whose presence in the niche is downstream of a colony",
  "that the simulator does not model.",
].join(" ");

NARRATORS["chorthippus_brunneus"] = (_scn) => [
  "Chorthippus is the most common grasshopper of European tall-grass",
  "meadows — twenty millimetres of cryptic brown-and-green sitting on a",
  "grass blade eating it, occasionally calling, occasionally leaping",
  "fifteen centimetres in a half-second flight that takes it out of",
  "the strike radius of most predators. The mantis is not most",
  "predators; the strike is too fast to outpace by reflex alone, but",
  "the grasshopper has to be detected first.",
  "",
  "Generation is annual; eggs overwinter buried in soil at the meadow's",
  "base, hatch in late spring, mature by mid-summer. Diet is leaf",
  "tissue of Festuca, Lolium, and similar grasses — the species the",
  "meadow itself is mostly made of.",
  "",
  "A herbivore eating its own habitat, slowly enough that the habitat",
  "regenerates as fast as the eating.",
].join(" ");

// ───────────────────────────────────────────────────────────────────
// Dung-pile-succession species
// ───────────────────────────────────────────────────────────────────

NARRATORS["aphodius_rufipes"] = (_scn) => [
  "Aphodius arrives within hours. The species cues on the volatile",
  "compounds of fresh dung — skatole and indole and methyl mercaptan,",
  "broadcast from a few centimetres above the substrate. The beetle",
  "lands on the crust, walks down through the upper millimetres, and",
  "begins feeding. Surface dwelling, not tunneling; the larvae develop",
  "in the substrate where the adults are eating.",
  "",
  "Generation time matches the dung pat's life. Two to three weeks",
  "from egg to adult. A single pat in a productive summer can host",
  "two generations before drying out — a hundred adults at peak.",
  "",
  "A beetle that lives at the same time scale as its substrate.",
].join(" ");

NARRATORS["geotrupes_stercorarius"] = (_scn) => [
  "Geotrupes is the larger and the slower of the two main dung beetles",
  "on a European pat. The adult is two centimetres of armoured black,",
  "the elytra dimpled and metallic blue at certain angles. The species",
  "tunnels — digs a vertical shaft beneath the dung, twenty centimetres",
  "or more, and provisions it with rolled-up dung balls inside which",
  "the larvae will develop.",
  "",
  "Per individual, Geotrupes processes ten to twenty grams of substrate",
  "daily — far more than Aphodius. The tunneling moves dung from the",
  "soil surface to underground caches where it incorporates faster into",
  "the topsoil organic matter.",
  "",
  "European pastures do not bury themselves in old dung because of this",
  "beetle and the species that share its functional role.",
].join(" ");

NARRATORS["saprinus_semistriatus"] = (_scn) => [
  "Saprinus is not a dung specialist; it's a fly-larvae specialist that",
  "exploits the predictable concentration of fly larvae in fresh dung.",
  "The adult arrives a day or two behind Aphodius, drops to the dung",
  "interior, and works the larval-rich zones with mandibles built for",
  "soft-bodied prey.",
  "",
  "Elytra are metallic green-bronze; the species is named for the half-",
  "striations on each. When disturbed it tucks legs and antennae and",
  "drops — the 'clown' of the common name — which is enough to slip",
  "past most reflexive predators.",
  "",
  "A beetle in the wrong family to count as a true dung specialist, in",
  "the right place to depend entirely on dung specialists' arrivals.",
].join(" ");

// ───────────────────────────────────────────────────────────────────
// Carrion-succession species
// ───────────────────────────────────────────────────────────────────

NARRATORS["calliphora_vicina"] = (_scn) => [
  "Calliphora is the species that finds the carcass first. A female",
  "blowfly arrives within hours of death, drawn by volatiles too",
  "specific for most other insects to read, and lays two to three",
  "hundred eggs at the moist crevices around the mouth and eyes.",
  "Twelve hours later the maggots are feeding; another week and they",
  "have processed half the soft tissue.",
  "",
  "The maggot mass is its own microclimate. Aggregated feeding raises",
  "local temperature by ten or fifteen degrees over ambient — enough",
  "to keep larval development on schedule even in cool weather. The",
  "species cannot survive outside the maggot mass at temperate latitudes.",
  "",
  "A self-heating biochemical reactor the species cannot survive outside",
  "of, built and dismantled inward from its own surface in two weeks,",
  "then a generation of pupae buried in the soil beneath.",
].join(" ");

NARRATORS["necrodes_littoralis"] = (_scn) => [
  "Necrodes arrives during the bloat stage and stays through active",
  "decay — five to twenty-five days post-mortem at temperate summer",
  "temperatures. The adult is a two-centimetre matte-black beetle with",
  "diagnostic orange-red elytral tips. It eats soft tissue directly and",
  "actively hunts fly larvae, taking dozens per day from a thriving",
  "maggot mass.",
  "",
  "Mixed feeding is the species' niche. Pure necrophages depend on the",
  "substrate; pure predators depend on the prey. Necrodes can support",
  "itself on either, which means it persists across the transition",
  "from fresh to advanced decay that breaks more specialized successors.",
  "",
  "The carrion beetle is a forensic marker of post-mortem interval —",
  "if it's present, the body has been here at least five days.",
].join(" ");

NARRATORS["dermestes_lardarius"] = (_scn) => [
  "Dermestes is the late-stage specialist. By the time it arrives —",
  "roughly post-mortem day twenty — the easy substrate is gone:",
  "soft tissue has been mostly consumed or mineralized, and what",
  "remains is keratin, chitin, hair, and dried hide. These are",
  "indigestible to most insects. Dermestes evolved the gut enzymes to",
  "process them.",
  "",
  "The larvae bore through skin from the underside, leaving small",
  "round exit holes; the adults work the surface. Both stages eat",
  "the same substrate. Generation time is long for a beetle — six",
  "months — and the carcass remains habitable for them until skeletal",
  "material is all that's left.",
  "",
  "A beetle that arrives when the buffet has cleared and the only",
  "guests still feeding are the ones with the right enzymes.",
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
