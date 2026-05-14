// ============================================================
// js/00-species-spec.ts — SPECIES_SPEC fallback + onSpecReady
// ============================================================
// The species catalog data model. One entry per species (sessile or motile).
//
// The spec covers BOTH layers of the bug-simulator architecture:
//   • Sessile organisms — fungi, mosses, lichens, algae, sessile larvae.
//     These nucleate in cells and grow with vugg-style mechanics. Fields:
//     growth_form, color, body_size_mm (the mature colony's extent),
//     guild = "sessile_decomposer" | "sessile_autotroph" | "sessile_filter".
//   • Motile bugs — arthropods, mostly. Have agent fields in addition to
//     the sessile-base: movement_speed_per_day_cm, perception_radius_cm,
//     diet (array of food tokens: substrate types, species names, guild
//     tokens), predators (array — what eats this species), life_stages
//     (egg / larva / pupa / adult, each with overrides for diet/range).
//
// Both layers share: id, common_name, latin_name, evidence_level,
// citations, color, body_size_mm. The "motile" boolean discriminates.
//
// SCRIPT-mode TS (no import/export); top-level decls are globals.

// The catalog is loaded at runtime from data/species.json. If the fetch
// fails (file:// + no server, tests with no fetch mock, etc.), the
// inline SPECIES_SPEC_FALLBACK below keeps the bundle bootable.
const SPECIES_SPEC_FALLBACK: any = {};

let SPECIES_SPEC: any = SPECIES_SPEC_FALLBACK;
let _specReadyPromise: Promise<any> | null = null;
const _specReadyCallbacks: Array<(spec: any) => void> = [];

function onSpecReady(cb: (spec: any) => void): void {
  if (_specReadyPromise === null) {
    cb(SPECIES_SPEC);
    return;
  }
  _specReadyCallbacks.push(cb);
}

async function _loadSpeciesJSON(): Promise<void> {
  try {
    const resp = await fetch('./data/species.json');
    if (!resp.ok) return;
    const txt = await resp.text();
    const parsed = JSON.parse(txt);
    SPECIES_SPEC = parsed;
    for (const cb of _specReadyCallbacks) cb(SPECIES_SPEC);
    _specReadyCallbacks.length = 0;
  } catch {
    // Stay on fallback. Not fatal — the engine can run with an empty
    // catalog; tests do this regularly.
  } finally {
    _specReadyPromise = null;
  }
}

// Kick off the fetch on bundle load. Top-level `await` is unavailable
// in SCRIPT-mode TS, so we let the Promise float; consumers gate via
// onSpecReady(cb).
_specReadyPromise = _loadSpeciesJSON();
