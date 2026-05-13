# RC Race Replay

A single-file browser app that fetches RC car race data from [liverc.com](https://liverc.com), visualizes position changes lap-by-lap with animation, highlights incidents, and generates AI commentary.

## Features

- Paste a liverc **event URL** (`?p=view_event&id=...`) to load all heats, or a **race URL** (`?p=view_race_result&id=...`) to jump straight to a race
- Animated **position-over-laps** chart — Y axis = position (1 at top), X axis = lap number
- **Incident detection**: any lap 2 s+ slower than the driver's top-5 lap average is flagged in red
- **Spicy Analysis** AI commentary powered by Claude (Anthropic API key required)
- Driver stats sidebar: fastest lap, avg lap, laps completed, incidents

## Running locally

1. **Start the CORS proxy** (required — the app fetches liverc.com HTML which blocks browser CORS):

   ```bash
   node proxy.mjs
   ```

   Keep this terminal open. The proxy listens on `http://localhost:3001`.

2. **Open the app** — either:
   - Open `rc-log.html` directly in your browser (`file://...`), or
   - Serve it with any static server (e.g. `npx serve -p 4321 .`)

3. **API key** — paste your Anthropic API key into the key field (top-right) once. It is saved in `localStorage`. You can also put it in a `.env` file as `ANTHROPIC_KEY=sk-ant-...` if you are opening via a local server that injects it — but the manual paste always works.

## Files

| File | Purpose |
|------|---------|
| `rc-log.html` | The entire app — HTML, CSS, and JS in one file |
| `proxy.mjs` | Tiny Node.js CORS proxy (port 3001) |
| `.env` | (gitignored) `ANTHROPIC_KEY=sk-ant-...` |

## Incident algorithm

Ported from the original tdclaw scraper:

1. Filter out laps under 4 600 ms (pit stops / false laps)
2. Filter out laps over 3× the heat-wide average (anomalies)
3. Per driver: take the average of their top-5 fastest clean laps
4. Any lap more than 2 000 ms above that average = **incident**
