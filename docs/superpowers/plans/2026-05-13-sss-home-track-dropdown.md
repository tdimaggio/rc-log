# SSS Home Track Dropdown — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `🏁 SSS ▾` button to the header that shows a dropdown of the last 7 days of ssspeedway.liverc.com events, with 5-minute caching and full keyboard/click-outside dismissal.

**Architecture:** Single-file change to `rc-log.html`. CSS block gets dropdown styles, HTML header gets button + dropdown container, JS block gets cache variables + three functions + a click-outside listener.

**Tech Stack:** Vanilla JS/HTML/CSS — no dependencies.

---

## File Map

| File | Action |
|---|---|
| `rc-log.html` | Modify — CSS, HTML, JS |

---

## Task 1: Add CSS for the dropdown

**Files:**
- Modify: `rc-log.html` (CSS block, inside `<style>`)

Find the end of the `#header` CSS rules (around line 50) and insert after them.

- [ ] **Step 1: Add dropdown styles**

Find this line in the `<style>` block:
```css
    #apiKeyInput { width: 210px; }
```

Insert immediately after it:
```css
    .sss-wrap { position: relative; display: inline-flex; }
    #sssBtn { white-space: nowrap; }
    #sssDropdown {
      display: none;
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      min-width: 280px;
      background: #12121c;
      border: 1px solid #2a2a4a;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      z-index: 999;
      overflow: hidden;
    }
    #sssDropdown.open { display: block; }
    .sss-item {
      padding: 9px 14px;
      cursor: pointer;
      font-size: 12px;
      color: #cccce0;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px solid #1e1e32;
    }
    .sss-item:last-child { border-bottom: none; }
    .sss-item:hover { background: #1e1e38; color: #fff; }
    .sss-item .sss-heats { color: #666; font-size: 11px; flex-shrink: 0; }
    .sss-status { padding: 10px 14px; font-size: 12px; color: #666; font-style: italic; }
```

- [ ] **Step 2: Verify no CSS syntax errors**

Visually scan — every `{` has a matching `}`, no unclosed strings.

---

## Task 2: Add HTML button and dropdown container

**Files:**
- Modify: `rc-log.html` (HTML body, inside `#header`)

- [ ] **Step 1: Insert the button + dropdown wrapper**

Find this exact line in `#header`:
```html
  <button class="btn" onclick="loadEvent()">Load Race Night</button>
```

Replace it with:
```html
  <button class="btn" onclick="loadEvent()">Load Race Night</button>
  <div class="sss-wrap">
    <button class="btn" id="sssBtn" onclick="toggleSSSDropdown()">🏁 SSS ▾</button>
    <div id="sssDropdown"></div>
  </div>
```

- [ ] **Step 2: Verify header structure**

Read lines 499–515 and confirm the header div still has proper structure with no broken tags.

---

## Task 3: Add JS — cache variables and loadSSSEvents()

**Files:**
- Modify: `rc-log.html` (JS block, `<script>`)

Find a good insertion point: after the `getApiKey()` function (around line 653) and before `msToStr()`.

- [ ] **Step 1: Add cache variables**

Find this line:
```js
function msToStr(ms) {
```

Insert immediately before it:
```js
// ═══════════════════════════════════════════════════════════════
//  SSS Home Track Dropdown
// ═══════════════════════════════════════════════════════════════
let _sssCacheHtml = null;
let _sssCacheTime = 0;
const SSS_EVENTS_URL = 'https://ssspeedway.liverc.com/events/';
const SSS_BASE_URL   = 'https://ssspeedway.liverc.com';
const SSS_CACHE_MS   = 5 * 60 * 1000;
const SSS_DAYS_MS    = 7 * 24 * 60 * 60 * 1000;

```

- [ ] **Step 2: Add loadSSSEvents()**

Immediately after those variable declarations, insert:
```js
async function loadSSSEvents() {
  const drop = document.getElementById('sssDropdown');
  drop.innerHTML = '<div class="sss-status">Loading…</div>';

  try {
    if (!_sssCacheHtml || Date.now() - _sssCacheTime > SSS_CACHE_MS) {
      _sssCacheHtml = await fetchLiverc(SSS_EVENTS_URL);
      _sssCacheTime = Date.now();
    }

    const doc = new DOMParser().parseFromString(_sssCacheHtml, 'text/html');
    const rows = [...doc.querySelectorAll('#events tbody tr')];
    const cutoff = Date.now() - SSS_DAYS_MS;

    const recent = rows.map(tr => {
      const tds = tr.querySelectorAll('td');
      if (tds.length < 3) return null;
      const a = tds[0].querySelector('a');
      if (!a) return null;
      const dateStr = tds[1].querySelector('span.hidden')?.textContent?.trim();
      if (!dateStr) return null;
      const date = new Date(dateStr);
      if (isNaN(date) || date.getTime() < cutoff) return null;
      return {
        name:  a.textContent.trim(),
        url:   SSS_BASE_URL + a.getAttribute('href'),
        heats: tds[2].textContent.trim(),
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      };
    }).filter(Boolean);

    if (!recent.length) {
      drop.innerHTML = '<div class="sss-status">No events in the last 7 days</div>';
      return;
    }

    drop.innerHTML = recent.map(e =>
      `<div class="sss-item" onclick="pickSSSEvent('${e.url.replace(/'/g,"\\'")}')">
        <span>${e.label} · ${e.name}</span>
        <span class="sss-heats">${e.heats} heats</span>
      </div>`
    ).join('');

  } catch {
    drop.innerHTML = '<div class="sss-status">Could not load events</div>';
  }
}

```

---

## Task 4: Add JS — toggleSSSDropdown(), pickSSSEvent(), click-outside

**Files:**
- Modify: `rc-log.html` (JS block, immediately after `loadSSSEvents()`)

- [ ] **Step 1: Add toggle and pick functions**

Immediately after `loadSSSEvents()`, insert:
```js
function toggleSSSDropdown() {
  const drop = document.getElementById('sssDropdown');
  const isOpen = drop.classList.contains('open');
  drop.classList.toggle('open', !isOpen);
  if (!isOpen) loadSSSEvents();
}

function pickSSSEvent(url) {
  document.getElementById('eventUrl').value = url;
  document.getElementById('sssDropdown').classList.remove('open');
  loadEvent();
}

```

- [ ] **Step 2: Add click-outside and Escape handlers**

After the `pickSSSEvent` function, insert:
```js
document.addEventListener('click', e => {
  if (!e.target.closest('.sss-wrap')) {
    document.getElementById('sssDropdown').classList.remove('open');
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.getElementById('sssDropdown').classList.remove('open');
  }
});

```

---

## Task 5: Manual verification

- [ ] **Step 1: Run the local dev server**

```bash
node proxy.mjs
# then open http://localhost:4321/rc-log.html  (or npx serve -p 4321 .)
```

- [ ] **Step 2: Verify button renders**

The `🏁 SSS ▾` button should appear in the header immediately after "Load Race Night".

- [ ] **Step 3: Click the button**

Dropdown should show "Loading…" briefly, then a list of recent SSS events.

- [ ] **Step 4: Verify 7-day filter**

Check that only events from the last 7 days appear. Today is 2026-05-13 so cutoff is 2026-05-06.

- [ ] **Step 5: Click an event**

The event URL should populate `#eventUrl`, the dropdown should close, and the event should load (heat list appears in the left sidebar).

- [ ] **Step 6: Verify click-outside closes dropdown**

Open dropdown, click elsewhere in the page — dropdown should close.

- [ ] **Step 7: Verify Escape closes dropdown**

Open dropdown, press Escape — dropdown should close.

- [ ] **Step 8: Verify 5-minute cache**

Open dropdown (fetches), close, reopen within 5 minutes — no new network request to the events URL (check DevTools Network tab: no second request to `/proxy?url=...ssspeedway...events`).

- [ ] **Step 9: Commit**

```bash
git add rc-log.html
git commit -m "feat: add SSS home track dropdown with 7-day event filter"
git push
```
