# Cycle 2 Refresh Implementation Plan — 2026-04-19

Derived from `.context/reviews/_aggregate.md` (refresh).

## Active findings to address this cycle

### 1. C2-AGG-001 — CRITICAL — Fix CSP to allow CARTO raster tile requests

**Status:** TODO

**Files to change:**
- `src/app/layout.tsx:62` — Add `https://*.basemaps.cartocdn.com` to `connect-src` and `img-src` in the CSP meta placeholder
- `scripts/harden-static-export.mjs:19` — Add the same domains to `connect-src` and `img-src` in `STYLE_POLICY`

**Implementation:**
1. In `layout.tsx`, change `connect-src 'self'` to `connect-src 'self' https://*.basemaps.cartocdn.com`
2. In `layout.tsx`, change `img-src 'self' blob: data:` to `img-src 'self' blob: data: https://*.basemaps.cartocdn.com`
3. In `harden-static-export.mjs`, make the same two changes in `STYLE_POLICY`
4. Verify: `next build` + check the emitted CSP in `out/index.html`

**Verification:**
- Run `next build` and inspect the CSP meta tag in `out/index.html` to confirm the domains are present.
- Run the gates: `eslint`, `tsc --noEmit`, `next build`.

---

### 2. C2-AGG-002 — MEDIUM — Delete dead `public/theme-init.js`

**Status:** TODO

**Files to change:**
- Delete `public/theme-init.js`

**Implementation:**
1. Delete the file.
2. Grep for any references to `theme-init` in the codebase to confirm nothing imports it.

**Verification:**
- `grep -r theme-init src/ public/ scripts/` returns no hits.
- Gates pass.

---

### 3. C2-AGG-003 — MEDIUM — Remove `navigator.webdriver` debug surface

**Status:** TODO

**Files to change:**
- `src/components/MapView.tsx:546-556` — Remove `navigator.webdriver` from debug gate conditions

**Implementation:**
1. In the map initialization `useEffect`, remove any reference to `navigator.webdriver`.
2. Keep the three safe gates: `process.env.NODE_ENV === 'development'`, `__travelbackDebug` query param, and `travelback-debug` localStorage flag.
3. Check E2E tests to see if they rely on `navigator.webdriver` for debug access — if so, update them to use the query param instead.

**Verification:**
- Confirm `navigator.webdriver` no longer appears in `src/`.
- Gates pass.

---

### 4. C2-AGG-004 — HIGH — Parallelize codec checks and cache results

**Status:** TODO

**Files to change:**
- `src/components/ExportPanel.tsx:93-113` — Change sequential codec checks to parallel

**Implementation:**
1. Create a module-level cache object for codec support results (outside the component).
2. Change the `checkAll` function to use `Promise.all` instead of a sequential `for` loop.
3. On mount, if cache is populated, skip the async checks and use cached results.
4. The `isCodecSupported` function in `videoEncoder.ts` already caches the dynamic import via module scope, so only the probing needs to be parallelized.

**Verification:**
- Open the export panel and confirm codec checks resolve faster.
- Gates pass.

---

### 5. C2-AGG-005 — MEDIUM — Fix single-point `buildFitBounds`

**Status:** TODO

**Files to change:**
- `src/components/MapView.tsx:172-190` — Add degenerate-bounds guard

**Implementation:**
1. After building bounds in `buildFitBounds`, check if the NE and SW corners are identical (or nearly so).
2. If degenerate, extend the bounds by a small margin (e.g., 0.01 degrees in each direction) so `fitBounds` produces a reasonable view.

**Verification:**
- Load a single-point track and confirm the map shows a reasonable zoom level instead of max zoom.
- Gates pass.

---

### 6. C2-AGG-006 — MEDIUM — Fix mobile menu ARIA

**Status:** TODO

**Files to change:**
- `src/components/TrackToolbar.tsx:135-222` — Fix ARIA roles and focus management

**Implementation:**
1. Remove `role="menu"` from the dropdown container and `role="menuitem"` from the buttons — these require arrow-key navigation which isn't implemented.
2. Use a simpler disclosure pattern: the container becomes a `div` with `aria-label` and the buttons are regular buttons.
3. On menu open, move focus to the first button in the menu.
4. On Escape, return focus to the trigger button.

**Verification:**
- Keyboard navigation through the mobile menu works correctly.
- Screen reader announces the menu opening.
- Gates pass.

---

### 7. C2-AGG-007 — MEDIUM — Fix `<html lang>` SSR/client mismatch

**Status:** TODO

**Files to change:**
- `src/app/layout.tsx:49-52` — Extend bootstrap script to set `lang` attribute
- `src/app/page.tsx:61-63` — Keep the `useEffect` as a sync mechanism but the initial value comes from the bootstrap

**Implementation:**
1. In the bootstrap script, after setting `data-mode` and `data-mapstyle`, also read the locale from localStorage (`travelback-locale`) and set `document.documentElement.lang` if found.
2. This ensures the `lang` attribute is correct before React hydrates.
3. The existing `useEffect` in `page.tsx` remains as the reactive sync mechanism when locale changes at runtime.

**Verification:**
- Set locale to Korean, reload, confirm `lang="ko"` is present in the initial HTML.
- Gates pass.

---

## Deferred findings (not scheduled this cycle)

See `.context/plans/deferred-findings-cycle2-2026-04-19.md` for the existing deferred list. No new deferred items from this review — all active findings are scheduled above.

## Quality gates

After all implementations:
1. `eslint` — must pass with zero errors
2. `tsc --noEmit` — must pass with zero errors
3. `next build` — must succeed
