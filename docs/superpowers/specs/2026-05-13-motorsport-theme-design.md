# Motorsport Theme Redesign — Design Spec

**Date:** 2026-05-13  
**Goal:** Replace the blue/purple corporate SaaS palette with a refined carbon + red motorsport theme. Dark throughout, no white backgrounds, not comic-book.

---

## Color Palette

### Backgrounds (strip all blue-purple tinting)
| Token | Old | New |
|---|---|---|
| Page/body | `#0d0d14` | `#0d0d0d` |
| Header | `#12121c` | `#141414` |
| Sidebars/panels | `#101018` | `#111111` |
| Cards/deep blacks | `#0a0a12` | `#0a0a0a` |
| Input focus bg | `#0f0f1e` | `#0f0f0f` |
| Tooltip bg | `#12121e` | `#141414` |
| Scrubber track | `#1a1a2e` | `#1a1a1a` |
| Table driver col | `#0d0d14` | `#0d0d0d` |
| Table row hover | `#111120` | `#111111` |
| Table cell border | `#0f0f1a` | `#111111` |

### Borders (neutral grey)
| Token | Old | New |
|---|---|---|
| Standard border | `#1e1e32` | `#222222` |
| Input border | `#28284a` | `#2a2a2a` |
| Button border | `#2c2c50` | `#2a2a2a` |
| Tooltip border | `#2a2a50` | `#2a2a2a` |
| Tooltip divider | `#1e1e35` | `#222222` |
| SSS dropdown border | `#2a2a4a` | `#2a2a2a` |

### Accent — red replaces all purple accent usage
| Token | Old | New |
|---|---|---|
| Input focus border | `#5050a0` | `#e53935` |
| Resize handle hover | `#3535a0` | `#cc0000` |
| Resize handle indicator | `#6060c0` | `#888888` |
| Driver popup border | `#3535a0` | `#cc0000` |
| Chart tab active border | `#3040a0` | `#cc0000` |
| Chart tab active bg | `#1a2040` | `#1a0a0a` |
| Chart tab active color | `#8090e0` | `#e53935` |

### Text (de-tinted)
| Token | Old | New |
|---|---|---|
| Body text | `#dddde8` | `#e0e0e0` |
| Muted labels | `#66669a` | `#777777` |
| Dimmer labels | `#55558a` | `#666666` |
| Section headers | `#44447a` | `#555555` |
| Heat section label | `#32325a` | `#444444` |
| Dim/loading text | `#36365e` | `#444444` |
| Purple-grey text | `#8888b0` | `#888888` |
| Button text | `#b8b8d0` | `#bbbbbb` |
| Speed label | `#66669a` | `#777777` |
| Race sub | `#44447a` | `#555555` |
| Race time | `#66669a` | `#777777` |
| Card sub | `#36365e` | `#444444` |
| Stat row label | `#55558a` | `#666666` |
| Tooltip row label | `#55558a` | `#666666` |
| Table th color | `#44447a` | `#555555` |
| Table td color | `#55558a` | `#666666` |
| Highlighted driver row bg | `#12122a` | `#1a1a1a` |

### Buttons
| Token | Old | New |
|---|---|---|
| Button bg | `#1c1c30` | `#1c1c1c` |
| Button hover bg | `#252540` | `#252525` |
| Button hover border | `#3c3c68` | `#3a3a3a` |
| Chart tab bg | `#1c1c30` | `#1c1c1c` |
| Chart tab border | `#2c2c50` | `#2a2a2a` |
| Chart tab color | `#66669a` | `#777777` |
| Chart tab hover bg | `#252540` | `#252525` |
| View tab bg | `#1c1c30` | `#1c1c1c` |
| View tab border | `#2c2c50` | `#2a2a2a` |
| View tab color | `#66669a` | `#777777` |
| View tab hover bg | `#252540` | `#252525` |

### Scrollbar
| Token | Old | New |
|---|---|---|
| Track | `#0d0d14` | `#0d0d0d` |
| Thumb | `#222240` | `#2a2a2a` |
| Thumb hover | `#2e2e55` | `#333333` |

### Keep unchanged
- Red primary: `#c0392b` / `#e53935` — already motorsport
- Yellow `#f5c842` — Spicy Analysis accent, intentional
- Green `#4caf50` — fastest lap data color
- All driver chart colors — data visualization, not theme
- Heatmap pulse animation

---

## Typography

**Change:** Replace `Inter` with `Barlow Condensed`

Google Fonts URL:
```
https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&display=swap
```

Font family declaration:
```css
font-family: 'Barlow Condensed', system-ui, -apple-system, sans-serif;
```

No font-size changes — the condensed proportions alone shift the feel significantly.

---

## Carbon Fiber Texture

**Where:** `#header` only — not sidebars, not panels.

**How:** CSS-only diagonal weave pattern, very low opacity (not comic-book):
```css
background-color: #141414;
background-image:
  repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.018) 2px, rgba(255,255,255,0.018) 3px),
  repeating-linear-gradient(-45deg, transparent, transparent 2px, rgba(255,255,255,0.018) 2px, rgba(255,255,255,0.018) 3px);
```

---

## Scope

**Single file: `rc-log.html`**

Changes: `<link>` tag (fonts), `<style>` block (color tokens + carbon texture).  
No JS changes. No layout changes. No structural HTML changes.
