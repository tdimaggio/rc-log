# Cloudflare Pages Functions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two Cloudflare Pages Functions (`/proxy` and `/env`) so the deployed site has full feature parity with the local `proxy.mjs` server — no third-party CORS proxy fallbacks needed, and Gemini key auto-loads from a CF secret.

**Architecture:** Two files in `functions/` are auto-detected by CF Pages and deployed as edge Workers. `functions/proxy.js` proxies liverc.com fetches (allowlisted). `functions/env.js` returns the `GEMINI_KEY` CF secret as JSON. No changes to `rc-log.html`.

**Tech Stack:** Cloudflare Pages Functions (Workers runtime), `wrangler` CLI (v10, already available via `npx wrangler`)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `functions/proxy.js` | Create | CORS proxy — fetches liverc.com at the edge |
| `functions/env.js` | Create | Returns `GEMINI_KEY` CF env var as JSON |
| `rc-log.html` | No change | Already uses `/proxy` and `/env` correctly |
| `proxy.mjs` | No change | Stays for local development |

---

## Task 1: Create `functions/proxy.js`

**Files:**
- Create: `functions/proxy.js`

- [ ] **Step 1: Create the file**

```js
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
  }

  if (request.method !== 'GET') {
    return new Response('GET only', { status: 405 });
  }

  const target = url.searchParams.get('url');
  if (!target) {
    return new Response('Bad request: missing ?url=', { status: 400 });
  }

  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch {
    return new Response('Bad request: invalid url', { status: 400 });
  }

  if (!targetUrl.hostname.endsWith('liverc.com')) {
    return new Response('Forbidden: only liverc.com URLs are allowed', { status: 403 });
  }

  try {
    const upstream = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return new Response(`Upstream error: ${e.message}`, { status: 502 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add functions/proxy.js
git commit -m "feat: add CF Pages Function for CORS proxy (liverc.com allowlist)"
```

---

## Task 2: Create `functions/env.js`

**Files:**
- Create: `functions/env.js`

- [ ] **Step 1: Create the file**

```js
export async function onRequest(context) {
  const { env } = context;
  return new Response(
    JSON.stringify({ GEMINI_KEY: env.GEMINI_KEY || '' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add functions/env.js
git commit -m "feat: add CF Pages Function to expose GEMINI_KEY env var"
```

---

## Task 3: Local smoke test with wrangler

**Files:** No changes — read-only verification

- [ ] **Step 1: Start the local Pages dev server**

In a terminal, from the project root:
```bash
npx wrangler pages dev . --port 8788
```

Leave this running. wrangler serves `rc-log.html` at `http://localhost:8788` and routes `/proxy` and `/env` to your Functions.

- [ ] **Step 2: Test the proxy rejects non-liverc URLs**

In a second terminal:
```bash
curl -s "http://localhost:8788/proxy?url=https://example.com" 
```
Expected: `Forbidden: only liverc.com URLs are allowed` (HTTP 403)

- [ ] **Step 3: Test the proxy accepts a liverc.com URL**

```bash
curl -si "http://localhost:8788/proxy?url=https://ssspeedway.liverc.com/results/?p=view_race_result%26id=6755593" | head -5
```
Expected: HTTP 200 with `Content-Type: text/html`

- [ ] **Step 4: Test the /env endpoint (no GEMINI_KEY set yet)**

```bash
curl -s "http://localhost:8788/env"
```
Expected: `{"GEMINI_KEY":""}`

- [ ] **Step 5: Test /env with a local env var**

Stop wrangler (Ctrl+C), then:
```bash
GEMINI_KEY=test-key-123 npx wrangler pages dev . --port 8788
```

In the second terminal:
```bash
curl -s "http://localhost:8788/env"
```
Expected: `{"GEMINI_KEY":"test-key-123"}`

Stop wrangler when done.

- [ ] **Step 6: Test missing ?url= param**

```bash
curl -s "http://localhost:8788/proxy"
```
Expected: `Bad request: missing ?url=`

---

## Task 4: Deploy and configure Cloudflare

**Files:** No code changes — CF dashboard steps

- [ ] **Step 1: Push to GitHub**

```bash
git push
```

Cloudflare Pages auto-deploys on push if connected to the repo. Check the CF dashboard for the build/deploy status.

- [ ] **Step 2: Set the GEMINI_KEY secret in CF**

In the Cloudflare dashboard:
1. Go to **Workers & Pages** → your Pages project
2. **Settings** → **Environment variables**
3. Click **Add variable**
4. Name: `GEMINI_KEY`, Value: your Gemini API key
5. Toggle **Encrypt** (makes it a secret — not visible after saving)
6. Set for **Production** (and optionally Preview)
7. Click **Save**

- [ ] **Step 3: Trigger a redeploy**

CF Pages only picks up new env vars on the next deploy. Either push a trivial commit or use the CF dashboard:
**Deployments** → click the latest deployment → **Retry deployment**

- [ ] **Step 4: Smoke test the live deployment**

Replace `<your-site>` with your actual `.pages.dev` domain:

```bash
# Proxy allowlist check
curl -s "https://<your-site>.pages.dev/proxy?url=https://evil.com"
# Expected: Forbidden: only liverc.com URLs are allowed

# Proxy liverc fetch
curl -si "https://<your-site>.pages.dev/proxy?url=https://ssspeedway.liverc.com/results/?p=view_race_result%26id=6755593" | head -3
# Expected: HTTP/2 200, Content-Type: text/html

# Env endpoint
curl -s "https://<your-site>.pages.dev/env"
# Expected: {"GEMINI_KEY":"AIza..."}  (your actual key)
```

- [ ] **Step 5: Open the app in a browser and verify end-to-end**

1. Navigate to `https://<your-site>.pages.dev/rc-log.html`
2. The Gemini API key input should be auto-populated (from `/env`)
3. Paste a liverc race URL (e.g. `https://ssspeedway.liverc.com/results/?p=view_race_result&id=6755593`) and click Load
4. Race should load and animate normally
5. Click **Spicy Analysis** — should generate commentary if the Gemini key loaded correctly
