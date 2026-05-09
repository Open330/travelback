# Cycle 10 Implementation Plan — 2026-05-09

Based on cycle 10 aggregate review at `.context/reviews/_aggregate.md`.
3 deduplicated findings (2 LOW, 1 INFO).

## Status of prior plan items

All prior plan items from cycles 1-9 are DONE or properly deferred. No open plan items remain.

## New plan items from cycle 10 reviews

---

### C10P01 — Add 10MB scan cap to worker `checkJsonDepth` (C10-NEW-01)

- **Severity:** LOW
- **Confidence:** High
- **Files:** `public/workers/trackParser.worker.js:301-318`, `src/lib/googleJsonParser.ts:278-289`
- **Fix:**
  1. Add `const MAX_DEPTH_SCAN_CHARS = 10 * 1024 * 1024` near the other worker constants (around line 275).
  2. Change the `for` loop in `checkJsonDepth` from `for (let i = 0; i < text.length; i++)` to `for (let i = 0; i < Math.min(text.length, MAX_DEPTH_SCAN_CHARS); i++)`.
  3. Verify the worker comment already notes the need to keep functions in sync with `src/lib/googleJsonParser.ts`.
- **Effort:** Tiny
- **Status:** DONE
- **Verified:** `MAX_DEPTH_SCAN_CHARS = 10 * 1024 * 1024` added at line 278; loop capped with `Math.min(text.length, MAX_DEPTH_SCAN_CHARS)` at line 307. Committed in `d6d3fda`.

---

### C10P02 — Add aria-label to mobile menu unit toggle buttons (C10-NEW-02)

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/TrackToolbar.tsx:232-249`, `src/components/GlobalToolbar.tsx` (reference)
- **Fix:**
  1. Locate the two unit toggle buttons in the mobile menu section of `TrackToolbar.tsx`.
  2. Add `aria-label={units === 'metric' ? t('units.metric') : t('units.imperial')}` to the metric button.
  3. Add `aria-label={units === 'imperial' ? t('units.imperial') : t('units.metric')}` to the imperial button (or mirror the pattern used in `GlobalToolbar.tsx`).
  4. Optionally add `title` attributes for tooltip consistency.
- **Effort:** Tiny
- **Status:** DONE
- **Verified:** Both mobile menu unit buttons now have `aria-label` and `title` attributes matching the `GlobalToolbar.tsx` pattern. Committed in `fb8ec5a`.

---

### C10P03 — Add `name` property to worker `WorkerParseError` (C10-NEW-03)

- **Severity:** INFO
- **Confidence:** High
- **Files:** `public/workers/trackParser.worker.js:288-293`, `src/lib/parse-utils.ts:32-38`
- **Fix:**
  1. In the `WorkerParseError` constructor, add `this.name = 'WorkerParseError'` after `super(message)`.
  2. This aligns with the main-thread `ParseError` class which sets `this.name = 'ParseError'`.
- **Effort:** Tiny
- **Status:** DONE
- **Verified:** `this.name = 'WorkerParseError'` added at line 292 of worker. Committed in `d6d3fda`.

---

## Deferred findings (unchanged from prior cycles)

| ID | Issue | Reason for deferral | Exit criterion |
|----|-------|---------------------|----------------|
| DEF-01 | MapView.tsx monolith | Large refactor | Extract sub-components |
| DEF-02 | No tests for MapView pure utilities | Blocked by DEF-01 | Add after DEF-01 |
| DEF-03 | No tests for export controller | Complex async testing | Add integration tests |
| DEF-04 | No tests for parseCoordinateQuery | Low priority | Add unit tests |
| DEF-05 | Worker/parser code duplication | No build pipeline support | Extract shared module or worker build |
| DEF-06 | mediabunny no explicit cleanup API | Library limitation | N/A |
| DEF-07 | waitForIdle type mismatch | No runtime impact | Fix when types change |

## Implementation order

1. **C10P01** — Worker checkJsonDepth scan cap (LOW, tiny) — DONE
2. **C10P02** — Mobile menu unit aria-label (LOW, tiny) — DONE
3. **C10P03** — WorkerParseError name (INFO, tiny) — DONE

All three fixes were implemented in commits `d6d3fda` and `fb8ec5a`.

## Quality gates

All gates verified after implementation:
- `npm run lint` — passed (0 errors)
- `npx next typegen && npx tsc --noEmit` — passed
- `npm run build` — passed
- `npx vitest run` — passed (219 tests)
- Commits signed with GPG
