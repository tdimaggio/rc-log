# CLAUDE.md — RC Race Replay

Context for AI-assisted development of this project.

## What this is

A single-file HTML app (`rc-log.html`) that:
- Scrapes race data from liverc.com via a local CORS proxy
- Shows an animated position-over-laps SVG chart (Y=position 1 at top, X=lap number)
- Detects "incidents" (laps significantly slower than the driver's personal average)
- Calls the Anthropic Claude API for "Spicy Analysis" AI commentary

There is no build step. Everything is in `rc-log.html`. The only companion file needed at runtime is `proxy.mjs`.

## How to run

```bash
node proxy.mjs          # start CORS proxy on port 3001 — keep open
# then open rc-log.html in a browser, or:
npx serve -p 4321 .     # serve on localhost:4321 (matches .claude/launch.json for preview)
```

## Architecture: rc-log.html

The file is structured as: `<style>` block → `<body>` HTML → `<script>` block.

### Layout (3 columns)

```
┌──────────────────────────────────────────────────────┐
│  #header  (URL inputs, Play/Speed controls, API key) │
├────────────┬─────────────────────────┬───────────────┤
│ #sidebar   │  #main                  │ #stats        │
│ (170px)    │  (flex-grow)            │ (210px)       │
│ heat list  │  #vizArea (SVG chart)   │ driver cards  │
│            │  #raceName              │ spicy analysis│
└────────────┴─────────────────────────┴───────────────┘
```

`body { min-width: 820px }` prevents sidebars from collapsing in narrow viewports.

### Key global state

```js
currentEvent   // { heats: [{name, url}], eventName } — null until event loaded
currentHeat    // { results, raceId, _posMap: { posMap, maxLap } } — null until race loaded
leaderLap      // current animation frame (0..maxLeaderLap)
maxLeaderLap   // = currentHeat._posMap.maxLap
animTimer      // setInterval handle, null when paused
```

### Data flow

1. User pastes URL → `loadEventUrl()` or `loadRaceUrl()` (auto-detected)
2. `fetchLiverc(url)` — tries `localhost:3001` proxy first, then allorigins.win, then corsproxy.io
3. `parseEventPage(html)` → extracts heat list from `<a href="...view_race_result...">` links
4. `parseRacePage(html)` → results table + embedded JS `racerLaps[ID] = { laps: [{time: '10.185'}] }`
5. `computeIncidents(results)` — adds `.lapMeta` and `.incidents` to each result
6. `computePositionsByLap(results)` → `{ posMap, maxLap }` cached on `currentHeat._posMap`
7. `renderVisualization()` — builds SVG string, sets `#vizArea innerHTML`
8. `renderStats()` — builds driver stat cards + incident list

### CORS proxy cascade (fetchLiverc)

```
1. http://localhost:3001/proxy?url=<encoded>   ← proxy.mjs (required for file:// origin)
2. https://api.allorigins.win/raw?url=<encoded>
3. https://corsproxy.io/?url=<encoded>
```

`proxy.mjs` must be running. External proxies block `file://` origin entirely.

### Incident algorithm (computeIncidents)

Ported exactly from tdclaw's `scraper.mjs`:

```
floorMs  = 4600           // ignore laps faster than this (pit laps)
heatAvg  = mean of all lap times across all drivers (after floor filter)
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

### renderVisualization (SVG)

Constants controlling chart margins:
```js
VIZ_ML = 30   // left (position number labels)
VIZ_MR = 140  // right (driver name labels)
VIZ_MT = 16   // top
VIZ_MB = 30   // bottom (lap number labels)
```

`rowH` is auto-computed from driver count to fill ~300px height.

The SVG is rebuilt from scratch on every animation tick. `leaderLap` controls how far lines are drawn.

### Animation

```js
// Play/pause toggles animTimer
// Each tick: leaderLap++, renderVisualization(), renderStats()
// Speed slider: 1–20, interval = 1000/speed ms
// At end: leaderLap resets to 0 (loops)
```

### Spicy Analysis (generateSpicyAnalysis)

Calls `claude-sonnet-4-6` via the Anthropic API directly from the browser:
- Header `anthropic-dangerous-direct-browser-access: true` is required
- API key read from `localStorage` (key: `rclog_api_key`)
- Prompt includes race name, driver standings, incident counts, fastest laps

## liverc.com HTML structure

**Event page** (`?p=view_event&id=XXXXXX`):
- Heat links: `<a href="...?p=view_race_result&id=YYYYYY">Heat Name</a>`

**Race page** (`?p=view_race_result&id=YYYYYY`):
- Results table: position, driver name, laps, total time, best lap columns
- Embedded JS (in a `<script>` tag): `racerLaps[12345] = { 'driverName': 'TONY', 'laps': [{'time': '10.185', ...}, ...] }`

## Example URLs (ssspeedway)

- Event: `https://ssspeedway.liverc.com/results/?p=view_event&id=504950`
- Race:  `https://ssspeedway.liverc.com/results/?p=view_race_result&id=6755593`

Event 504950 has 21 heats. Race 6755593 has 4 drivers (MATT STEFANS, DYLAN HOFFMAN, JAEDAN, TD), 28 laps.

## Known issues / gotchas

- The proxy **must** be running at port 3001. If you get "All proxies failed", check `node proxy.mjs` is up.
- Port 3001 EADDRINUSE: kill with `lsof -ti:3001 | xargs kill -9`
- `qualPos` may be null if the race page doesn't include qualifying data — drivers default to position 99 (sorted last at lap 0)
- The `.claude/launch.json` configures Claude Code's preview server (`npx serve -p 4321 .`)
