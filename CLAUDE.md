# CLAUDE.md — RC Race Replay (sssdash)

Context for AI-assisted development of this project.

## What this is

A single-file HTML app (`index.html`) that:
- Fetches RC car race data from liverc.com via a local CORS proxy
- Replays races lap-by-lap with animated SVG charts (5 chart modes)
- Provides a live timing table view alongside the charts
- Detects "incidents" (laps significantly slower than the driver's personal average)
- Calls the Gemini API for "Spicy Analysis" AI commentary
- Has a full mobile layout (≤768px) — SSS dropdown only, stacked charts, auto AI summary

No build step. Everything is in `index.html`. The only companion file needed at runtime is `proxy.mjs`.

## Deployment

**Cloudflare Workers:** `https://sssdash.tdimaggio.workers.dev`  
Push to `main` → auto-deploys via `wrangler.toml` + `src/index.js`.

**Local dev:**
```bash
node proxy.mjs          # start CORS proxy on port 3001 — keep open
npx serve -p 4321 .     # serve on localhost:4321 (matches .claude/launch.json for preview)
# then open http://localhost:4321
```

## Recent changes (2026-05-13)

- Renamed `rc-log.html` → `index.html` (serves at root URL)
- Motorsport theme: carbon + red palette, replaced all blue/purple tokens; Barlow font (non-condensed); all font sizes reduced 1px
- SSS button moved first in header, renamed to "🏁 Smallscale Speedway ▾"
- Full mobile layout implemented (see Mobile Layout section below)
- All 5 SVG charts now have `viewBox="0 0 ${W} ${H}"` for CSS scaling
- `VIZ_MR` changed from `const` to `let` so mobile renders can temporarily reduce it
- Spicy Analysis cached in `localStorage` (`rc_spicy_<raceId>:<maxLap>:<m|d>`); Regenerate button passes `force=true` to bypass
- Mobile driver list switched from compact rows to full popup-style cards via `renderMobileDrivers()`
- `parseRacePage` caps `r.lapTimes` to the official `r.laps` from the results table so transponder over-counts don't extend the chart past the official finish
- `computePositionsByLap` snaps the **final lap** to `r.position` from the results table (cum-time can disagree with race-official finishing order)

## Architecture: index.html (~2800 lines)

The file is structured as: `<style>` block → `<body>` HTML → `<script>` block.

### Desktop layout (3 columns)

```
┌──────────────────────────────────────────────────────┐
│  #header  (SSS btn, URL inputs, Play/Speed, API key) │
├────────────┬─────────────────────────┬───────────────┤
│ #sidebar   │  #main                  │ #sidebar-right│
│ (170px)    │  (flex-grow)            │ (225px)       │
│ heat list  │  #vizWrap (SVG charts)  │ driver rows   │
│            │  #tableWrap (HTML table)│ consistency   │
│            │  #raceName              │ spicy analysis│
└────────────┴─────────────────────────┴───────────────┘
```

`body { min-width: 820px }` prevents sidebars from collapsing in narrow viewports.

### Mobile layout (≤768px, body.mobile-active)

```
┌─────────────────────────┐
│  🏁 Smallscale Speedway │  ← SSS button only, full width
├─────────────────────────┤
│  #mobile-heat-list      │  ← heat list (Mains / Qualifiers), disappears after race loads
├─────────────────────────┤
│  🔥 Race Analysis       │  ← AI summary auto-generates on race load (facts-first prompt)
├─────────────────────────┤
│  Position / Lap / Gap   │  ← all 5 charts stacked full-width, no animation
│  Pace / Heatmap         │
├─────────────────────────┤
│  Driver Cards           │  ← full popup-style cards from renderMobileDrivers()
├─────────────────────────┤
│  🖥 Desktop Version     │  ← sets localStorage forceDesktop=1, reloads
└─────────────────────────┘
```

`#switchModeBtn` in header (hidden by default) — shown to small-screen desktop users (forceDesktop=1) to return to mobile.

### Key global state

```js
currentEvent      // { heats: [{name, url}], eventName } — null until event loaded
currentHeat       // { results, raceId, className, heatName, _posMap } — null until race loaded
leaderLap         // current animation frame (0..maxLeaderLap)
maxLeaderLap      // = currentHeat._posMap.maxLap
animTimer         // setInterval handle, null when paused
chartMode         // 'position' | 'laptime' | 'gap' | 'pace' | 'heatmap'
viewMode          // 'chart' | 'table'
highlightedDriver // driver name string, or null
```

### Data flow

1. User clicks SSS → `pickSSSEvent()` → `loadEvent(url)` → `loadEventUrl()`
2. On mobile: `renderMobileHeatList()` shows tappable heat items in `#mobile-heat-list`
3. User taps heat → `selectHeat(url)` → `loadRaceUrl()`
4. `fetchLiverc(url)` — tries `localhost:3001` proxy first, then allorigins.win, then corsproxy.io
5. `parseRacePage(html)` → results table + embedded JS `racerLaps[ID] = { laps: [{time: '10.185'}] }`
6. `computeIncidents(results)` → `computePositionsByLap(results)` → `computeRaceData(results, maxLap)`
7. `renderVisualization()` + `renderStats()` + `renderConsistency()`
8. On mobile: `renderMobileCharts()` + copy statsArea to `#mobile-drivers` + `generateSpicyAnalysis()`

### CORS proxy cascade (fetchLiverc)

```
1. http://localhost:3001/proxy?url=<encoded>   ← proxy.mjs (required for file:// origin)
2. https://api.allorigins.win/raw?url=<encoded>
3. https://corsproxy.io/?url=<encoded>
```

When served over HTTP (not `file://`), steps 2 and 3 work fine. The local proxy is only required
for `file://` origin and for the `/env` endpoint that auto-loads the Gemini key.

### Chart modes (renderVisualization dispatch)

| chartMode | Function | Notes |
|-----------|----------|-------|
| `'position'` | `renderPositionChart()` | Default; Y = position, X = lap |
| `'laptime'` | `renderLapTimeChart()` | Y = lap time; ★ = PB; incident dots red |
| `'gap'` | `renderGapChart()` | Y = gap to leader; leader flat at 0 |
| `'pace'` | `renderPaceChart()` | 3-lap rolling avg; incident laps excluded |
| `'heatmap'` | `renderHeatmapChart()` | Grid: rows=drivers, cols=laps; color = lap quality |

SVG charts are rebuilt from scratch on every animation tick. `leaderLap` controls draw depth.
All 5 charts have `viewBox="0 0 ${W} ${H}"` so CSS `width:100%; height:auto` scales them correctly.

SVG margin constants:
```js
let VIZ_MR = 140  // right (driver name labels) — temporarily set to 80 during mobile renders
const VIZ_ML = 30   // left  (position/lap labels)
const VIZ_MT = 16   // top
const VIZ_MB = 30   // bottom (lap number labels)
```

Heatmap uses its own `LABEL_W` (dynamic: `max(110, min(185, min(longestName, 18) * 8 + 32))`), not VIZ_MR.

### Mobile detection and rendering

```js
function isMobile() {
  return window.innerWidth <= 768 && localStorage.getItem('forceDesktop') !== '1';
}
function forceDesktop()      { localStorage.setItem('forceDesktop', '1'); location.reload(); }
function clearForceDesktop() { localStorage.removeItem('forceDesktop'); location.reload(); }
```

`renderMobileCharts()` off-screen render trick — `getBoundingClientRect()` returns 0 on hidden elements,
so charts would render at 700px fallback. Fix: temporarily un-hide `#vizWrap` off-screen at actual mobile
width, render all 5 modes, copy SVG innerHTML into `#mobile-chart-*` containers, restore.
Also temporarily sets `VIZ_MR = 80` (vs 140) so chart data gets more horizontal space on phone screens.

`renderMobileHeatList()` groups heats into Mains / Qualifiers sections, renders tappable items
into `#mobile-heat-list`. Items call `selectHeat(url)` → `loadRaceUrl()`. Heat list div is cleared
after race loads so it doesn't persist above the race content.

### Driver sidebar (right panel, desktop only)

Always shows compact `P# · Name + sparkline` rows. No expand/collapse toggle.

Hovering a row calls `showDriverPopup(el, driverName, colorIdx)` which:
- Builds full stats HTML (sparkline, grid→finish, best/avg/consistency/incidents/pos changes)
- Renders into `#driver-popup` (fixed-position div, escapes `overflow-y:auto` sidebar)
- Positions the popup to the left of the sidebar using `getBoundingClientRect()`

`hideDriverPopup()` is called on `mouseleave`.

### Animation

```js
// Play/pause toggles animTimer (setInterval)
// Each tick: leaderLap++, renderVisualization(), renderStats()
// Speed slider: 1–20, interval = 1000/speed ms
// At end: leaderLap resets to 0 (loops)
```

View/chart mode tabs (`#viewToggle`, `#chartTabs`) are inside `#raceControls` (shown on race load).

### Spicy Analysis (generateSpicyAnalysis)

Calls **Gemini 2.5 Flash** API directly from the browser:
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
- API key: read from `localStorage` key `rc_gemini_key`; also auto-loaded from proxy `/env` on startup
- Output target: `#mobile-analysis` on mobile, `#spicyArea` on desktop
- **Desktop prompt:** snarky pit-lane commentator — roast results with personality
- **Mobile prompt:** facts-first race analyst — winner, fastest lap, battles, incidents, pace
- **Cache:** rendered HTML stored in `localStorage` under `spicyCacheKey()` = `rc_spicy_<raceId>:<maxLap>:<m|d>`. Mobile/desktop cache separately (different prompts). A new lap busts the cache automatically (maxLap changes). The Regenerate button calls `generateSpicyAnalysis(true)` to skip cache and force a fresh API call.

### Incident algorithm (computeIncidents)

```
floorMs   = 4600          // ignore laps faster than this (pit laps)
heatAvg   = mean of all lap times across all drivers (after floor filter)
ceilingMs = heatAvg * 3  // ignore anomaly laps above this

Per driver:
  cleanLaps = lapTimes filtered by [floorMs, ceilingMs]
  top5avg   = mean of 5 fastest cleanLaps
  incident  = any lap where lapTime > top5avg + 2000
```

Each `result.lapMeta[i]` is `{ type: 'incident'|'clean'|'filtered', delta: ms }`.

### computePositionsByLap

```js
// Returns { posMap, maxLap }
// posMap[driverName] = [pos_at_lap0, pos_at_lap1, ..., pos_at_maxLap]
// lap 0      = qualifying grid position (result.qualPos)
// lap 1..N-1 = rank by (lapsComplete DESC, cumulativeTime ASC)  ← approximation
// lap N      = snap to r.position from the results table        ← authoritative
```

The final-lap snap is necessary because transponder cum-time can disagree with the race-official finishing order — e.g. in race 6755597 (event 504950) Boyd hit lap 34 at ~293 s while Sole hit it at 301.194 s, but officials gave P1 to Sole. The intermediate-lap algorithm is still cum-time-based since the table only records final positions.

`parseRacePage` also caps `r.lapTimes` to `r.laps` from the table before this runs — drops over-count transponder pings so the chart's X axis matches the official lap count.

## liverc.com HTML structure

**Event page** (`?p=view_event&id=XXXXXX`):
- Heat links: `<a href="...?p=view_race_result&id=YYYYYY">Heat Name</a>`

**Race page** (`?p=view_race_result&id=YYYYYY`):
- Results table: position, driver name, laps, total time, best lap, ..., consistency% (col 12)
- Embedded JS (in a `<script>` tag): `racerLaps[12345] = { 'driverName': 'TONY', 'laps': [{'time': '10.185', ...}, ...] }`

## Example URLs (ssspeedway)

- Event: `https://ssspeedway.liverc.com/results/?p=view_event&id=504950`
- Race:  `https://ssspeedway.liverc.com/results/?p=view_race_result&id=6755593`

Event 504950 has 21 heats. Race 6755593 has 4 drivers (MATT STEFANS, DYLAN HOFFMAN, JAEDAN, TD), 28 laps.

## Key functions reference

| Function | Purpose |
|----------|---------|
| `loadEventUrl(url)` | Fetch + parse event, render heat list + event summary cards |
| `loadRaceUrl(url)` | Fetch + parse race, reset view/chart mode, render everything |
| `fetchLiverc(url)` | CORS proxy waterfall (local → allorigins → corsproxy) |
| `parseEventPage(html)` | Extract heat list |
| `parseRacePage(html)` | Extract results, lap times, consistency% |
| `computeIncidents(results)` | Add lapMeta/incidentCount to each result |
| `computePositionsByLap(results)` | Build posMap, returns {posMap, maxLap} |
| `computeRaceData(results, maxLap)` | Returns {driverCumAt, gapAt} for gap/pace/heatmap |
| `renderVisualization()` | Dispatch to chart render function based on chartMode |
| `renderPositionChart()` | SVG position-over-laps |
| `renderLapTimeChart()` | SVG individual lap times |
| `renderGapChart()` | SVG gap to leader |
| `renderPaceChart()` | SVG 3-lap rolling average |
| `renderHeatmapChart()` | SVG lap quality grid |
| `renderTable()` | HTML timing table (viewMode='table') |
| `renderStats()` | Compact driver rows in right sidebar |
| `showDriverPopup(el, name, colorIdx)` | Float full-stats popup on hover |
| `hideDriverPopup()` | Hide the popup |
| `buildSparkline(driver, color)` | 80×22px inline SVG lap time sparkline |
| `renderConsistency()` | Ranked consistency bar chart |
| `renderEventSummary()` | Heat card grid in main area |
| `setChartMode(mode)` | Switch chart tab, re-render |
| `setViewMode(mode)` | Switch chart/table, show/hide #vizWrap/#tableWrap |
| `toggleDriverHighlight(name)` | Highlight driver across all chart elements |
| `generateSpicyAnalysis()` | Call Gemini API, render commentary |
| `isMobile()` | Returns true if ≤768px and forceDesktop not set |
| `forceDesktop()` | Sets localStorage flag, reloads as desktop |
| `clearForceDesktop()` | Clears flag, reloads as mobile |
| `renderMobileCharts()` | Render all 5 charts into #mobile-chart-* containers |
| `renderMobileHeatList()` | Render tappable heat list into #mobile-heat-list |
| `renderMobileDrivers()` | Render full popup-style driver cards into #mobile-drivers |
| `spicyCacheKey()` | Build `rc_spicy_<raceId>:<maxLap>:<m\|d>` cache key |
| `msToStr(ms)` | Format milliseconds as `m:ss.xxx` |

## Known gotchas

- `#tableWrap` has `display:none` in the stylesheet — must set `element.style.display = 'block'` explicitly (not `''`), or the stylesheet rule wins
- `proxy.mjs` binds to `127.0.0.1` — not reachable from other machines; hosted users fall through to public proxies automatically
- Port 3001 EADDRINUSE: `lsof -ti:3001 | xargs kill -9`
- `qualPos` may be null if the race page has no qualifying data — drivers default to position 99 (sorted last at lap 0)
- Heatmap LABEL_W accounts for ALL CAPS Barlow font at 11px ≈ 8px/char
- The `.claude/launch.json` configures Claude Code's preview server (`npx serve -p 4321 .`)
- `applyHighlight()` targets both `[data-drivername]` (SVG charts) and `[data-driver]` (heatmap) attributes
- `getBoundingClientRect()` returns 0 on `display:none` elements — mobile chart render must temporarily un-hide `#vizWrap` off-screen before calling render functions
- `VIZ_MR` is `let` (not `const`) so `renderMobileCharts()` can temporarily set it to 80 and restore after
- Gemini API key is stored in `localStorage` key `rc_gemini_key` and also auto-loaded from `/env` on the proxy; free tier so no billing risk if key is exposed
- Spicy Analysis cache lives in `localStorage` under `rc_spicy_*` keys — if a user wants to wipe all cached commentary, clear those keys (the Regenerate button only busts the *current* race's cache)
- `r.position` from the results table is the source of truth for finishing order — `computePositionsByLap` snaps the final lap to it. If a future feature recomputes positions, follow the same convention to keep chart/sidebar consistent
