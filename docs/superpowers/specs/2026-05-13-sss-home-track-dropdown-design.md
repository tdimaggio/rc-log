# SSS Home Track Dropdown — Design Spec

**Date:** 2026-05-13  
**Goal:** Add a `🏁 SSS ▾` quick-access button to the header that shows a dropdown of the last 7 days of events from ssspeedway.liverc.com.

---

## UI

### Button placement
In `#header`, immediately after the "Load Race Night" button:
```
[Event URL input] [Load Race Night] [🏁 SSS ▾] | [Race URL input] ...
```

### Dropdown contents
Each row shows one event from the last 7 days:
```
May 13 · Nascar Exhibition Race   (18 heats)
May 12 · Tuesday Club Race        (38 heats)
May 09 · Elks Oval                (43 heats)
```

States:
- **Loading:** single row showing `Loading…`
- **Empty:** single row showing `No events in the last 7 days`
- **Error:** single row showing `Could not load events`

### Interaction
- Click button → fetch (if cache stale) + show dropdown
- Click button again while open → close dropdown
- Click an event row → call `loadEventUrl(fullUrl)`, close dropdown, fill `#eventUrl` input
- Click outside the dropdown → close
- Press Escape → close

### Caching
Results cached in a module-level variable for 5 minutes. Avoids re-fetching on every click.

---

## Data source

URL: `https://ssspeedway.liverc.com/events/`  
Fetched via the existing `fetchLiverc()` function (uses the CF Worker proxy).

### Parsing
The events page contains a `<table id="events">` with rows structured as:
```html
<tr>
  <td><a href="/results/?p=view_event&id=505050">Nascar Exhibition Race</a></td>
  <td><span class="hidden">2026-05-13 00:00:00</span>May 13, 2026</td>
  <td>18</td>   <!-- heats -->
  <td>13</td>   <!-- drivers -->
</tr>
```

Extract per row:
- **name** — text content of the `<a>` in column 0
- **url** — `https://ssspeedway.liverc.com` + href attribute of that `<a>`
- **date** — parse the hidden `<span>` text as a Date
- **heats** — text content of column 2

Filter: keep rows where `date >= Date.now() - 7 * 24 * 60 * 60 * 1000`.

### Date label format
`MMM DD` using `date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })`.

---

## Implementation scope

**Single file: `rc-log.html`**

Changes:
1. **CSS** — styles for `.sss-wrap`, `#sssDropdown`, dropdown items, loading/empty states
2. **HTML** — button + dropdown container inserted in `#header`
3. **JS** — `toggleSSSDropdown()`, `loadSSSEvents()`, click-outside handler, cache variables

No new files. No changes to `proxy.mjs`, `src/index.js`, or `wrangler.toml`.

---

## Out of scope
- Making the home track configurable (hardcoded to ssspeedway for now)
- Showing drivers count or other metadata
- Pagination or showing more than 7 days
