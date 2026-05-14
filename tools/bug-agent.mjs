#!/usr/bin/env node
/**
 * tools/bug-agent.mjs — headless bug-simulator runner.
 *
 * Loads the dist/ bundle (the same one tests use), instantiates a
 * BugSimulator against a scenario, advances N days, and prints a
 * day-by-day population table plus a final assemblage summary.
 *
 * This is the bug-simulator analog of vugg-simulator's
 * `agent-api/vugg-agent.js`. Use it for:
 *   • verifying a scenario without opening a browser
 *   • sweeping seeds to characterize stochasticity
 *   • tuning colonization / breeding parameters and seeing the effect
 *     on the population trajectory
 *
 * Usage:
 *   node tools/bug-agent.mjs                              # defaults
 *   node tools/bug-agent.mjs --scenario X --seed S --days D
 *   node tools/bug-agent.mjs --csv                        # CSV output
 *   node tools/bug-agent.mjs --events                     # dump events
 *   node tools/bug-agent.mjs --sweep "42,7,1,2026"        # multi-seed
 *
 * Builds the bundle on-demand if dist/ is empty.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { JSDOM } from "jsdom";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST = join(ROOT, "dist");

// ──── arg parsing ────

const argv = process.argv.slice(2);
function arg(name, dflt) {
  const i = argv.indexOf("--" + name);
  if (i < 0) return dflt;
  return argv[i + 1];
}
function flag(name) { return argv.includes("--" + name); }

const SCENARIO = arg("scenario", "bialowieza_beech_log_y5");
const DAYS = parseInt(arg("days", "120"), 10);
const SEEDS = (arg("sweep", arg("seed", "42")) + "")
  .split(",")
  .map(s => parseInt(s.trim(), 10))
  .filter(s => Number.isFinite(s));
const FORMAT_CSV = flag("csv");
const DUMP_EVENTS = flag("events");
const QUIET = flag("quiet");

// ──── dist availability ────

function distHasFiles() {
  if (!existsSync(DIST)) return false;
  return walkDistSorted().length > 0;
}

function ensureBuilt() {
  if (distHasFiles()) return;
  console.error("[bug-agent] dist/ is empty — running `npm run build` first…");
  const r = spawnSync(process.execPath,
    [join(ROOT, "node_modules", "typescript", "bin", "tsc"), "-p", "tsconfig.json"],
    { cwd: ROOT, stdio: "inherit" });
  if (r.status !== 0 && r.status !== null) {
    // tsc emits even with type errors; ignore non-zero.
  }
  if (!distHasFiles()) {
    console.error("[bug-agent] tsc produced no files in dist/. Bailing.");
    process.exit(1);
  }
}

function walkDistSorted() {
  const out = [];
  const stack = [DIST];
  while (stack.length) {
    const d = stack.pop();
    let entries;
    try { entries = readdirSync(d).sort(); } catch { continue; }
    for (const name of entries) {
      if (name.startsWith(".")) continue;
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) stack.push(p);
      else if (name.endsWith(".js")) out.push(p);
    }
  }
  return out.sort((a, b) =>
    relative(DIST, a).split(sep).join("/").localeCompare(
      relative(DIST, b).split(sep).join("/"))
  );
}

// ──── jsdom + bundle eval ────

function loadBundle() {
  ensureBuilt();
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });
  const { window } = dom;

  // Bundle uses fetch / document / setTimeout. Use jsdom's document
  // (so the UI module's document.getElementById doesn't throw) and
  // Node's native timers (jsdom's .bind() shim deep-recurses).
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.Response = window.Response;
  globalThis.fetch = async (url) => {
    let rel = String(url);
    if (rel.startsWith("./")) rel = rel.slice(2);
    else if (rel.startsWith("../")) rel = rel.slice(3);
    else if (rel.startsWith("/")) rel = rel.slice(1);
    else if (rel.startsWith("http")) {
      return { ok: false, status: 404, text: async () => "" };
    }
    try {
      const buf = readFileSync(join(ROOT, rel), "utf8");
      return { ok: true, status: 200, text: async () => buf };
    } catch {
      return { ok: false, status: 404, text: async () => "" };
    }
  };

  const files = walkDistSorted();
  const concatenated = files.map(f => readFileSync(f, "utf8")).join("\n\n");
  const epilogue = `
    return {
      BUG_SIM_VERSION: typeof BUG_SIM_VERSION !== 'undefined' ? BUG_SIM_VERSION : null,
      SPECIES_SPEC: typeof SPECIES_SPEC !== 'undefined' ? SPECIES_SPEC : null,
      SCENARIOS: typeof SCENARIOS !== 'undefined' ? SCENARIOS : null,
      NICHE_SUBSTRATES: typeof NICHE_SUBSTRATES !== 'undefined' ? NICHE_SUBSTRATES : null,
      BugSimulator: typeof BugSimulator !== 'undefined' ? BugSimulator : null,
    };
  `;
  // eslint-disable-next-line no-new-func
  const runner = new Function(concatenated + "\n" + epilogue);
  const exports = runner();
  return { window, exports };
}

async function waitForData(exports, timeoutMs = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const specReady = exports.SPECIES_SPEC && Object.keys(exports.SPECIES_SPEC).length > 1;
    const scnReady = exports.SCENARIOS && Object.keys(exports.SCENARIOS).length > 0;
    const subReady = exports.NICHE_SUBSTRATES && exports.NICHE_SUBSTRATES.sapwood;
    if (specReady && scnReady && subReady) return;
    await new Promise(r => setTimeout(r, 25));
  }
  throw new Error("Data files never loaded — check fetch stub paths.");
}

// ──── reporting ────

const SPECIES_SHORT = {
  trametes_versicolor: "trametes",
  ceratophysella_denticulata: "springtail",
  glomeris_marginata: "millipede",
  oniscus_asellus: "woodlouse",
  neobisium_muscorum: "pseudoscorpion",
  lithobius_forficatus: "centipede",
};

function snapshot(sim) {
  const alive_adult = {};
  const alive_egg = {};
  for (const a of sim.agents) {
    if (!a.alive) continue;
    const s = a.species;
    if (a.life_stage === "egg") alive_egg[s] = (alive_egg[s] || 0) + 1;
    else                         alive_adult[s] = (alive_adult[s] || 0) + 1;
  }
  for (const o of sim.sessile) {
    if (o.vigor > 0) alive_adult[o.species] = (alive_adult[o.species] || 0) + 1;
  }
  return { alive_adult, alive_egg };
}

function pad(n, w = 4) {
  return String(n).padStart(w);
}

function printTextTable(rows, header) {
  console.log(header);
  console.log("─".repeat(header.length));
  for (const r of rows) console.log(r);
}

async function runOne(seed) {
  const { window, exports } = loadBundle();
  await waitForData(exports);
  const sim = new exports.BugSimulator({ scenario_id: SCENARIO, seed });
  const snapshots = [];
  // Sample every 10 days for the text table; full history is in sim.history.
  const sampleEvery = Math.max(1, Math.floor(DAYS / 12));
  for (let d = 1; d <= DAYS; d++) {
    sim.run_step();
    if (d % sampleEvery === 0 || d === DAYS) {
      snapshots.push({ day: d, ...snapshot(sim) });
    }
  }
  return { seed, sim, snapshots, exports };
}

function printTextReport(result) {
  const { seed, sim, snapshots, exports } = result;
  console.log("");
  console.log(`bug-simulator ${exports.BUG_SIM_VERSION} — scenario "${SCENARIO}", seed ${seed}`);
  console.log(`niche: ${sim.scenario?.locality ?? "(no locality)"}`);
  console.log("");
  // Detect every species that appeared in any snapshot. Print one
  // column per species in spec-declared order so the table is stable.
  const allSpecies = new Set();
  for (const s of snapshots) {
    for (const k of Object.keys(s.alive_adult)) allSpecies.add(k);
  }
  const order = Object.keys(exports.SPECIES_SPEC)
    .filter(k => allSpecies.has(k) && k !== "_meta");
  const W = 10;
  const shortName = (id) => (SPECIES_SHORT[id] ?? id.split("_")[0]).padStart(W);
  const headerCols = [" day".padEnd(5)]
    .concat(order.map(shortName))
    .concat(["eggs".padStart(W)]);
  const header = "  " + headerCols.join(" | ");
  const rows = snapshots.map(s => {
    const a = s.alive_adult, e = s.alive_egg;
    const eg = Object.values(e).reduce((x, y) => x + y, 0);
    const cells = [pad(s.day, 4)]
      .concat(order.map(sp => pad(a[sp] ?? 0, W)))
      .concat([pad(eg, W)]);
    return "  " + cells.join(" | ");
  });
  printTextTable(rows, header);
  // Summary
  console.log("");
  const last = snapshots[snapshots.length - 1];
  const finalAdult = Object.values(last.alive_adult).reduce((a, b) => a + b, 0);
  const finalEgg   = Object.values(last.alive_egg).reduce((a, b) => a + b, 0);
  console.log(`final at day ${last.day}: ${finalAdult} adult + ${finalEgg} egg, ${sim.events.length} events`);

  if (DUMP_EVENTS) {
    console.log("");
    console.log("events (chronological):");
    for (const ev of sim.events) {
      const sp = SPECIES_SHORT[ev.species] ?? ev.species;
      let extra = "";
      if (ev.kind === "died") extra = ` (${ev.cause}${ev.killer_species ? ` by ${SPECIES_SHORT[ev.killer_species] ?? ev.killer_species}` : ""})`;
      if (ev.kind === "matured") extra = ` -> ${ev.stage_to}`;
      console.log(`  d${pad(ev.step, 3)}  ${ev.kind.padEnd(11)} ${sp}${extra}`);
    }
  }
}

function printCSV(results) {
  // Per-day, per-seed, per-species count. Wide format: one column per
  // species per seed.
  const header = ["day", "seed", "trametes", "springtail", "millipede", "centipede", "eggs"];
  console.log(header.join(","));
  for (const result of results) {
    for (const s of result.snapshots) {
      const a = s.alive_adult, e = s.alive_egg;
      const row = [
        s.day,
        result.seed,
        a.trametes_versicolor ?? 0,
        a.ceratophysella_denticulata ?? 0,
        a.glomeris_marginata ?? 0,
        a.lithobius_forficatus ?? 0,
        Object.values(e).reduce((x, y) => x + y, 0),
      ];
      console.log(row.join(","));
    }
  }
}

// ──── main ────

const results = [];
for (const seed of SEEDS) {
  results.push(await runOne(seed));
}

if (FORMAT_CSV) {
  printCSV(results);
} else if (!QUIET) {
  for (const r of results) printTextReport(r);
}
