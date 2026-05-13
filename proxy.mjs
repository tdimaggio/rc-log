// proxy.mjs — tiny local CORS proxy for rc-log.html
// Run:  node proxy.mjs
// Keep running while using rc-log.html in the browser.
import http from 'http';
import https from 'https';
import { URL } from 'url';

const PORT = 3001;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method !== 'GET')     { res.writeHead(405); res.end('GET only'); return; }

  let target;
  try {
    const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
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

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n✅  RC-Log proxy listening on http://localhost:${PORT}`);
  console.log('   Keep this terminal open while using rc-log.html\n');
});
