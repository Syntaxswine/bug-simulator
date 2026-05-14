#!/usr/bin/env node
/**
 * tools/build-all.mjs — `tsc -p tsconfig.json` followed by `tools/build.mjs`,
 * with type errors treated as informational (not build-blocking).
 *
 * Ported verbatim from vugg-simulator. Same rationale: the bundle still
 * ships when types regress; `npm run typecheck` is the CI guard that
 * exits non-zero on errors.
 *
 * Pass --check to forward to tools/build.mjs (CI guard for stale index.html).
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const TSC_ENTRY = join(ROOT, "node_modules", "typescript", "bin", "tsc");

console.log("[build-all] running tsc…");
const tsc = spawnSync(process.execPath, [TSC_ENTRY, "-p", "tsconfig.json"], {
  cwd: ROOT,
  stdio: "inherit",
});
if (tsc.status !== 0) {
  console.warn(
    `[build-all] tsc reported errors (exit ${tsc.status}) — continuing anyway. Fix them iteratively.`
  );
}

console.log("[build-all] running tools/build.mjs…");
const args = ["tools/build.mjs", ...process.argv.slice(2)];
const splice = spawnSync(process.execPath, args, {
  cwd: ROOT,
  stdio: "inherit",
});
process.exit(splice.status ?? 1);
