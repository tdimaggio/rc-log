# Cloudflare Pages Functions — Design Spec

**Date:** 2026-05-13  
**Project:** rc-html (RC Race Replay)  
**Goal:** Deploy `rc-log.html` to Cloudflare Pages with full feature parity to the local `proxy.mjs` server.

---

## Background

`rc-log.html` is a single-file static app. Locally it runs behind `proxy.mjs`, a Node.js HTTPS server that provides two dynamic endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /proxy?url=<encoded>` | CORS proxy — fetches liverc.com pages server-side to bypass browser CORS restrictions |
| `GET /env` | Returns `{ GEMINI_KEY }` from the local `.env` file so the browser can auto-load the Gemini API key |

Cloudflare Pages is static-only, so `proxy.mjs` cannot run there. The app has fallback CORS proxies (`allorigins.win`, `corsproxy.io`) but they are third-party services with rate limits and reliability concerns.

---

## Solution: Cloudflare Pages Functions

Cloudflare Pages Functions are edge Workers co-deployed with a Pages site. A file at `functions/<name>.js` automatically handles `GET /<name>`. No `wrangler.toml` or separate Worker deployment needed.

---

## Files to Create

### `functions/proxy.js`

Handles `GET /proxy?url=<encoded>`.

**Behavior:**
- Extract `url` query param; return 400 if missing or invalid
- Validate the target hostname ends with `liverc.com` — rejects all other targets to prevent open-relay abuse
- Fetch the target URL from the edge using the CF runtime `fetch()`
- Forward response body with `Content-Type: text/html; charset=utf-8` and `Access-Control-Allow-Origin: *`
- Return 502 on upstream error, 504 on timeout

**Why liverc.com allowlist:** Without it, anyone can use the proxy to fetch arbitrary URLs on your behalf (open relay). The app only ever fetches liverc.com, so this restriction has no functional cost.

### `functions/env.js`

Handles `GET /env`.

**Behavior:**
- Read `GEMINI_KEY` from the CF Pages environment (set as a secret in the CF dashboard)
- Return `{ "GEMINI_KEY": "<value>" }` as JSON
- If the env var is not set, return `{ "GEMINI_KEY": "" }` (same shape, no error)

**Security note:** This endpoint is publicly accessible — anyone who visits the site can call `/env` and retrieve the key. This matches the existing local behavior (the key was always readable from the browser). Acceptable for a personal tool; not appropriate for a key with billing exposure to untrusted users. Owner should monitor Gemini API usage.

---

## No Changes to `rc-log.html`

The existing `fetchLiverc()` cascade already tries `/proxy` first:

```js
const proxies = [
  `/proxy?url=${enc}`,           // hits CF Function
  `https://api.allorigins.win/…`,
  `https://corsproxy.io/…`,
];
```

The existing `/env` auto-load call also works unchanged:

```js
const res = await fetch('/env', { signal: AbortSignal.timeout(2000) });
```

---

## Cloudflare Pages Configuration

**Build settings (CF dashboard):**
- Framework preset: None
- Build command: *(empty)*
- Build output directory: `/` (or blank)

**Environment variables (CF dashboard → Settings → Environment variables):**
- `GEMINI_KEY` = your Gemini API key (set as a Secret, not plain text)

---

## What This Replaces

`proxy.mjs` remains useful for local development (HTTPS + Tailscale). It is not deleted.  
The `certs/` directory and `.env` file are local-only and remain in `.gitignore`.

---

## Out of Scope

- Rewriting `rc-log.html` (no changes needed)
- Migrating to a standalone Cloudflare Worker (Pages Functions are sufficient)
- Authentication / access control on the deployed site
