# Motorsport Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the blue/purple corporate palette with carbon + red motorsport theme and swap Inter for Barlow Condensed.

**Architecture:** Pure CSS token replacement in `rc-log.html`. All changes are in the `<style>` block and `<link>` tag — no JS, no layout, no structure changes. Use `replace_all: true` edits for each color token.

**Tech Stack:** Vanilla CSS, Google Fonts (Barlow Condensed)

---

## File Map

| File | Action |
|---|---|
| `rc-log.html` | Modify — `<link>` tag + `<style>` block only |

---

## Task 1: Swap font to Barlow Condensed

**Files:** `rc-log.html` lines 7–8

- [ ] **Step 1: Replace the Google Fonts link**

Find:
```html
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```
Replace with:
```html
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Replace the font-family declaration**

Find (in the `html, body` rule):
```css
      font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
```
Replace with:
```css
      font-family: 'Barlow Condensed', system-ui, -apple-system, sans-serif;
```

---

## Task 2: Replace background color tokens

All `replace_all: true` — each token appears in multiple rules.

- [ ] **Step 1:** `#0d0d14` → `#0d0d0d`
- [ ] **Step 2:** `#12121c` → `#141414`
- [ ] **Step 3:** `#101018` → `#111111`
- [ ] **Step 4:** `#0a0a12` → `#0a0a0a`
- [ ] **Step 5:** `#1a1a2e` → `#1a1a1a`
- [ ] **Step 6:** `#12122a` → `#1a1a1a`
- [ ] **Step 7:** `#0f0f1e` → `#0f0f0f`
- [ ] **Step 8:** `#12121e` → `#141414`
- [ ] **Step 9:** `#111120` → `#111111`
- [ ] **Step 10:** `#0f0f1a` → `#111111`
- [ ] **Step 11:** `#1a2040` → `#1a0a0a`

---

## Task 3: Replace border color tokens

- [ ] **Step 1:** `#1e1e32` → `#222222` (replace_all)
- [ ] **Step 2:** `#1e1e35` → `#222222` (replace_all)
- [ ] **Step 3:** `#28284a` → `#2a2a2a` (replace_all)
- [ ] **Step 4:** `#2c2c50` → `#2a2a2a` (replace_all)
- [ ] **Step 5:** `#2a2a50` → `#2a2a2a` (replace_all)
- [ ] **Step 6:** `#2a2a4a` → `#2a2a2a` (replace_all)

---

## Task 4: Replace text / muted color tokens

- [ ] **Step 1:** `#dddde8` → `#e0e0e0` (replace_all)
- [ ] **Step 2:** `#e8e8f4` → `#e8e8e8` (replace_all)
- [ ] **Step 3:** `#cccce0` → `#cccccc` (replace_all)
- [ ] **Step 4:** `#b8b8d0` → `#bbbbbb` (replace_all)
- [ ] **Step 5:** `#8888b0` → `#888888` (replace_all)
- [ ] **Step 6:** `#66669a` → `#777777` (replace_all)
- [ ] **Step 7:** `#55558a` → `#666666` (replace_all)
- [ ] **Step 8:** `#44447a` → `#555555` (replace_all)
- [ ] **Step 9:** `#32325a` → `#444444` (replace_all)
- [ ] **Step 10:** `#36365e` → `#444444` (replace_all)
- [ ] **Step 11:** `#2a2a48` → `#333333` (replace_all — empty state color)

---

## Task 5: Replace purple accent tokens → red/neutral

- [ ] **Step 1:** `#5050a0` → `#e53935` (replace_all — input focus border)
- [ ] **Step 2:** `#3535a0` → `#cc0000` (replace_all — resize handle hover, driver popup border)
- [ ] **Step 3:** `#6060c0` → `#888888` (replace_all — resize handle indicator)
- [ ] **Step 4:** `#3040a0` → `#cc0000` (replace_all — chart tab active border)
- [ ] **Step 5:** `#8090e0` → `#e53935` (replace_all — chart tab active color)

---

## Task 6: Replace button/tab background tokens

- [ ] **Step 1:** `#1c1c30` → `#1c1c1c` (replace_all)
- [ ] **Step 2:** `#252540` → `#252525` (replace_all)
- [ ] **Step 3:** `#3c3c68` → `#3a3a3a` (replace_all)

---

## Task 7: Replace scrollbar tokens

- [ ] **Step 1:** `#222240` → `#2a2a2a` (replace_all)
- [ ] **Step 2:** `#2e2e55` → `#333333` (replace_all)

---

## Task 8: Add carbon fiber texture to header

**Files:** `rc-log.html` — `#header` CSS rule

- [ ] **Step 1: Update the header background**

Find the `#header` rule background line:
```css
      background: #141414;
```
Replace with:
```css
      background-color: #141414;
      background-image:
        repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.018) 2px, rgba(255,255,255,0.018) 3px),
        repeating-linear-gradient(-45deg, transparent, transparent 2px, rgba(255,255,255,0.018) 2px, rgba(255,255,255,0.018) 3px);
```

---

## Task 9: Verify and commit

- [ ] **Step 1: Grep for leftover purple tokens**

Run:
```bash
grep -n "#[0-9a-f]*[3-9][3-9][3-9a-f]*[3-9a-f]" /home/tony/Projects/rc-html/rc-log.html | grep -v "e53935\|c0392b\|e74c3c\|4a1a18\|3c1a20\|f5c842\|4caf50\|0a2a15\|cc0000\|1a0a0a\|e57373" | head -20
```

Visually check results — any remaining purple-tinted hex values (`[28][28][4-9a-f]` pattern) that should have been changed. Fix any found.

- [ ] **Step 2: Commit**

```bash
git add rc-log.html
git commit -m "feat: motorsport theme — carbon + red, Barlow Condensed font"
git push
```
