#!/usr/bin/env node
/**
 * Inject the web-inspect overlay <script> tag into the project's HTML entries.
 *
 * Config is resolved in this order (highest wins):
 *   1. CLI flags: --page <html> (repeatable) + --dev-url <url>
 *   2. <skillDir>/web-inspect.config.json
 *
 * Usage:
 *   node inject.mjs --check                                   # validate config + resolve files; print JSON
 *   node inject.mjs --port <port> --token <tok>               # inject (reads config from file)
 *   node inject.mjs --port <p> --token <t> --page a.html      # inject with inline pageFiles
 *   node inject.mjs --restore                                 # remove the overlay tag from all known / scanned files
 *
 * Injection markers (so we can find + remove our tag later, even after edits):
 *   <!-- web-inspect:start -->
 *   <script src="http://127.0.0.1:PORT/overlay.js?token=TOKEN" data-web-inspect></script>
 *   <!-- web-inspect:end -->
 *
 * Inserted just before </head> (or </body> if no </head>).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.dirname(__dirname); // scripts/ is one level inside the skill dir
const PROJECT_ROOT = process.cwd();
const CONFIG_PATH = path.join(SKILL_DIR, 'web-inspect.config.json');
const MARKER_START = '<!-- web-inspect:start -->';
const MARKER_END = '<!-- web-inspect:end -->';
const SCAN_ROOTS_DEFAULT = ['public', 'src', 'app', 'pages', '.'];

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { _: [], pageFiles: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--check') args.check = true;
    else if (a === '--restore') args.restore = true;
    else if (a === '--port') args.port = argv[++i];
    else if (a === '--token') args.token = argv[++i];
    else if (a === '--page') args.pageFiles.push(argv[++i]);
    else if (a === '--dev-url') args.devUrl = argv[++i];
    else args._.push(a);
  }
  return args;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function loadConfig(args) {
  // CLI flags take precedence over the config file
  if (args.pageFiles.length > 0) {
    const devUrl = args.devUrl || '';
    if (!devUrl) {
      return { ok: false, error: 'dev_url_missing', hint: 'Pass --dev-url <url>.' };
    }
    return { ok: true, config: { pageFiles: args.pageFiles, devUrl, scanRoots: SCAN_ROOTS_DEFAULT } };
  }

  if (!fs.existsSync(CONFIG_PATH)) {
    return { ok: false, error: 'config_missing', configPath: CONFIG_PATH, hint: 'Run start.mjs to auto-detect and create the config.' };
  }
  let raw;
  try { raw = fs.readFileSync(CONFIG_PATH, 'utf-8'); }
  catch (err) { return { ok: false, error: 'config_read_failed', detail: String(err) }; }
  let cfg;
  try { cfg = JSON.parse(raw); }
  catch (err) { return { ok: false, error: 'config_invalid_json', detail: String(err) }; }
  if (!cfg || typeof cfg !== 'object') return { ok: false, error: 'config_invalid_shape' };
  if (!Array.isArray(cfg.pageFiles) || cfg.pageFiles.length === 0) {
    return { ok: false, error: 'config_invalid_pageFiles', hint: 'pageFiles must be a non-empty array of relative HTML paths.' };
  }
  if (!cfg.devUrl || typeof cfg.devUrl !== 'string') {
    return { ok: false, error: 'dev_url_missing', hint: 'Set devUrl in the config or pass --dev-url <url>.' };
  }
  return { ok: true, config: cfg };
}

function resolveFiles(cfg) {
  const out = [];
  for (const rel of cfg.pageFiles) {
    const abs = path.resolve(PROJECT_ROOT, rel);
    if (!abs.startsWith(PROJECT_ROOT)) continue; // refuse path traversal
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) out.push(abs);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Drift scan: HTML files under scanRoots that aren't covered by pageFiles
// ---------------------------------------------------------------------------

function walk(dir, acc, depth = 0) {
  if (depth > 6) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    if (e.name === 'node_modules' || e.name === 'dist' || e.name === 'build' || e.name === '.next' || e.name === 'coverage') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc, depth + 1);
    else if (e.isFile() && /\.(html|htm)$/i.test(e.name)) acc.push(p);
  }
}

function scanForDrift(cfg, resolved) {
  const roots = (cfg.scanRoots && cfg.scanRoots.length ? cfg.scanRoots : SCAN_ROOTS_DEFAULT).map((r) => path.resolve(PROJECT_ROOT, r));
  const seen = new Set();
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    const acc = [];
    walk(r, acc, 0);
    for (const f of acc) seen.add(f);
  }
  const known = new Set(resolved);
  return [...seen].filter((f) => !known.has(f)).map((f) => path.relative(PROJECT_ROOT, f));
}

// ---------------------------------------------------------------------------
// Inject / restore
// ---------------------------------------------------------------------------

function escapeRegex(s) {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function buildBlock(port, token, indent) {
  const url = `http://127.0.0.1:${port}/overlay.js?token=${encodeURIComponent(token)}`;
  return `${indent}${MARKER_START}\n${indent}<script src="${url}" data-web-inspect defer></script>\n${indent}${MARKER_END}\n`;
}

// Strip our exact 3-line block. Preserves all surrounding whitespace.
function stripMarkers(html) {
  const re = new RegExp(`^[ \\t]*${escapeRegex(MARKER_START)}[\\s\\S]*?${escapeRegex(MARKER_END)}[ \\t]*\\r?\\n?`, 'gm');
  return html.replace(re, '');
}

function injectOne(filePath, port, token) {
  const orig = fs.readFileSync(filePath, 'utf-8');
  const cleaned = stripMarkers(orig);

  let next;
  let m;
  if ((m = cleaned.match(/^([ \t]*)<\/head>/im))) {
    const block = buildBlock(port, token, m[1] || '');
    next = cleaned.replace(/(^[ \t]*)<\/head>/im, `${block}$1</head>`);
  } else if ((m = cleaned.match(/^([ \t]*)<\/body>/im))) {
    const block = buildBlock(port, token, m[1] || '');
    next = cleaned.replace(/(^[ \t]*)<\/body>/im, `${block}$1</body>`);
  } else {
    // No closing head/body — append at end with no indent.
    next = `${cleaned}\n${buildBlock(port, token, '')}`;
  }
  if (next !== orig) fs.writeFileSync(filePath, next);
  return next !== orig;
}

function restoreOne(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const orig = fs.readFileSync(filePath, 'utf-8');
  const cleaned = stripMarkers(orig);
  if (cleaned !== orig) {
    fs.writeFileSync(filePath, cleaned);
    return true;
  }
  return false;
}

// For restore: scan all HTML files under common roots for leftover markers.
function scanForMarkers() {
  const roots = SCAN_ROOTS_DEFAULT.map((r) => path.resolve(PROJECT_ROOT, r));
  const found = [];
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    const acc = [];
    walk(r, acc, 0);
    for (const f of acc) {
      try {
        const content = fs.readFileSync(f, 'utf-8');
        if (content.includes(MARKER_START)) found.push(f);
      } catch { /* skip */ }
    }
  }
  return [...new Set(found)];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.restore) {
    // Restore mode: use provided --page files, then fall back to scanning for markers.
    const targets = args.pageFiles.length > 0
      ? args.pageFiles.map((f) => path.resolve(PROJECT_ROOT, f))
      : scanForMarkers();
    const restored = [];
    for (const f of targets) {
      if (restoreOne(f)) restored.push(path.relative(PROJECT_ROOT, f));
    }
    process.stdout.write(JSON.stringify({ ok: true, restored }) + '\n');
    return;
  }

  const cfgResult = loadConfig(args);
  if (!cfgResult.ok) {
    process.stdout.write(JSON.stringify(cfgResult) + '\n');
    process.exit(0);
  }
  const cfg = cfgResult.config;
  const resolved = resolveFiles(cfg);

  if (resolved.length === 0) {
    process.stdout.write(JSON.stringify({
      ok: false,
      error: 'no_page_files',
      tried: cfg.pageFiles,
      hint: 'None of the configured pageFiles exist. Run start.mjs again and provide --page.',
    }) + '\n');
    process.exit(0);
  }

  if (args.check) {
    const drift = scanForDrift(cfg, resolved);
    process.stdout.write(JSON.stringify({
      ok: true,
      config: cfg,
      pageFiles: resolved.map((f) => path.relative(PROJECT_ROOT, f)),
      configDrift: { orphans: drift },
    }) + '\n');
    return;
  }

  // Inject mode
  if (!args.port || !args.token) {
    process.stdout.write(JSON.stringify({ ok: false, error: 'missing_port_or_token' }) + '\n');
    process.exit(1);
  }
  const injected = [];
  for (const f of resolved) {
    if (injectOne(f, args.port, args.token)) injected.push(path.relative(PROJECT_ROOT, f));
  }
  process.stdout.write(JSON.stringify({ ok: true, injected, devUrl: cfg.devUrl }) + '\n');
}

main();

export { resolveFiles, scanForDrift, MARKER_START, MARKER_END };
