# CLAUDE.md — RC Race Replay

Context for AI-assisted development of this project.

## What this is

A single-file HTML app (`rc-log.html`) that:
- Fetches RC car race data from liverc.com via a local CORS proxy
- Replays races lap-by-lap with animated SVG charts (5 chart modes)
- Provides a live timing table view alongside the charts
- Detects "incidents" (laps significantly slower than the driver's personal average)
- Calls the Gemini API for "Spicy Analysis" AI commentary

No build step. Everything is in `rc-log.html`. The only companion file needed at runtime is `proxy.mjs`.

## How to run

```bash
node proxy.mjs          # start CORS proxy on port 3001 — keep open
npx serve -p 4321 .     # serve on localhost:4321 (matches .claude/launch.json for preview)
# then open http://localhost:4321/rc-log.html
```

## Architecture: rc-log.html (~2400 lines)

The file is structured as: `<style>` block → `<body>` HTML → `<script>` block.

### Layout (3 columns)

```
┌──────────────────────────────────────────────────────┐
│  #header  (URL inputs, Play/Speed controls, API key) │
├────────────┬─────────────────────────┬───────────────┤
│ #sidebar   │  #main                  │ #sidebar-right│
│ (170px)    │  (flex-grow)            │ (225px)       │
│ heat list  │  #vizWrap (SVG charts)  │ driver rows   │
│            │  #tableWrap (HTML table)│ consistency   │
│            │  #raceName              │ spicy analysis│
└────────────┴─────────────────────────┴───────────────┘
```

`body { min-width: 820px }` prevents sidebars from collapsing in narrow viewports.

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

1. User pastes URL → `loadEventUrl()` or `loadRaceUrl()` (auto-detected by URL shape)
2. `fetchLiverc(url)` — tries `localhost:3001` proxy first, then allorigins.win, then corsproxy.io
3. `parseEventPage(html)` → extracts heat list from `<a href="...view_race_result...">` links
4. `parseRacePage(html)` → results table + embedded JS `racerLaps[ID] = { laps: [{time: '10.185'}] }`
   - Also parses `consistencyPct` from column 12 of the results table
5. `computeIncidents(results)` — adds `.lapMeta`, `.incidentCount`, `.fastestLapMs`, `.avgLapMs`
6. `computePositionsByLap(results)` → `{ posMap, maxLap }` cached on `currentHeat._posMap`
7. `computeRaceData(results, maxLap)` → `{ driverCumAt, gapAt }` — shared by Gap/Pace/Heatmap charts
8. `renderVisualization()` — dispatches to chart-specific render function based on `chartMode`
9. `renderStats()` — compact driver rows; hover triggers `showDriverPopup()`
10. `renderConsistency()` — ranked consistency bar chart in `#fastestLapsArea`

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

SVG margin constants:
```js
VIZ_ML = 30   // left  (position/lap labels)
VIZ_MR = 140  // right (driver name labels)
VIZ_MT = 16   // top
VIZ_MB = 30   // bottom (lap number labels)
```

Heatmap uses its own `LABEL_W` (dynamic, computed from longest driver name: `max(110, min(185, min(longestName, 18) * 8 + 32))`).

### Driver sidebar (right panel)

Always shows compact `P# · Name + sparkline` rows. No expand/collapse toggle.

Hovering a row calls `showDriverPopup(el, driverName, colorIdx)` which:
- Builds full stats HTML (sparkline, grid→finish, best/avg/consistency/incidents/pos changes)
- Renders into `#driver-popup` (fixed-position div, escapes `overflow-y:auto` sidebar)
- Positions the popup to the left of the sidebar using `getBoundingClientRect()`

`hideDriverPopup()` is called on `mouseleave`.

Below the driver rows: `#sparklineHint` (small italic label) + `#fastestLapsArea` (consistency board).

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
- Prompt includes race name, driver standings, incident counts, fastest laps

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
// lap 0 = qualifying grid position (result.qualPos)
// lap N = rank by (lapsComplete DESC, cumulativeTime ASC)
```

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
| `msToStr(ms)` | Format milliseconds as `m:ss.xxx` |

## Known gotchas

- `#tableWrap` has `display:none` in the stylesheet — must set `element.style.display = 'block'` explicitly (not `''`), or the stylesheet rule wins
- `proxy.mjs` binds to `127.0.0.1` — not reachable from other machines; hosted users fall through to public proxies automatically
- Port 3001 EADDRINUSE: `lsof -ti:3001 | xargs kill -9`
- `qualPos` may be null if the race page has no qualifying data — drivers default to position 99 (sorted last at lap 0)
- ALL CAPS Inter font at 11px ≈ 8px/char (wider than it looks) — heatmap LABEL_W accounts for this
- The `.claude/launch.json` configures Claude Code's preview server (`npx serve -p 4321 .`)
- `applyHighlight()` targets both `[data-drivername]` (SVG charts) and `[data-driver]` (heatmap) attributes
