#!/usr/bin/env node
/**
 * web-inspect start orchestrator.
 *
 * Config resolution order (highest wins):
 *   1. CLI flags: --page <html> (repeatable) + --dev-url <url>
 *   2. <skillDir>/web-inspect.config.json  (written on first successful flag-driven run)
 *   3. Auto-detect (scans project root + package.json)
 *
 * If detection succeeds for all fields, boots silently with no files written.
 * If any field can't be resolved, emits { ok: false, error: "needs_user_input", missing, detected }
 * so the agent can ask the user once and re-invoke with --page / --dev-url flags.
 * On a flag-driven successful run the config is persisted to <skillDir>/web-inspect.config.json
 * so subsequent invocations are silent.
 *
 * Usage:
 *   node start.mjs                                    # boot (auto-detect)
 *   node start.mjs --page index.html --dev-url <url>  # boot (explicit)
 *   node start.mjs stop                               # stop server + restore HTML files
 *   node start.mjs set-dev-url <url>                  # write devUrl into skill-dir config
 *   node start.mjs --help
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.dirname(__dirname); // scripts/ is one level inside the skill dir
const PROJECT_ROOT = process.cwd();
const PID_FILE = path.join(SKILL_DIR, '.runtime', 'state.json');
const CONFIG_FILE = path.join(SKILL_DIR, 'web-inspect.config.json');

const SCAN_ROOTS = ['public', 'src', 'app', 'pages'];
const VITE_DEFAULT_PORT = 5173;
const NEXT_DEFAULT_PORT = 3000;
const ASTRO_DEFAULT_PORT = 4321;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runScript(name, args = []) {
  const scriptPath = path.join(__dirname, name);
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    encoding: 'utf-8',
    cwd: PROJECT_ROOT,
    timeout: 20_000,
  });
  return result.stdout || result.stderr || '';
}

function safeParse(out) {
  const line = String(out).trim().split('\n').filter(Boolean).pop() || '';
  try { return JSON.parse(line); } catch { return null; }
}

function readPidFile() {
  if (!fs.existsSync(PID_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(PID_FILE, 'utf-8')); } catch { return null; }
}

function isAlive(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function readConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')); } catch { return null; }
}

function writeConfig(cfg) {
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2) + '\n');
}

// ---------------------------------------------------------------------------
// Auto-detect
// ---------------------------------------------------------------------------

function detectPageFiles() {
  const candidates = [
    'index.html',
    'public/index.html',
    'app/index.html',
    'pages/index.html',
  ];
  for (const rel of candidates) {
    const abs = path.resolve(PROJECT_ROOT, rel);
    if (fs.existsSync(abs)) return { value: [rel], source: 'auto' };
  }
  // Single html in project root?
  let entries;
  try { entries = fs.readdirSync(PROJECT_ROOT, { withFileTypes: true }); } catch { return null; }
  const htmlFiles = entries.filter((e) =>
    e.isFile() && /\.(html|htm)$/i.test(e.name) && !['node_modules', 'dist', 'build'].includes(e.name)
  );
  if (htmlFiles.length === 1) return { value: [htmlFiles[0].name], source: 'auto' };
  return null;
}

function detectDevUrl() {
  const pkgPath = path.join(PROJECT_ROOT, 'package.json');
  if (!fs.existsSync(pkgPath)) return null;
  let pkg;
  try { pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')); } catch { return null; }
  const scripts = pkg.scripts || {};
  for (const key of ['dev', 'start', 'serve']) {
    const s = scripts[key];
    if (!s) continue;
    // Look for explicit --port flag
    const m = s.match(/--port[= ](\d+)/);
    if (m) return { value: `http://localhost:${m[1]}`, source: 'auto' };
    // Recognise framework defaults
    if (/\bvite\b/.test(s)) return { value: `http://localhost:${VITE_DEFAULT_PORT}`, source: 'guess' };
    if (/\bnext\b/.test(s)) return { value: `http://localhost:${NEXT_DEFAULT_PORT}`, source: 'guess' };
    if (/\bastro\b/.test(s)) return { value: `http://localhost:${ASTRO_DEFAULT_PORT}`, source: 'guess' };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Config resolution
// ---------------------------------------------------------------------------

function parseFlags(argv) {
  const flags = { pageFiles: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--page') flags.pageFiles.push(argv[++i]);
    else if (a === '--dev-url') flags.devUrl = argv[++i];
  }
  return flags;
}

function resolveConfig(flags) {
  const saved = readConfig();

  // pageFiles: flag → saved config → auto-detect
  let pageFilesSource = 'flag';
  let pageFiles = flags.pageFiles.length > 0 ? flags.pageFiles : null;
  if (!pageFiles && saved && Array.isArray(saved.pageFiles) && saved.pageFiles.length) {
    pageFiles = saved.pageFiles;
    pageFilesSource = 'file';
  }
  if (!pageFiles) {
    const detected = detectPageFiles();
    if (detected) { pageFiles = detected.value; pageFilesSource = detected.source; }
  }

  // devUrl: flag → saved config → auto-detect
  let devUrlSource = 'flag';
  let devUrl = flags.devUrl || null;
  if (!devUrl && saved && saved.devUrl) {
    devUrl = saved.devUrl;
    devUrlSource = 'file';
  }
  if (!devUrl) {
    const detected = detectDevUrl();
    if (detected) { devUrl = detected.value; devUrlSource = detected.source; }
  }

  const scanRoots = (saved && saved.scanRoots) || SCAN_ROOTS;

  return {
    pageFiles,
    devUrl,
    scanRoots,
    source: { pageFiles: pageFilesSource, devUrl: devUrlSource },
    anyFromFlag: flags.pageFiles.length > 0 || !!flags.devUrl,
  };
}

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------

async function ensureServer() {
  const existing = readPidFile();
  if (existing && isAlive(existing.pid)) return { ok: true, ...existing };

  const out = runScript('server.mjs', ['--background']);
  const parsed = safeParse(out);
  if (!parsed || !parsed.ok) {
    return { ok: false, error: 'server_start_failed', detail: out };
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function startCmd(flags) {
  const resolved = resolveConfig(flags);

  // Collect missing required fields
  const missing = [];
  if (!resolved.pageFiles) missing.push('pageFiles');
  if (!resolved.devUrl) missing.push('devUrl');

  if (missing.length > 0) {
    process.stdout.write(JSON.stringify({
      ok: false,
      error: 'needs_user_input',
      missing,
      detected: { pageFiles: resolved.pageFiles || null, devUrl: resolved.devUrl || null },
      hint: 'Re-run with --dev-url <url>' + (missing.includes('pageFiles') ? ' and --page <html>' : '') + '.',
    }) + '\n');
    process.exit(0);
  }

  // Warn (but don't block) on guessed devUrl so the agent can confirm with the user.
  const guessedDevUrl = resolved.source.devUrl === 'guess';

  // Ensure server is running.
  const serverInfo = await ensureServer();
  if (!serverInfo || !serverInfo.ok) {
    process.stdout.write(JSON.stringify(serverInfo || { ok: false, error: 'server_start_failed' }) + '\n');
    process.exit(1);
  }

  // Inject overlay tag.
  const injectArgs = ['--port', String(serverInfo.port), '--token', serverInfo.token,
    '--dev-url', resolved.devUrl];
  for (const p of resolved.pageFiles) injectArgs.push('--page', p);
  const injectOut = runScript('inject.mjs', injectArgs);
  const injectResult = safeParse(injectOut);
  if (!injectResult || !injectResult.ok) {
    process.stdout.write(JSON.stringify({
      ok: false,
      error: 'inject_failed',
      detail: injectResult || injectOut,
      port: serverInfo.port,
    }) + '\n');
    process.exit(1);
  }

  // Persist config if any value came from a CLI flag (first-run save).
  if (resolved.anyFromFlag) {
    writeConfig({ pageFiles: resolved.pageFiles, devUrl: resolved.devUrl, scanRoots: resolved.scanRoots });
  }

  // Emit final JSON.
  process.stdout.write(JSON.stringify({
    ok: true,
    port: serverInfo.port,
    token: serverInfo.token,
    sessionId: serverInfo.sessionId,
    devUrl: resolved.devUrl,
    ...(guessedDevUrl ? { devUrlGuessed: true } : {}),
    pageFiles: resolved.pageFiles,
    injected: injectResult.injected,
  }, null, 2) + '\n');
}

async function stopCmd() {
  const serverOut = runScript('server.mjs', ['stop']);
  const restoreOut = runScript('inject.mjs', ['--restore']);
  process.stdout.write(JSON.stringify({
    ok: true,
    server: safeParse(serverOut) || { raw: serverOut.trim() },
    restore: safeParse(restoreOut) || { raw: restoreOut.trim() },
  }, null, 2) + '\n');
}

function setDevUrlCmd(url) {
  if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    process.stdout.write(JSON.stringify({ ok: false, error: 'invalid_url' }) + '\n');
    process.exit(1);
  }
  const cfg = readConfig() || { pageFiles: ['index.html'], scanRoots: SCAN_ROOTS };
  cfg.devUrl = url;
  writeConfig(cfg);
  process.stdout.write(JSON.stringify({ ok: true, devUrl: url, configPath: CONFIG_FILE }) + '\n');
}

function help() {
  process.stdout.write([
    'web-inspect',
    '',
    'Commands:',
    '  node start.mjs                                   boot helper + inject overlay; print JSON',
    '  node start.mjs --page <html> --dev-url <url>     boot with explicit config (saves for next run)',
    '  node start.mjs stop                              stop helper + restore HTML files',
    '  node start.mjs set-dev-url <url>                 write devUrl into skill-dir config',
    '',
    'Config file: <skillDir>/web-inspect.config.json  (auto-created; gitignored)',
    'Runtime dir: <skillDir>/.runtime/                (PID + screenshots; gitignored)',
    '',
  ].join('\n'));
}

const rawArgs = process.argv.slice(2);
const flags = parseFlags(rawArgs);

if (rawArgs.includes('--help') || rawArgs.includes('-h')) { help(); process.exit(0); }
if (rawArgs[0] === 'stop') { stopCmd(); }
else if (rawArgs[0] === 'set-dev-url') { setDevUrlCmd(rawArgs[1]); }
else { startCmd(flags); }
