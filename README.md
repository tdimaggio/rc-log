# RC Race Replay

A browser app that fetches RC car race data from [liverc.com](https://liverc.com), replays races lap-by-lap with animated charts, detects incidents, and generates AI race commentary.

**Live:** [sssdash.tdimaggio.workers.dev](https://sssdash.tdimaggio.workers.dev)

No build step. No npm install. Single HTML file (`index.html`) + optional local CORS proxy (`proxy.mjs` for dev).

![screenshot](Screenshot%202026-05-13%20163826.png)

---

## Features

### Charts (5 tabs)
| Tab | What it shows |
|-----|---------------|
| **Position** | Lap-by-lap position chart — who's gaining, who's dropping |
| **Lap Times** | Every lap plotted — personal bests marked with ★, incidents in red |
| **Gap** | Gap to leader in seconds — leader stays flat at 0 |
| **Pace** | 3-lap rolling average — shows who was on a charge and who faded |
| **Heat Map** | Lap quality grid — cells color-coded from personal best (solid) to incident (pulsing red) |

### Table view
Switch from charts to a **live timing table** — every driver × every lap, with cell colors for fastest lap of race (green), personal bests (yellow), and incidents (red). Consistency score shown in the driver column.

### SSS Home Track dropdown
"🏁 Smallscale Speedway ▾" button in the header loads the last 7 days of events from ssspeedway.liverc.com (5-min cache). Click any event card to load it instantly — great for quick replay during a race day.

### Driver sidebar
- Compact `P# · Name + sparkline` rows for every driver
- **Hover any row** for a floating popup with full stats: grid→finish, best/avg lap, consistency %, incidents, position changes
- **Consistency board** below the driver list — horizontal bar chart ranked by consistency %, color-coded green/yellow/red. Falls back to coefficient-of-variation if liverc doesn't report it.

### Mobile layout
Responsive design for screens ≤768px:
- SSS dropdown and all controls in header
- AI summary generates at top of page on completion
- All 5 charts stacked full-width (no animation — renders instantly at race finish)
- Driver cards below charts
- "🖥 Desktop Version" toggle button at bottom (uses localStorage)

### Other
- **Incident detection** — any lap 2 s+ above the driver's top-5 average is flagged
- **Spicy Analysis** — AI commentary via Gemini (API key required, masked input), roasts the results with actual lap times and driver names
- Scrubber bar + keyboard controls (Space = play/pause, ← → = step laps)
- Resizable panels (drag the dividers)
- Shareable URL hash — paste a liverc URL into the browser bar and share it
- **Theme** — carbon + red color scheme, Barlow font

---

## Live deployment

The app is deployed on **Cloudflare Workers** at [sssdash.tdimaggio.workers.dev](https://sssdash.tdimaggio.workers.dev).

The Workers runtime (`src/index.js`) includes:
- Built-in CORS proxy at `/proxy`
- `/env` endpoint for auto-loading Gemini key from CF secrets
- Static asset serving

No server-side setup required for end users.

---

## Running locally (dev)

```bash
# Terminal 1 — CORS proxy (required for file:// origin)
node proxy.mjs

# Terminal 2 — static file server
npx serve -p 4321 .
# then open http://localhost:4321
```

When served over HTTP (not `file://`), the app automatically falls back to public proxies if the local proxy is unavailable.

**API key** — paste your Gemini API key into the (masked) key field in the header. Saved in `localStorage`. You can also put `GEMINI_KEY=...` in a `.env` file and `proxy.mjs` will auto-load it via the `/env` endpoint.

---

## Deploying on Cloudflare Workers (recommended)

The app is built for **Cloudflare Workers**. See `wrangler.toml` for configuration.

### Prerequisites
- Cloudflare account with Workers enabled
- `wrangler` CLI: `npm install -g @cloudflare/wrangler`

### Deploy
```bash
# Set Gemini API key as a secret (one-time)
wrangler secret put GEMINI_KEY
# paste your key

# Deploy
wrangler deploy
```

The Workers runtime handles CORS proxying and serving all static assets — no separate proxy needed.

---

## Alternative: Linux server (docker, pm2, etc.)

### Prerequisites

- **Node.js 18+** (for native ESM support — `node proxy.mjs` uses `import`)
- A static file server: `npx serve`, nginx, caddy, or `python3 -m http.server`

### Setup

```bash
git clone https://github.com/tdimaggio/rc-html
cd rc-html

# Optional: create .env to auto-load Gemini key
echo "GEMINI_KEY=your_key_here" > .env
```

### Start

```bash
# Terminal / process 1 — CORS proxy
node proxy.mjs
# Listens on 127.0.0.1:3001

# Terminal / process 2 — static HTML server
npx serve -p 4321 .
# App is at http://<server-ip>:4321
```

### Notes on proxy behavior

The proxy (`proxy.mjs`) **binds to `127.0.0.1`** — not reachable from other machines. When served over HTTP, the app automatically falls back to:
1. `http://localhost:3001` — local proxy (dev only)
2. `https://api.allorigins.win` — public proxy fallback
3. `https://corsproxy.io` — second fallback

Users on other machines will silently use the public proxies — everything works.

### Keeping it running (pm2)

```bash
npm install -g pm2

pm2 start proxy.mjs --name rc-proxy
pm2 start "npx serve -p 4321 ." --name rc-serve --interpreter none

pm2 save        # persist across reboots
pm2 startup     # generates the systemd unit command — run what it prints
```

Check status: `pm2 list` / `pm2 logs rc-proxy`

### Firewall / Tailscale

Only expose the static file server port (e.g. 4321) via Tailscale ACLs. Port 3001 (the proxy) stays localhost-only.

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | The entire app — HTML, CSS, and JS in one file (~2700 lines) |
| `src/index.js` | Cloudflare Worker entry point: CORS proxy, `/env` endpoint, static serving |
| `wrangler.toml` | Cloudflare Workers config |
| `proxy.mjs` | Local Node.js CORS proxy (port 3001) for dev, also serves `.env` Gemini key |
| `.env` | *(gitignored)* `GEMINI_KEY=...` (for local dev only) |
| `CLAUDE.md` | Architecture notes for AI-assisted development |

---

## Architecture (quick reference)

`index.html` is structured as: `<style>` → `<body>` → `<script>`. No framework, no bundler.

**Layout (3 columns):**
```
┌──────────────────────────────────────────────────────────┐
│ #header (SSS dropdown, URL inputs, Play/Speed, API key) │
├────────────┬─────────────────────────┬───────────────────┤
│ #sidebar   │  #main                  │ #sidebar-right    │
│ (170px)    │  #vizWrap (charts/SVG)  │ (225px)           │
│ heat list  │  #tableWrap (table)     │ driver rows       │
│            │  #raceName              │ consistency board │
└────────────┴─────────────────────────┴───────────────────┘
```

**Mobile layout (≤768px):**
- All controls collapse into header (SSS dropdown, race URL input)
- Charts and tables stack full-width below header
- Driver sidebar below race data
- No animation on mobile (renders at completion)
- "🖥 Desktop Version" toggle at bottom

**Key state variables:**
```js
currentEvent    // { heats: [{name, url}], eventName }
currentHeat     // { results, raceId, className, heatName, _posMap }
leaderLap       // current animation frame (0..maxLeaderLap)
chartMode       // 'position' | 'laptime' | 'gap' | 'pace' | 'heatmap'
viewMode        // 'chart' | 'table'
highlightedDriver  // driver name string, or null
```

**Data flow:**
1. User pastes URL → `loadEventUrl()` or `loadRaceUrl()`
2. `fetchLiverc(url)` — tries local proxy → allorigins.win → corsproxy.io
3. `parseEventPage(html)` → heat list; `parseRacePage(html)` → results + lap times
4. `computeIncidents(results)` → adds `.lapMeta` and `.incidentCount` per driver
5. `computePositionsByLap(results)` → `{ posMap, maxLap }` cached on `currentHeat._posMap`
6. `computeRaceData(results, maxLap)` → `{ driverCumAt, gapAt }` (shared by Gap/Pace/Heatmap)
7. `renderVisualization()` dispatches to chart-specific render functions
8. `renderStats()` builds compact driver rows; hover triggers `showDriverPopup()`
9. `renderConsistency()` builds ranked bar chart in sidebar

See `CLAUDE.md` for full architecture details, gotchas, and liverc HTML structure.

---

## Incident algorithm

Ported from the original tdclaw scraper:

1. Filter out laps under 4 600 ms (pit stops / false laps)
2. Filter out laps over 3× the heat-wide average (anomalies)
3. Per driver: average their top-5 fastest clean laps
4. Any lap more than 2 000 ms above that average = **incident** (flagged in red everywhere)
