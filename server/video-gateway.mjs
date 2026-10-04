#!/usr/bin/env node
/**
 * Standalone video gateway for local development and self-hosting.
 *
 *   node server/video-gateway.mjs --port 8787
 *
 * Reads keys from the process environment and, for convenience, from a `.env`
 * file in the repository root (never committed). The browser is given nothing
 * but the gateway URL: `VITE_BHIDEO_GATEWAY_URL=http://localhost:8787/api/video`.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createNodeGatewayHandler } from '../src/services/video/gateway/nodeBridge.js';
import { budgetFromEnv, health } from '../src/services/video/gateway/handler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

/** Tiny .env parser: KEY=value, `export KEY=value`, quotes, comments. */
export function parseDotEnv(contents) {
  const out = {};
  for (const line of String(contents).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.replace(/^export\s+/, '').match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '');
    }
    out[match[1]] = value;
  }
  return out;
}

export function loadEnv(file = path.join(root, '.env')) {
  const env = { ...process.env };
  try {
    if (fs.existsSync(file)) Object.assign(env, { ...parseDotEnv(fs.readFileSync(file, 'utf8')), ...process.env });
  } catch (error) {
    console.warn('[video-gateway] could not read .env:', error.message);
  }
  return env;
}

const argv = process.argv.slice(2);
function argValue(name, fallback) {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

const env = loadEnv();
const port = Number(argValue('--port', env.PORT || 8787));
const basePath = argValue('--base', env.BHIDEO_GATEWAY_BASE_PATH || '/api/video');
const budget = budgetFromEnv(env);

const listener = createNodeGatewayHandler({ basePath, env, spendLimitUsd: budget.monthlyBudgetUsd });

const server = http.createServer((req, res) => {
  const pathname = String(req.url || '').split('?')[0];
  if (pathname === '/' || pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ ...health(env), basePath }, null, 2));
    return;
  }
  if (!pathname.startsWith(basePath)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Not a gateway path. Mount the app at ${basePath}/…`, hint: `Try ${basePath}/health` }));
    return;
  }
  // The handler strips `basePath` itself, so the raw url is passed through.
  listener(req, res);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen(port, '0.0.0.0', () => {
    const info = health(env);
    console.log(`\n  AI-Bhideo video gateway`);
    console.log(`  → http://0.0.0.0:${port}${basePath}/health`);
    console.log(`  → configured providers: ${info.configuredProviders.join(', ') || 'none (BYOK mode only)'}`);
    if (budget.maxUsdPerClip) console.log(`  → per-clip cap: ${budget.maxUsdPerClip} USD`);
    if (budget.monthlyBudgetUsd) console.log(`  → monthly ceiling: ${budget.monthlyBudgetUsd} USD`);
    console.log('');
  });
}

export { server };
