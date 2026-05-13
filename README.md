# RC Race Replay

A single-file browser app that fetches RC car race data from [liverc.com](https://liverc.com), replays races lap-by-lap with animated charts, detects incidents, and generates AI race commentary.

No build step. No npm install. Just `rc-log.html` + a tiny CORS proxy (`proxy.mjs`).

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
| **Heat Map** | Lap quality grid — cells color-coded from personal best (solid) to incident (pulsing red 💥) |

### Table view
Switch from charts to a **live timing table** — every driver × every lap, with cell colors for fastest lap of race (green), personal bests (yellow), and incidents (red). Consistency score shown in the driver column (🎯 for locked-in drivers, 🌪️ for chaos).

### Driver sidebar
- Compact `P# · Name + sparkline` rows for every driver
- **Hover any row** for a floating popup with full stats: grid→finish, best/avg lap, consistency %, incidents, position changes
- **Consistency board** below the driver list — horizontal bar chart ranked by consistency %, color-coded green/yellow/red. Falls back to coefficient-of-variation if liverc doesn't report it.

### Event summary
Load an event URL and see a clickable card grid of all heats — click any card to load that race instantly.

### Other
- **Incident detection** — any lap 2 s+ above the driver's top-5 average is flagged
- **Spicy Analysis** — AI commentary via Gemini (API key required), roasts the results with actual lap times and driver names
- Scrubber bar + keyboard controls (Space = play/pause, ← → = step laps)
- Resizable panels (drag the dividers)
- Shareable URL hash — paste a liverc URL into the browser bar and share it

---

## Running locally (dev)

```bash
# Terminal 1 — CORS proxy (required for file:// origin)
node proxy.mjs

# Terminal 2 — static file server
npx serve -p 4321 .
# then open http://localhost:4321/rc-log.html
```

Or just open `rc-log.html` directly from the filesystem (`file://...`) — the proxy is still needed.

**API key** — paste your Gemini API key into the key field in the header. Saved in `localStorage`. You can also put `GEMINI_KEY=...` in a `.env` file and the proxy will auto-load it into the app.

---

## Deploying on a Linux server

### Prerequisites

- **Node.js 18+** (for native ESM support — `node proxy.mjs` uses `import`)
- No npm packages required
- A static file server: `npx serve`, nginx, caddy, or even `python3 -m http.server`

### Setup

```bash
git clone https://github.com/tdimaggio/rc-log
cd rc-log
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
# App is at http://<server-ip>:4321/rc-log.html
```

### Notes on proxy behavior when hosted

The proxy (`proxy.mjs`) **binds to `127.0.0.1`** — it is not reachable from other machines by default.

When the HTML is served over HTTP (not `file://`), the app automatically waterfalls through three CORS proxy options:
1. `http://localhost:3001` — works when proxy is running **on the same machine as the browser** (local dev)
2. `https://api.allorigins.win` — public proxy, works fine from a hosted origin
3. `https://corsproxy.io` — second public fallback

**Bottom line for Tailscale / network hosting:** users browsing from another machine will silently fall through to `allorigins.win` — everything works. The local proxy is only needed when opening `rc-log.html` directly from the filesystem.

The proxy's `/env` endpoint (which serves the Gemini key from `.env`) is only accessible from localhost. For hosted users, the Gemini key must be entered manually in the header — it's saved in `localStorage` and persists across sessions.

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

Only expose the static file server port (e.g. 4321) via Tailscale ACLs. Port 3001 (the proxy) should stay localhost-only.

---

## Files

| File | Purpose |
|------|---------|
| `rc-log.html` | The entire app — HTML, CSS, and JS in one file (~2400 lines) |
| `proxy.mjs` | Tiny Node.js CORS proxy (port 3001), also serves `.env` Gemini key to the app |
| `.env` | *(gitignored)* `GEMINI_KEY=...` |
| `CLAUDE.md` | Architecture notes for AI-assisted development |

---

## Architecture (quick reference)

The file is structured as: `<style>` → `<body>` → `<script>`. No framework, no bundler.

**Layout (3 columns):**
```
┌──────────────────────────────────────────────────────┐
│  #header  (URL inputs, Play/Speed, API key)          │
├────────────┬─────────────────────────┬───────────────┤
│ #sidebar   │  #main                  │ #sidebar-right│
│ (170px)    │  #vizWrap (charts/SVG)  │ (225px)       │
│ heat list  │  #tableWrap (table)     │ driver rows   │
│            │  #raceName              │ consistency   │
└────────────┴─────────────────────────┴───────────────┘
```

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
