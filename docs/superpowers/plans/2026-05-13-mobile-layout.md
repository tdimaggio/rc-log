# Mobile Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a responsive mobile layout (≤768px) to `index.html` — SSS dropdown as the entry point, AI summary at top, all 5 charts stacked full-width, driver cards, and a "Desktop Version" escape button.

**Architecture:** JS-class-driven mobile detection (`body.mobile-active`) instead of pure CSS media queries, so the `forceDesktop` localStorage flag gives us full JS control over layout switching. All 5 charts are rendered by calling existing render functions 5 times and copying SVG output into dedicated mobile containers. Desktop code path is unchanged.

**Tech Stack:** Vanilla CSS + JS, no new dependencies.

---

## File Map

| File | Action |
|---|---|
| `index.html` | Modify — `<style>` block, `<body>` HTML, `<script>` block |

---

## Task 1: Add mobile utility functions + startup init

**Files:**
- Modify: `index.html` — `<script>` block, before the startup section (around line 2492)

- [ ] **Step 1: Insert the mobile utility functions**

Find this line (near bottom of `<script>`):

```js
// ═══════════════════════════════════════════════════════════════
//  Startup — restore from URL hash, then localStorage, load env key
// ═══════════════════════════════════════════════════════════════
```

Insert immediately before it:

```js
// ═══════════════════════════════════════════════════════════════
//  Mobile layout
// ═══════════════════════════════════════════════════════════════
function isMobile() {
  return window.innerWidth <= 768 && localStorage.getItem('forceDesktop') !== '1';
}

function forceDesktop() {
  localStorage.setItem('forceDesktop', '1');
  location.reload();
}

function clearForceDesktop() {
  localStorage.removeItem('forceDesktop');
  location.reload();
}

```

- [ ] **Step 2: Apply mobile class and show switch button on startup**

Find this line in the startup section:

```js
readUrlHash();
```

Insert immediately after it:

```js
if (isMobile()) {
  document.documentElement.classList.add('mobile-active');
  document.body.classList.add('mobile-active');
}
if (window.innerWidth <= 768 && !isMobile()) {
  document.getElementById('switchModeBtn').style.display = '';
}
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(mobile): add isMobile, forceDesktop utilities"
```

---

## Task 2: Add `#mobileView` HTML and `#switchModeBtn` to header

**Files:**
- Modify: `index.html` — `<body>`, two insertions

- [ ] **Step 1: Add `#switchModeBtn` to the header**

Find this exact line in `#header`:

```html
  <input type="password" id="apiKeyInput" placeholder="Gemini API Key" />
</div>
```

Replace with:

```html
  <input type="password" id="apiKeyInput" placeholder="Gemini API Key" />
  <button class="btn" id="switchModeBtn" style="display:none" onclick="clearForceDesktop()">📱 Mobile</button>
</div>
```

- [ ] **Step 2: Add `#mobileView` div**

Find this exact line (right after `#main` closes):

```html
<div id="tooltip"></div>
```

Insert immediately before it:

```html
<!-- ── Mobile View ────────────────────────────────────────────── -->
<div id="mobileView">
  <div class="mobile-section-label">🔥 Race Analysis</div>
  <div id="mobile-analysis"><span style="color:#555555">Load a race using the button above.</span></div>

  <div class="mobile-section-label">Position</div>
  <div class="mobile-chart-wrap" id="mobile-chart-position"></div>

  <div class="mobile-section-label">Lap Times</div>
  <div class="mobile-chart-wrap" id="mobile-chart-laptime"></div>

  <div class="mobile-section-label">Gap to Leader</div>
  <div class="mobile-chart-wrap" id="mobile-chart-gap"></div>

  <div class="mobile-section-label">Pace (3-lap avg)</div>
  <div class="mobile-chart-wrap" id="mobile-chart-pace"></div>

  <div class="mobile-section-label">Heat Map</div>
  <div class="mobile-chart-wrap" id="mobile-chart-heatmap"></div>

  <div class="mobile-section-label">Drivers</div>
  <div id="mobile-drivers"></div>

  <button class="btn" id="mobile-desktop-btn" onclick="forceDesktop()">🖥 Desktop Version</button>
</div>

```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(mobile): add mobileView HTML and switchModeBtn"
```

---

## Task 3: Add mobile CSS

**Files:**
- Modify: `index.html` — `<style>` block, insert before `</style>`

- [ ] **Step 1: Add mobile CSS at the end of the `<style>` block**

Find this exact line (it is the last rule in the `<style>` block):

```css
    #apiKeyInput { width: 210px; }
```

Insert the following block immediately after it (still inside `<style>`, before `</style>`):

```css

    /* ── Mobile Layout ───────────────────────────────────────────── */
    #mobileView { display: none; }

    html.mobile-active { height: auto; overflow-y: auto; }
    body.mobile-active {
      min-width: unset;
      overflow-y: auto;
      overflow-x: hidden;
      height: auto;
    }

    /* Header */
    body.mobile-active #header {
      flex-direction: column;
      align-items: stretch;
      gap: 6px;
    }
    body.mobile-active #header .sss-wrap,
    body.mobile-active #header #sssBtn { width: 100%; }
    body.mobile-active #header #eventUrl,
    body.mobile-active #header #raceUrl,
    body.mobile-active #header .sep,
    body.mobile-active #header .speed-wrap,
    body.mobile-active #header #apiKeyInput { display: none !important; }
    body.mobile-active #header .btn:not(#sssBtn):not(#switchModeBtn) { display: none !important; }

    /* Hide desktop layout pieces */
    body.mobile-active #sidebar-left,
    body.mobile-active #sidebar-right,
    body.mobile-active .resize-handle,
    body.mobile-active .resize-handle-h,
    body.mobile-active #raceControls,
    body.mobile-active #scrubberWrap,
    body.mobile-active #race-header,
    body.mobile-active #vizWrap,
    body.mobile-active #tableWrap,
    body.mobile-active #spicyPanel { display: none !important; }
    body.mobile-active #main { display: block; height: auto; overflow: visible; }
    body.mobile-active #center { flex: none; overflow: visible; }

    /* Mobile view */
    body.mobile-active #mobileView {
      display: block;
      padding: 0 12px 32px;
    }
    .mobile-section-label {
      font-size: 10px;
      font-weight: 600;
      color: #555555;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      padding: 16px 0 8px;
    }
    #mobile-analysis {
      padding: 12px;
      background: #111111;
      border: 1px solid #222222;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.6;
      color: #e0e0e0;
    }
    .mobile-chart-wrap { width: 100%; }
    .mobile-chart-wrap svg { width: 100%; height: auto; }
    body.mobile-active #mobile-drivers .compact-driver-row {
      padding: 8px 4px;
      border-bottom: 1px solid #1a1a1a;
    }
    #mobile-desktop-btn {
      width: 100%;
      margin-top: 24px;
      padding: 12px;
      font-size: 13px;
    }
```

- [ ] **Step 3: Verify no CSS syntax errors**

Visually scan — every `{` has a matching `}`, no unclosed strings.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(mobile): add mobile CSS (body.mobile-active)"
```

---

## Task 4: Add `renderMobileCharts()` function

**Files:**
- Modify: `index.html` — `<script>` block, after `renderStats()` (around line 1267)

- [ ] **Step 1: Insert `renderMobileCharts()`**

Find this exact line (the function that follows `renderStats()`):

```js
function showDriverPopup(el, driverName, colorIdx) {
```

Insert immediately before it:

```js
function renderMobileCharts() {
  if (!currentHeat) return;
  const modes = ['position', 'laptime', 'gap', 'pace', 'heatmap'];
  const saved = chartMode;
  modes.forEach(mode => {
    chartMode = mode;
    renderVisualization();
    const dest = document.getElementById(`mobile-chart-${mode}`);
    if (dest) dest.innerHTML = document.getElementById('vizArea').innerHTML;
  });
  chartMode = saved;
}

```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat(mobile): add renderMobileCharts()"
```

---

## Task 5: Wire mobile rendering into `loadRaceUrl()`

**Files:**
- Modify: `index.html` — `loadRaceUrl()` function (around line 2272)

- [ ] **Step 1: Add mobile rendering calls after `renderStats()`**

Find these exact lines inside `loadRaceUrl()`:

```js
    renderVisualization();
    renderStats();
    renderConsistency();
```

Replace with:

```js
    renderVisualization();
    renderStats();
    renderConsistency();
    if (isMobile()) {
      renderMobileCharts();
      document.getElementById('mobile-drivers').innerHTML =
        document.getElementById('statsArea').innerHTML;
    }
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat(mobile): wire renderMobileCharts into loadRaceUrl"
```

---

## Task 6: Mobile AI prompt in `generateSpicyAnalysis()`

**Files:**
- Modify: `index.html` — `generateSpicyAnalysis()` function (around line 1367)

- [ ] **Step 1: Switch output target to `#mobile-analysis` on mobile**

Find this line at the top of `generateSpicyAnalysis()`:

```js
  const area = document.getElementById('spicyArea');
```

Replace with:

```js
  const area = document.getElementById(isMobile() ? 'mobile-analysis' : 'spicyArea');
```

- [ ] **Step 2: Replace the prompt with a mobile/desktop branch**

Find this exact block:

```js
    const prompt = `You are a savage, funny pit-lane commentator for local RC car club racing. Roast these results with real personality. Rules:
- Quote actual lap times and gaps (e.g. "a 9.944s best lap", "+12 seconds back")
- Name every driver — no "a driver" or "one competitor"
- If someone had incidents, name them and the count — make it hurt
- Mention who held the fastest lap and by how much
- Mention any positions gained or lost from the grid
- Be specific, irreverent, and funny. No corporate fluff.
- 4–6 sentences max.

Race: ${className}${heatName ? ' — ' + heatName : ''}
Fastest lap of the race: ${flDriver.driverName} — ${msToStr(flDriver.fastestLapMs)}
Winner's total time: ${msToStr(winner.totalTimeMs)}

Results:
${summary}`;
```

Replace with:

```js
    const prompt = isMobile()
      ? `You are a concise race analyst covering local RC car club racing. Give a focused breakdown of this race.
- Lead with who won and by how much
- Call out the fastest lap and who set it
- Highlight any key battles or position changes from the grid
- Name any drivers with incidents and the count
- Note pace or consistency standouts
- 4–6 sentences, facts first, no filler.

Race: ${className}${heatName ? ' — ' + heatName : ''}
Fastest lap: ${flDriver.driverName} — ${msToStr(flDriver.fastestLapMs)}
Winner's total time: ${msToStr(winner.totalTimeMs)}

Results:
${summary}`
      : `You are a savage, funny pit-lane commentator for local RC car club racing. Roast these results with real personality. Rules:
- Quote actual lap times and gaps (e.g. "a 9.944s best lap", "+12 seconds back")
- Name every driver — no "a driver" or "one competitor"
- If someone had incidents, name them and the count — make it hurt
- Mention who held the fastest lap and by how much
- Mention any positions gained or lost from the grid
- Be specific, irreverent, and funny. No corporate fluff.
- 4–6 sentences max.

Race: ${className}${heatName ? ' — ' + heatName : ''}
Fastest lap of the race: ${flDriver.driverName} — ${msToStr(flDriver.fastestLapMs)}
Winner's total time: ${msToStr(winner.totalTimeMs)}

Results:
${summary}`;
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(mobile): mobile AI prompt + mobile-analysis target"
```

---

## Task 7: Verify and push

- [ ] **Step 1: Test on desktop — confirm nothing changed**

Open `http://localhost:4321` on a desktop browser (width > 768px). Verify:
- Layout is identical to before
- SSS dropdown works
- Loading a race renders charts and AI summary normally
- `#mobileView` is not visible

- [ ] **Step 2: Test mobile layout — emulate phone in DevTools**

Open Chrome DevTools → Toggle device toolbar → set to iPhone 14 (390px wide). Verify:
- Header shows only "🏁 Smallscale Speedway ▾" button, full width
- SSS dropdown opens and lists events
- Picking a race shows: analysis loading → all 5 charts stacked → driver rows → "🖥 Desktop Version" button
- AI summary populates at the top

- [ ] **Step 3: Test Desktop Version button**

On mobile view, tap "🖥 Desktop Version":
- Page reloads in desktop layout even at 390px width
- A "📱 Mobile" button is visible in the header
- Tapping "📱 Mobile" clears the flag and reloads back to mobile layout

- [ ] **Step 4: Push**

```bash
git push
```
