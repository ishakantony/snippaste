#!/usr/bin/env node
/**
 * Agent-side long-poll for the next event from the web-inspect helper.
 *
 * Reads .runtime/state.json (PID file) for { port, token }, then GETs /poll.
 * The helper holds the request until a batch arrives or the timeout elapses.
 *
 * Output: a single JSON event on stdout. Exits 0 on success.
 *
 * Usage:
 *   node poll.mjs                  # default 600000ms timeout
 *   node poll.mjs --timeout=60000  # override (don't — the default is correct)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.dirname(__dirname);
const PID_FILE = path.join(SKILL_DIR, '.runtime', 'state.json');
const DEFAULT_TIMEOUT = 600_000;

function readPid() {
  if (!fs.existsSync(PID_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(PID_FILE, 'utf-8')); } catch { return null; }
}

function parseTimeout(argv) {
  const flag = argv.find((a) => a.startsWith('--timeout='));
  if (!flag) return DEFAULT_TIMEOUT;
  const n = parseInt(flag.split('=')[1], 10);
  if (!Number.isFinite(n) || n < 1000) return DEFAULT_TIMEOUT;
  return n;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write('Usage: node poll.mjs [--timeout=MS]\n');
    process.exit(0);
  }

  const pid = readPid();
  if (!pid || !pid.port || !pid.token) {
    process.stdout.write(JSON.stringify({ type: 'error', error: 'no_helper', hint: 'Run start.mjs first.' }) + '\n');
    process.exit(0);
  }

  const timeout = parseTimeout(args);
  const url = `http://127.0.0.1:${pid.port}/poll?token=${encodeURIComponent(pid.token)}&timeout=${timeout}`;

  // AbortController guards against the unlikely case the server hangs past timeout.
  const ac = new AbortController();
  const guardMs = timeout + 5_000;
  const guard = setTimeout(() => ac.abort(), guardMs);

  let res;
  try {
    res = await fetch(url, { signal: ac.signal });
  } catch (err) {
    clearTimeout(guard);
    if (err.name === 'AbortError') {
      process.stdout.write(JSON.stringify({ type: 'timeout' }) + '\n');
      process.exit(0);
    }
    // Connection refused -> server died.
    process.stdout.write(JSON.stringify({ type: 'error', error: 'helper_unreachable', detail: String(err) }) + '\n');
    process.exit(0);
  }
  clearTimeout(guard);

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    process.stdout.write(JSON.stringify({ type: 'error', error: 'helper_http_error', status: res.status, body }) + '\n');
    process.exit(0);
  }

  const json = await res.json().catch(() => null);
  if (!json) {
    process.stdout.write(JSON.stringify({ type: 'error', error: 'helper_bad_json' }) + '\n');
    process.exit(0);
  }
  process.stdout.write(JSON.stringify(json) + '\n');
}

main();
