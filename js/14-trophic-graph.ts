// ============================================================
// js/14-trophic-graph.ts — predator-prey + diet graph
// ============================================================
// The trophic graph is the bug-simulator analog of vugg-simulator's
// paragenesis lattice. Where vugg's lattice declares which mineral
// can grow on which other mineral, the trophic graph declares which
// species can eat which other species (or substrate, or sessile
// organism).
//
// Two layers:
//   1. Agent → Agent edges: "Lithobius forficatus eats Ceratophysella denticulata."
//   2. Agent → Substrate / Sessile edges: "Ceratophysella eats fungal_biomass."
//
// Both are stored as directed adjacency lists keyed by the eater's
// species id. The graph is built once at simulator init from each
// species' SPECIES_SPEC.diet field, then queried per-tick by Agent
// behavior functions.
//
// SCRIPT-mode TS.

class TrophicGraph {
  // Eater species id -> list of food tokens. Tokens can be:
  //   • Another species id (predation / mycophagy on a specific species)
  //   • A guild token ("any_fungivore", "any_detritivore")
  //   • A substrate / resource token ("wood_biomass_g", "fungal_biomass_g")
  diet: Record<string, string[]> = {};

  // Eater species id -> list of predator species ids. Inverse of `diet`
  // restricted to agent-on-agent edges. Used by prey-flee behavior.
  predators: Record<string, string[]> = {};

  rebuild(spec: any): void {
    this.diet = {};
    this.predators = {};
    for (const id of Object.keys(spec || {})) {
      const entry = spec[id];
      const dietList: string[] = Array.isArray(entry?.diet) ? entry.diet : [];
      this.diet[id] = dietList.slice();
      for (const token of dietList) {
        // If the token is itself a known species id, register the
        // inverse edge so prey can find their predators.
        if (spec[token]) {
          if (!this.predators[token]) this.predators[token] = [];
          this.predators[token].push(id);
        }
      }
    }
  }

  eats(eaterSpecies: string, foodToken: string): boolean {
    return (this.diet[eaterSpecies] || []).includes(foodToken);
  }

  predatorsOf(preySpecies: string): string[] {
    return this.predators[preySpecies] || [];
  }
}
