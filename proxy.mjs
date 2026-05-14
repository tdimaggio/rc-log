// proxy.mjs — HTTPS server for rc-log.html
// Serves the app at / and /rc-log.html, proxies liverc via /proxy, exposes .env via /env
// Run:  node proxy.mjs
import http from 'http';
import https from 'https';
import fs from 'fs';
import { URL } from 'url';

const PORT = 4321;

const CERT = fs.readFileSync(new URL('certs/nakedclaw.crt', import.meta.url));
const KEY  = fs.readFileSync(new URL('certs/nakedclaw.key', import.meta.url));

function readEnv() {
  try {
    const content = fs.readFileSync(new URL('.env', import.meta.url), 'utf8');
    const out = {};
    for (const line of content.split('\n')) {
      const eq = line.indexOf('=');
      if (eq > 0) out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    }
    return out;
  } catch { return {}; }
}

const server = https.createServer({ cert: CERT, key: KEY }, (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method !== 'GET')     { res.writeHead(405); res.end('GET only'); return; }

  // ── static — serve rc-log.html ───────────────────────────────────
  if (req.url === '/' || req.url === '/rc-log.html') {
    const html = fs.readFileSync(new URL('rc-log.html', import.meta.url));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // ── /env — expose .env keys to the browser ───────────────────────
  if (req.url === '/env') {
    const env = readEnv();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ GEMINI_KEY: env.GEMINI_KEY || '' }));
    return;
  }

  // ── /proxy?url=... — CORS proxy ──────────────────────────────────
  let target;
  try {
    const reqUrl = new URL(req.url, `https://localhost:${PORT}`);
    target = reqUrl.searchParams.get('url');
    if (!target) throw new Error('missing ?url=');
    new URL(target); // validate
  } catch (e) {
    res.writeHead(400); res.end(`Bad request: ${e.message}`); return;
  }

  const mod = target.startsWith('https') ? https : http;
  const proxyReq = mod.get(target, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode ?? 200, { 'Content-Type': 'text/html; charset=utf-8' });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (e) => {
    if (!res.headersSent) { res.writeHead(502); }
    res.end(`Upstream error: ${e.message}`);
  });

  proxyReq.setTimeout(15000, () => {
    proxyReq.destroy();
    if (!res.headersSent) { res.writeHead(504); }
    res.end('Upstream timeout');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅  RC-Log listening on https://nakedclaw.tail86f5d2.ts.net:${PORT}`);
  console.log(`   App: https://nakedclaw.tail86f5d2.ts.net:${PORT}/rc-log.html\n`);
});
