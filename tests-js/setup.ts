// tests-js/setup.ts — load the bug-simulator JS bundle into the jsdom
// global scope so tests can drive BugSimulator deterministically.
//
// Minimal port of vugg-simulator's setup harness. v0.1.0 has no
// scenarios to load and no narratives to fetch, so the fetch-wait
// dance is dropped — we just stub fetch, eval the dist bundle, and
// expose the engine classes to the test scope.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

function walkDistSorted(): string[] {
  const out: string[] = [];
  const stack: string[] = [DIST];
  while (stack.length) {
    const d = stack.pop()!;
    let entries: string[];
    try {
      entries = fs.readdirSync(d).sort();
    } catch {
      continue;
    }
    for (const name of entries) {
      if (name.startsWith('.')) continue;
      const p = path.join(d, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) stack.push(p);
      else if (name.endsWith('.js')) out.push(p);
    }
  }
  return out.sort((a, b) =>
    path.relative(DIST, a).split(path.sep).join('/').localeCompare(
      path.relative(DIST, b).split(path.sep).join('/'),
    ),
  );
}

function installFetchMock() {
  (globalThis as any).fetch = async (url: string) => {
    const u = String(url);
    let rel = u;
    if (rel.startsWith('./')) rel = rel.slice(2);
    else if (rel.startsWith('../')) rel = rel.slice(3);
    else if (rel.startsWith('/')) rel = rel.slice(1);
    else if (rel.startsWith('http')) {
      return new Response('', { status: 404 });
    }
    const filePath = path.join(ROOT, rel);
    try {
      const buf = fs.readFileSync(filePath, 'utf8');
      return new Response(buf, { status: 200, headers: { 'content-type': 'text/plain' } });
    } catch {
      return new Response('', { status: 404 });
    }
  };
}

const EXPORTS = [
  'BUG_SIM_VERSION',
  'SPECIES_SPEC',
  'SCENARIOS',
  'NICHE_SUBSTRATES',
  'NICHE_BUILDERS',
  'SESSILE_ENGINES',
  'AGENT_TICKERS',
  'SeededRandom',
  'ResourceProfile',
  'NicheCell',
  'NicheState',
  'GrowthZone',
  'SessileOrganism',
  'Agent',
  'TrophicGraph',
  'BugSimulator',
  'rng',
  'setSeed',
];

let _bundleLoaded = false;

function loadBundle() {
  if (_bundleLoaded) return;
  installFetchMock();
  const files = walkDistSorted();
  if (!files.length) {
    throw new Error(
      `[setup] dist/ is empty — run \`npx tsc -p tsconfig.json\` (or \`npm run build\`) before \`npm test\``,
    );
  }
  const concatenated = files
    .map(f => fs.readFileSync(f, 'utf8'))
    .join('\n\n');
  const epilogue = `
    function setSeed(seed) {
      rng = new SeededRandom(seed | 0);
    }
  `;
  const exportObject =
    '{' +
    EXPORTS.map(n => `${n}: typeof ${n} !== 'undefined' ? ${n} : undefined`).join(', ') +
    '}';
  const body = `${concatenated}\n${epilogue}\n;return ${exportObject};`;
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const fn = new Function(body);
  const exports = fn();
  for (const name of EXPORTS) {
    if (exports[name] !== undefined) {
      (globalThis as any)[name] = exports[name];
    }
  }
  _bundleLoaded = true;
}

beforeAll(() => {
  loadBundle();
});
