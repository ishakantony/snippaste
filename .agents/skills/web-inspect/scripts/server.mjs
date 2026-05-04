#!/usr/bin/env node
/**
 * web-inspect helper server (zero deps, Node-only).
 *
 * Routes (all token-gated):
 *   GET  /overlay.js     -> serves the browser overlay (no token required; file is public)
 *   GET  /health         -> { ok, port, sessionId }
 *   POST /batch          -> browser submits an annotation batch
 *   GET  /poll           -> agent long-polls for the next batch
 *   POST /exit           -> agent signals shutdown
 *
 * Browser→server push: HTTP POST /batch (one event per Send click).
 * Agent←server pull: HTTP long-poll on /poll (default 600s, agent re-polls on timeout).
 *
 * Self-contained: only Node stdlib. PID file at <skillDir>/.runtime/state.json.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { randomUUID, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.dirname(__dirname); // scripts/ is one level inside the skill dir
const RUNTIME_DIR = path.join(SKILL_DIR, '.runtime');
const PID_FILE = path.join(RUNTIME_DIR, 'state.json');
const SESSIONS_ROOT = path.join(RUNTIME_DIR, 'sessions');

const POLL_TIMEOUT_DEFAULT = 600_000;
const MAX_BATCH_BYTES = 25 * 1024 * 1024; // ~25MB; element screenshots are small but headroom helps

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const state = {
  token: null,
  port: null,
  sessionId: null,
  sessionDir: null,
  pendingEvents: [],   // batches not yet handed to a poller
  pendingPolls: [],    // poll callbacks waiting for an event
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findOpenPort(start = 8401) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', () => resolve(findOpenPort(start + 1)));
    srv.listen(start, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function send(res, status, body, headers = {}) {
  const isString = typeof body === 'string';
  const payload = isString ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': isString ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    ...headers,
  });
  res.end(payload);
}

function sendFile(res, filePath, contentType) {
  const buf = fs.readFileSync(filePath);
  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': buf.length,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(buf);
}

function readBody(req, max = MAX_BATCH_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (c) => {
      total += c.length;
      if (total > max) { req.destroy(); reject(new Error('payload_too_large')); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function tokenOf(req, url) {
  const fromQuery = url.searchParams.get('token');
  if (fromQuery) return fromQuery;
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

function authed(req, url) {
  const t = tokenOf(req, url);
  return t && state.token && t === state.token;
}

function deliverEvent(event) {
  if (state.pendingPolls.length > 0) {
    const cb = state.pendingPolls.shift();
    cb(event);
  } else {
    state.pendingEvents.push(event);
  }
}

function ensureSessionDir() {
  if (!state.sessionDir) {
    state.sessionId = randomUUID().slice(0, 8);
    state.sessionDir = path.join(SESSIONS_ROOT, state.sessionId);
    fs.mkdirSync(state.sessionDir, { recursive: true });
  }
  return state.sessionDir;
}

function decodeDataUrlPng(dataUrl) {
  if (typeof dataUrl !== 'string') return null;
  const m = dataUrl.match(/^data:image\/png;base64,(.+)$/);
  if (!m) return null;
  try { return Buffer.from(m[1], 'base64'); } catch { return null; }
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

async function handle(req, res) {
  const url = new URL(req.url, `http://127.0.0.1:${state.port}`);

  if (req.method === 'OPTIONS') return send(res, 204, '');

  // Public: overlay script (browser fetches without knowing token until it parses the URL)
  if (req.method === 'GET' && url.pathname === '/overlay.js') {
    const overlayPath = path.join(__dirname, 'overlay.js');
    try {
      sendFile(res, overlayPath, 'application/javascript; charset=utf-8');
    } catch (err) {
      send(res, 500, { ok: false, error: 'overlay_read_failed', detail: String(err) });
    }
    return;
  }

  // Public: tiny health check
  if (req.method === 'GET' && url.pathname === '/health') {
    return send(res, 200, { ok: true, port: state.port, sessionId: state.sessionId });
  }

  // From here on: token-gated
  if (!authed(req, url)) return send(res, 401, { ok: false, error: 'bad_token' });

  // Browser -> server: submit batch
  if (req.method === 'POST' && url.pathname === '/batch') {
    let body;
    try { body = await readBody(req); } catch { return send(res, 413, { ok: false, error: 'payload_too_large' }); }
    let parsed;
    try { parsed = JSON.parse(body.toString('utf-8')); } catch { return send(res, 400, { ok: false, error: 'bad_json' }); }

    const sessionDir = ensureSessionDir();
    const batchId = randomUUID().slice(0, 8);

    const annotations = Array.isArray(parsed.annotations) ? parsed.annotations : [];
    const enriched = annotations.map((ann, idx) => {
      const annId = String(idx + 1);
      let screenshotPath = null;
      const png = decodeDataUrlPng(ann.screenshot);
      if (png) {
        screenshotPath = path.join(sessionDir, `batch-${batchId}-ann-${annId}.png`);
        try { fs.writeFileSync(screenshotPath, png); } catch { screenshotPath = null; }
      }
      const { screenshot, ...rest } = ann;
      return { ...rest, id: annId, screenshotPath };
    });

    const event = {
      type: 'batch',
      id: batchId,
      batchId,
      sessionDescription: typeof parsed.sessionDescription === 'string' ? parsed.sessionDescription : '',
      annotations: enriched,
      receivedAt: Date.now(),
    };
    deliverEvent(event);
    return send(res, 200, { ok: true, batchId, count: enriched.length });
  }

  // Agent <- server: long-poll
  if (req.method === 'GET' && url.pathname === '/poll') {
    const timeout = Math.max(1000, Math.min(POLL_TIMEOUT_DEFAULT, Number(url.searchParams.get('timeout')) || POLL_TIMEOUT_DEFAULT));

    if (state.pendingEvents.length > 0) {
      return send(res, 200, state.pendingEvents.shift());
    }

    let timer;
    const cb = (event) => {
      clearTimeout(timer);
      send(res, 200, event);
    };
    state.pendingPolls.push(cb);
    timer = setTimeout(() => {
      const i = state.pendingPolls.indexOf(cb);
      if (i >= 0) state.pendingPolls.splice(i, 1);
      send(res, 200, { type: 'timeout' });
    }, timeout);
    req.on('close', () => {
      const i = state.pendingPolls.indexOf(cb);
      if (i >= 0) state.pendingPolls.splice(i, 1);
      clearTimeout(timer);
    });
    return;
  }

  // Agent -> server: shutdown
  if (req.method === 'POST' && url.pathname === '/exit') {
    // Drain any waiting poller, clear PID file synchronously, ack, then exit.
    deliverEvent({ type: 'exit' });
    clearPidFile();
    send(res, 200, { ok: true });
    setTimeout(() => process.exit(0), 50);
    return;
  }

  send(res, 404, { ok: false, error: 'not_found' });
}

// ---------------------------------------------------------------------------
// PID file
// ---------------------------------------------------------------------------

function writePidFile() {
  fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
  const data = {
    pid: process.pid,
    port: state.port,
    token: state.token,
    sessionId: state.sessionId,
    startedAt: Date.now(),
  };
  fs.writeFileSync(PID_FILE, JSON.stringify(data, null, 2));
}

function clearPidFile() {
  try { fs.unlinkSync(PID_FILE); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function backgroundSpawn(args) {
  // Spawn detached child running this same script without --background.
  const childArgs = args.filter((a) => a !== '--background');
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), ...childArgs], {
    detached: true,
    stdio: 'ignore',
    cwd: process.cwd(),
  });
  child.unref();

  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const info = JSON.parse(fs.readFileSync(PID_FILE, 'utf-8'));
      if (info.pid !== process.pid && info.pid === child.pid) {
        process.stdout.write(JSON.stringify({ ok: true, ...info }) + '\n');
        process.exit(0);
      }
    } catch { /* not ready yet */ }
    await new Promise((r) => setTimeout(r, 150));
  }
  process.stderr.write('web-inspect server failed to come up within 10s.\n');
  process.exit(1);
}

async function stopRunning() {
  let info;
  try { info = JSON.parse(fs.readFileSync(PID_FILE, 'utf-8')); }
  catch { process.stdout.write(JSON.stringify({ ok: true, note: 'no_pid_file' }) + '\n'); return; }
  if (!info || !info.pid) { clearPidFile(); process.stdout.write(JSON.stringify({ ok: true, note: 'empty_pid_file' }) + '\n'); return; }
  try {
    await fetch(`http://127.0.0.1:${info.port}/exit?token=${encodeURIComponent(info.token)}`, { method: 'POST' });
    process.stdout.write(JSON.stringify({ ok: true, stopped: info.pid }) + '\n');
  } catch {
    // Server unreachable; try to kill directly.
    try { process.kill(info.pid, 'SIGTERM'); } catch { /* already dead */ }
    clearPidFile();
    process.stdout.write(JSON.stringify({ ok: true, killed: info.pid }) + '\n');
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write([
      'web-inspect helper server',
      '',
      'Usage:',
      '  node server.mjs               # run in foreground (prints connection JSON)',
      '  node server.mjs --background  # spawn detached, print connection JSON, exit',
      '  node server.mjs stop          # stop the running server',
      '',
    ].join('\n'));
    process.exit(0);
  }

  if (args.includes('stop')) { await stopRunning(); return; }
  if (args.includes('--background')) { await backgroundSpawn(args); return; }

  // Reject if a server is already running.
  try {
    const existing = JSON.parse(fs.readFileSync(PID_FILE, 'utf-8'));
    if (existing && existing.pid && existing.pid !== process.pid) {
      try {
        process.kill(existing.pid, 0);
        process.stderr.write(`web-inspect server already running on port ${existing.port} (pid ${existing.pid}).\n`);
        process.stderr.write('Stop it first: node server.mjs stop\n');
        process.exit(1);
      } catch { clearPidFile(); /* stale */ }
    }
  } catch { /* no PID file */ }

  state.token = randomBytes(16).toString('hex');
  state.port = await findOpenPort(8401);
  ensureSessionDir();

  const server = http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      try { send(res, 500, { ok: false, error: 'internal', detail: String(err) }); } catch { /* ignore */ }
    });
  });

  server.listen(state.port, '127.0.0.1', () => {
    writePidFile();
    process.stdout.write(JSON.stringify({
      ok: true,
      port: state.port,
      token: state.token,
      sessionId: state.sessionId,
    }) + '\n');
  });

  const shutdown = () => {
    clearPidFile();
    try { server.close(); } catch { /* ignore */ }
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('exit', clearPidFile);
}

main().catch((err) => {
  process.stderr.write(`web-inspect server failed to start: ${err.message}\n`);
  process.exit(1);
});
