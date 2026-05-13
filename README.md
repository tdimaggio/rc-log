# RC Race Replay

A single-file browser app that fetches RC car race data from [liverc.com](https://liverc.com), replays races lap-by-lap with animated charts, detects incidents, and generates AI race commentary.

No build step. No dependencies. Just `rc-log.html` + a tiny CORS proxy.

![screenshot](Screenshot%202026-05-13%20163826.png)

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
- Collapsible card stack — one click squishes all cards to compact rows with sparklines
- Per-driver stats: grid position → finish, best/avg lap, consistency %, incidents
- **Lap time sparkline** on every card — incident laps shown as red dots
- **Consistency board** below the cards — horizontal bar chart ranked by consistency %, color-coded green/yellow/red. Falls back to a coefficient-of-variation calculation if liverc doesn't report it.

### Event summary
Load an event URL and see a clickable card grid of all heats — click any card to load that race instantly.

### Other
- **Incident detection** — any lap 2 s+ above the driver's top-5 average is flagged
- **Spicy Analysis** — AI commentary via Gemini (API key required), roasts the results with actual lap times and driver names
- Scrubber bar + keyboard controls (Space = play/pause, ← → = step laps)
- Resizable panels (drag the dividers)
- Shareable URL hash — paste a URL into the browser bar and share it

## Running locally

1. **Start the CORS proxy** (required — liverc.com blocks browser CORS):

   ```bash
   node proxy.mjs
   ```

   Keep this terminal open. The proxy listens on `http://localhost:3001`.

2. **Open the app:**
   ```bash
   npx serve -p 4321 .
   # then open http://localhost:4321/rc-log.html
   ```
   Or just open `rc-log.html` directly in your browser (`file://...`).

3. **API key** — paste your Gemini API key into the key field in the header. It's saved in `localStorage`. You can also set `GEMINI_KEY=...` in a `.env` file and the proxy will auto-load it.

## Files

| File | Purpose |
|------|---------|
| `rc-log.html` | The entire app — HTML, CSS, and JS in one file (~2400 lines) |
| `proxy.mjs` | Tiny Node.js CORS proxy (port 3001), also serves `.env` key to the app |
| `.env` | (gitignored) `GEMINI_KEY=...` |

## Incident algorithm

Ported from the original tdclaw scraper:

1. Filter out laps under 4 600 ms (pit stops / false laps)
2. Filter out laps over 3× the heat-wide average (anomalies)
3. Per driver: average their top-5 fastest clean laps
4. Any lap more than 2 000 ms above that average = **incident** (flagged in red everywhere)
