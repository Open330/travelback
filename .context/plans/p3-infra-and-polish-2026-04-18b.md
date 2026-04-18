# P3 Infrastructure & Polish — 2026-04-18b

**Priority:** P3 — low-risk polish, infrastructure hardening, accessibility
**Source:** comprehensive-deep-code-review-2026-04-18b (P3-1 through P3-9), UI agent findings (JourneyCreator ARIA, ElevationProfile keyboard, TrackToolbar ARIA)
**Estimated effort:** 3-4 hours

---

## Findings addressed

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| P3-1 | formatDuration doesn't handle negative values | P3 | interpolate.ts |
| P3-2 | ModalDialog modalSequence is module-level mutable | P3 | ModalDialog.tsx |
| P3-3 | openModalStack has no size limit | P3 | ModalDialog.tsx |
| P3-4 | GoogleGuide SVG marker ID not namespaced | P3 | GoogleGuide.tsx |
| P3-5 | parseCoordinateQuery geo: URI doesn't support ;u=altitude | P3 | JourneyCreator.tsx |
| P3-6 | serve-static.mjs missing security headers | P3 | serve-static.mjs |
| P3-7 | harden-static-export.mjs doesn't verify CSP replacement | P3 | harden-static-export.mjs |
| P3-8 | Worker fallback is silent — no indication main-thread is slow | P3 | parser.ts |
| P3-9 | formatDistance imperial discontinuity at foot/mile boundary | P3 | interpolate.ts |
| A11y-1 | JourneyCreator search dropdown missing ARIA combobox | P3 | JourneyCreator.tsx |
| A11y-2 | ElevationProfile click handler not keyboard accessible | P3 | ElevationProfile.tsx |
| A11y-3 | TrackToolbar mobile menu missing ARIA menu role | P3 | TrackToolbar.tsx |

---

## Implementation steps

### 1. formatDuration negative value guard

**File:** `src/lib/interpolate.ts:167-173`

```ts
export function formatDuration(seconds: number): string {
  if (seconds < 0) seconds = 0
  // ... rest unchanged
}
```

---

### 2. ModalDialog — use useId() instead of module-level sequence

**File:** `src/components/ModalDialog.tsx:31`

```ts
// Replace: let modalSequence = 0
// With: use React.useId() or useRef for instance-local sequencing
const idPrefix = useId()
// In the component: const panelId = `${idPrefix}-panel`
```

---

### 3. GoogleGuide SVG marker — use useId()

**File:** `src/components/GoogleGuide.tsx:19`

```tsx
const markerId = useId()
<marker id={markerId} ...>
<path markerEnd={`url(#${markerId})`} ...>
```

---

### 4. serve-static.mjs — add security headers

**File:** `scripts/serve-static.mjs:143-146`

```js
res.writeHead(200, {
  'Content-Type': resolveContentType(resolved.absolutePath),
  'Cache-Control': resolveCacheControl(resolved.absolutePath),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
})
```

---

### 5. harden-static-export.mjs — verify CSP replacement

**File:** `scripts/harden-static-export.mjs:77-78`

```js
const nextHtml = replaceCspMeta(html, csp)
if (nextHtml === html) {
  throw new Error(`CSP meta tag not found or not replaced in ${htmlFile}`)
}
await writeFile(htmlFile, nextHtml)
```

---

### 6. Worker fallback — show one-time informational toast

**File:** `src/lib/parser.ts:384-405`

When the worker fails and falls back to main-thread parsing, add an optional callback:

```ts
// In parseTrackFile, when worker fails:
console.warn('[Travelback] Worker parse failed, using main thread:', err)
onWorkerFallback?.()  // Optional callback for UI notification
```

In the calling component, show a one-time toast:

```ts
const workerFallbackShown = useRef(false)
const handleWorkerFallback = useCallback(() => {
  if (!workerFallbackShown.current) {
    addToast('Parsing may be slower in this browser', 'info')
    workerFallbackShown.current = true
  }
}, [addToast])
```

---

### 7. formatDistance imperial threshold smoothing

**File:** `src/lib/interpolate.ts:150-165`

Switch to miles at 1000 feet (instead of 5280) for smoother transition:

```ts
if (units === 'imperial') {
  const feet = meters * 3.28084
  if (feet < 1000) return `${Math.round(feet)} ft`
  return `${(feet / 5280).toFixed(1)} mi`
}
```

---

### 8. JourneyCreator search — ARIA combobox pattern

**File:** `src/components/JourneyCreator.tsx:600-611`

```tsx
<input
  role="combobox"
  aria-expanded={searchResults.length > 0}
  aria-controls="search-results"
  aria-autocomplete="list"
  ...
/>
<div id="search-results" role="listbox">
  {searchResults.map((r, i) => (
    <button key={i} role="option" aria-selected={false} ...>
```

---

### 9. ElevationProfile keyboard accessibility

**File:** `src/components/ElevationProfile.tsx:79`

```tsx
<svg
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'ArrowRight') onSeek(Math.min(1, progress + 0.02))
    else if (e.key === 'ArrowLeft') onSeek(Math.max(0, progress - 0.02))
  }}
  aria-label={t('elevation.profileAria')}
  ...
>
```

---

### 10. TrackToolbar mobile menu — ARIA menu role

**File:** `src/components/TrackToolbar.tsx:135-217`

```tsx
<div role="menu" aria-label={t('app.moreControls')}>
  <button role="menuitem" ...>
```

---

## Verification checklist

- [x] `npm run build` succeeds
- [x] serve-static.mjs responses include X-Content-Type-Options (4)
- [x] CSP hardening fails build if replacement doesn't occur (5)
- [x] Screen reader can navigate JourneyCreator search results (8)
- [x] Keyboard users can seek on elevation profile (9)
- [x] Screen reader announces TrackToolbar mobile menu items (10)
- [x] formatDuration clamps negative values (1)
