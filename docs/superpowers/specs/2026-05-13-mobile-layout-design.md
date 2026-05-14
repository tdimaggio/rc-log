# Mobile Layout — Design Spec

**Date:** 2026-05-13  
**Goal:** Add a responsive mobile layout for phones (≤768px) focused on today's SSS races — charts, driver cards, and AI summary — with no animation/replay.

---

## Scope

**Single file: `index.html`**

Changes: `<style>` block (media queries), `<body>` HTML (new `#mobileView` div), `<script>` block (mobile detection, chart rendering, AI prompt).

No new files. No changes to `proxy.mjs`, `src/index.js`, or `wrangler.toml`.

---

## Breakpoint

`@media (max-width: 768px)` — covers portrait phones and small tablets. Desktop layout unchanged above this width.

---

## Mobile Layout — Scroll Order

```
┌─────────────────────────┐
│  🏁 Smallscale Speedway │  ← SSS button only, full width
├─────────────────────────┤
│  🤖 AI Race Summary     │  ← auto-generates on race load
├─────────────────────────┤
│  Position Chart         │
│  Lap Time Chart         │
│  Gap Chart              │  ← all 5, full width, stacked, no animation
│  Pace Chart             │
│  Heatmap                │
├─────────────────────────┤
│  Driver Cards           │  ← compact rows, scrollable, no hover
├─────────────────────────┤
│  🖥 Desktop Version     │  ← button at bottom
└─────────────────────────┘
```

---

## Header on Mobile

**Visible:** SSS dropdown button only (`#sssBtn`), full width.

**Hidden:**
- `#eventUrl` input
- `#raceUrl` input  
- "Load Race Night" button
- "Load Single Race" button
- `.sep` separators
- `.speed-wrap` (speed slider)
- `#apiKeyInput`

The SSS dropdown is the only entry point on mobile. Users pick a race from today's events.

---

## Desktop Controls Hidden on Mobile

- `#sidebar-left` (heat list)
- `#sidebar-right` (driver stats, consistency board, Spicy Analysis)
- `#raceControls` (chart tabs, view toggle)
- `#scrubberWrap`
- `#vizWrap`
- `#tableWrap`

---

## New: `#mobileView` div

Added to `<body>` after `#header`, hidden on desktop (`display: none`), shown on mobile.

Contains:
- `#mobile-analysis` — AI summary output
- `#mobile-chart-position` — position chart container
- `#mobile-chart-laptime` — lap time chart container
- `#mobile-chart-gap` — gap chart container
- `#mobile-chart-pace` — pace chart container
- `#mobile-chart-heatmap` — heatmap chart container
- `#mobile-drivers` — driver card rows
- `#mobile-desktop-btn` — "🖥 Desktop Version" button

---

## Chart Rendering on Mobile

The existing render functions (`renderPositionChart`, `renderLapTimeChart`, etc.) each write SVG into `#vizWrap`. On mobile, after a race loads:

1. Jump immediately to `maxLeaderLap` (no animation)
2. For each of the 5 chart modes, set `chartMode`, call `renderVisualization()`, copy the resulting `#vizWrap` innerHTML into the corresponding `#mobile-chart-*` container
3. Restore `chartMode` to `'position'` after

Desktop code path is unchanged. The same render functions are called — they just run 5 times on mobile and their output is duplicated into mobile containers.

Each mobile chart container has a label header (e.g., "Position", "Lap Times") above the SVG.

---

## Driver Cards on Mobile

`renderStats()` already produces compact `.stat-row` driver rows into the right sidebar's stats container. On mobile, after `renderStats()` runs, clone its innerHTML and inject it into `#mobile-drivers`.

No tap-to-expand interaction. Static display only. Sparklines included (they're inline SVGs, already work at any width).

---

## AI Summary on Mobile

**Behavior:** Auto-calls `generateSpicyAnalysis()` immediately after race data loads on mobile. No button required — the summary appears at the top of `#mobileView`.

**Prompt:** Different from desktop. Mobile prompt is facts-first:
- Key position battles and changes
- Who had the best pace
- Notable incidents
- Fastest laps and who set them
- Race result summary

Desktop prompt (snarky pit lane reporter) is unchanged.

**Detection:** `isMobile()` returns `window.innerWidth <= 768`. Used in `loadRaceUrl()` to branch behavior.

---

## Desktop Version Button

At the bottom of `#mobileView`:

```html
<button id="mobile-desktop-btn" onclick="forceDesktop()">🖥 Desktop Version</button>
```

`forceDesktop()`:
1. Sets `localStorage.setItem('forceDesktop', '1')`
2. Calls `location.reload()`

On page load, if `localStorage.getItem('forceDesktop') === '1'`, skip mobile layout entirely (treat as desktop regardless of screen width).

A "📱 Mobile Version" link shown in the desktop header on small screens lets the user go back:
1. Clears the `forceDesktop` flag
2. Reloads

---

## Mobile Detection Function

```js
function isMobile() {
  return window.innerWidth <= 768 && localStorage.getItem('forceDesktop') !== '1';
}
```

Used in:
- `loadRaceUrl()` — skip animation, render all charts, auto-trigger AI summary
- `generateSpicyAnalysis()` — pick mobile vs desktop prompt

---

## What Does NOT Change

- All 5 chart render functions
- `renderStats()` driver rows
- `generateSpicyAnalysis()` function signature
- Desktop layout, colors, fonts
- SSS dropdown behavior
- `proxy.mjs` / `src/index.js`
