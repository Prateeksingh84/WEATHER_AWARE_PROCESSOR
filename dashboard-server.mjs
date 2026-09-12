import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = __dirname;
const DASHBOARD_DIR = path.join(ROOT, 'dashboard');
const OUTPUT_DIR = path.join(ROOT, 'output');
const ORDERS_FILE = path.join(ROOT, 'orders.json');
const UPDATED_FILE = path.join(OUTPUT_DIR, 'orders.updated.json');
const ERROR_LOG = path.join(OUTPUT_DIR, 'errors.log');
const HOST = process.env.DASHBOARD_HOST || '127.0.0.1';
const PORT = Number(process.env.DASHBOARD_PORT || 4173);

let running = false;
let activeRun = null;
const clients = new Set();
let lastRun = null;

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    res.write(payload);
  }
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fsp.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function readErrors() {
  try {
    const raw = await fsp.readFile(ERROR_LOG, 'utf8');
    return raw.trim() ? raw.trim().split(/\r?\n/).map((line) => JSON.parse(line)) : [];
  } catch {
    return [];
  }
}

async function buildState() {
  const inputOrders = await readJson(ORDERS_FILE, []);
  const updatedOrders = await readJson(UPDATED_FILE, null);
  const errors = await readErrors();
  const orders = Array.isArray(updatedOrders) ? updatedOrders : inputOrders;
  const delayed = orders.filter((o) => o.status === 'Delayed');
  const errored = orders.filter((o) => o.error);
  const normal = orders.filter((o) => !o.error && o.status !== 'Delayed');

  return {
    generatedAt: new Date().toISOString(),
    lastRun,
    running,
    summary: {
      total: orders.length,
      delayed: delayed.length,
      normal: normal.length,
      errors: errored.length || errors.length,
    },
    orders,
    errors,
  };
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(body));
}

function mime(file) {
  const ext = path.extname(file).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
  }[ext] || 'application/octet-stream';
}

async function serveStatic(url, res) {
  const requestPath = decodeURIComponent(new URL(url, `http://${HOST}:${PORT}`).pathname);
  const relative = requestPath === '/' ? 'index.html' : requestPath.replace(/^\//, '');
  const safe = path.normalize(relative).replace(/^\.\.(?:[\\/]|$)/, '');
  const filePath = path.join(DASHBOARD_DIR, safe);
  if (!filePath.startsWith(DASHBOARD_DIR)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  try {
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) throw new Error('Not a file');
    res.writeHead(200, {
      'Content-Type': mime(filePath),
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

function startProcessor() {
  if (running) return false;
  running = true;
  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  activeRun = { runId, startedAt, logs: [] };
  lastRun = { runId, startedAt, finishedAt: null, exitCode: null, ok: null };
  broadcast('run-start', { runId, startedAt });

  const child = spawn(process.execPath, [path.join(ROOT, 'src', 'weather-orders.js')], {
    cwd: ROOT,
    env: process.env,
    windowsHide: true,
  });

  const handleChunk = (stream, text) => {
    for (const raw of String(text).split(/\r?\n/)) {
      if (!raw.trim()) continue;
      const entry = { time: new Date().toISOString(), stream, text: raw };
      activeRun.logs.push(entry);
      broadcast('run-log', entry);
    }
  };

  child.stdout.on('data', (chunk) => handleChunk('stdout', chunk));
  child.stderr.on('data', (chunk) => handleChunk('stderr', chunk));
  child.on('error', (error) => {
    handleChunk('stderr', error.message);
  });
  child.on('close', async (code) => {
    const finishedAt = new Date().toISOString();
    lastRun = { ...lastRun, finishedAt, exitCode: code, ok: code === 0 };
    running = false;
    broadcast('run-complete', { ...lastRun });
    broadcast('state', await buildState());
    activeRun = null;
  });

  return true;
}

const server = http.createServer(async (req, res) => {
  try {
    const parsed = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);

    if (req.method === 'GET' && parsed.pathname === '/api/state') {
      return sendJson(res, 200, await buildState());
    }

    if (req.method === 'POST' && parsed.pathname === '/api/run') {
      if (!process.env.OPENWEATHER_API_KEY) {
        return sendJson(res, 400, {
          error: 'OPENWEATHER_API_KEY is missing. Create .env from .env.example and restart the dashboard.',
        });
      }
      if (!startProcessor()) {
        return sendJson(res, 409, { error: 'A weather check is already running.' });
      }
      return sendJson(res, 202, { accepted: true, runId: lastRun.runId });
    }

    if (req.method === 'GET' && parsed.pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      res.write(': connected\n\n');
      clients.add(res);
      res.write(`event: state\ndata: ${JSON.stringify(await buildState())}\n\n`);
      req.on('close', () => clients.delete(res));
      return;
    }

    if (req.method === 'GET') return serveStatic(req.url, res);

    res.writeHead(405); res.end('Method Not Allowed');
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Weather dashboard running at http://${HOST}:${PORT}`);
  console.log('Use the dashboard Run Now button to trigger a real OpenWeatherMap run.');
});
