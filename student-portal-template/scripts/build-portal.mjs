/**
 * Builds the CEC portal (../clients) into .portal/.
 *
 * Why: 5173 holds a single dev server, but the landing page and the dashboard
 * have to share one origin — that is what lets the sign-in popover's session be
 * picked up by the template, and what lets signing out land the student on a
 * real page. So the template's dev server serves the landing page too, from this
 * copy. See the `cec-portal-copy` plugin in vite.config.ts.
 *
 *   node scripts/build-portal.mjs            skips the build when already fresh
 *   node scripts/build-portal.mjs --force    always rebuild
 *   node scripts/build-portal.mjs --soft     never fail the caller (npm predev)
 *
 * The build is staged in a temp directory and copied into place afterwards:
 * building straight into .portal can trip a Windows file lock on the portal's
 * public assets while the portal's own dev server is running.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url)); // scripts/
const TEMPLATE_ROOT = path.resolve(HERE, '..');
const REPO_ROOT = path.resolve(TEMPLATE_ROOT, '..');
const CLIENTS = path.join(REPO_ROOT, 'clients');
const OUT = path.join(TEMPLATE_ROOT, '.portal');

const force = process.argv.includes('--force');
const soft = process.argv.includes('--soft');

/** Newest modification time under a path, ignoring build output and deps. */
function newestMtime(target) {
  let newest = 0;
  const stack = [target];
  while (stack.length) {
    const current = stack.pop();
    let stats;
    try {
      stats = fs.statSync(current);
    } catch {
      continue; // optional file (e.g. .env.local) that is not there
    }
    if (stats.isDirectory()) {
      const name = path.basename(current);
      if (name === 'node_modules' || name === 'dist') continue;
      for (const entry of fs.readdirSync(current)) stack.push(path.join(current, entry));
    } else if (stats.mtimeMs > newest) {
      newest = stats.mtimeMs;
    }
  }
  return newest;
}

function fail(message) {
  console.error(`[portal] ${message}`);
  if (soft) {
    console.warn('[portal] keeping the previous copy — the template still runs');
    process.exit(0);
  }
  process.exit(1);
}

const SOURCES = ['src', 'public', 'index.html', 'vite.config.ts', 'package.json', '.env', '.env.local', '.env.production']
  .map((entry) => path.join(CLIENTS, entry));

const builtIndex = path.join(OUT, 'index.html');
const fresh =
  fs.existsSync(builtIndex) &&
  Math.max(...SOURCES.map(newestMtime)) <= fs.statSync(builtIndex).mtimeMs;

if (!force && fresh) {
  console.log('[portal] landing page copy is up to date');
  process.exit(0);
}

// The portal's build script runs tsc first, which would block on unrelated type
// errors; the dev copy only needs to render, so build the bundle directly.
const viteBin = path.join(CLIENTS, 'node_modules', 'vite', 'bin', 'vite.js');
if (!fs.existsSync(viteBin)) {
  fail('vite is not installed in clients/ — run "npm install" there first');
}

const staging = path.join(os.tmpdir(), 'opencode', 'cec-portal-dev');
console.log('[portal] building the CEC portal for 5173…');
fs.rmSync(staging, { recursive: true, force: true });

// This is a production-mode build, so clients/.env.production (the live API
// address) would otherwise be baked into the dev copy. Force the relative value
// that the 5173 dev server proxies to 127.0.0.1:4000, so local work never talks
// to the deployed API or falls foul of its CORS allow-list.
const result = spawnSync(
  process.execPath,
  [viteBin, 'build', '--outDir', staging, '--emptyOutDir', '--logLevel', 'warn'],
  { cwd: CLIENTS, stdio: 'inherit', env: { ...process.env, VITE_API_URL: '/api' } },
);
if (result.status !== 0) fail(`the portal build failed (exit ${result.status ?? 'unknown'})`);

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(staging, OUT, { recursive: true });
console.log(`[portal] ready — http://localhost:5173/cec-school-portal-1/`);
