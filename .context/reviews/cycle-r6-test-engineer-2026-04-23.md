## Cycle r6 — Test engineer

### TE-1 (LOW, HIGH) — e2e has no regression guard for the drag-leave debounce

`e2e/travelback.spec.ts` and `src/components/FileUpload.tsx:116-122`. Cycle-r5 landed the `scheduleDragEnd()` debounce on drag-leave. There is no Playwright assertion that simulates a drag-leave and checks that `isDragging` (or the corresponding class/style diff) does not flicker to false before 200ms.

This is hard to test deterministically — `dragenter/dragleave/dragover` synthesis from Playwright is flaky across browsers — but we can at least cover the regression path by asserting that `data-testid` styling persists when `dragleave` fires. Defer unless we see a user-reported regression; the cost-vs-coverage is poor.

No schedule.

### TE-2 (LOW, MEDIUM) — e2e has no guard for `scene-editor-panel` / `journey-creator-panel` landmarks

`e2e/travelback.spec.ts`. Cycle r5 added `role="region"` + `aria-labelledby` to both (R5-AGG-5). Cycle r5 scheduled an e2e assertion for `<main>` landmark (R5-AGG-7, landed). The new regions lack a similar regression guard. A single `getByRole('region', { name: /scenes/i })` check on `scene-editor-panel`, and a parallel one for `journey-creator-panel`, would seal the loop.

**Fix**: add two one-line assertions — one inside an existing scene-editor test, one inside an existing journey-creator test (to avoid net new tests that extend runtime).

Schedule: YES.

### TE-3 (INFO, HIGH) — smoke CSP already pins new invariants

`scripts/smoke-static.mjs:114-119` now asserts `object-src 'none'` + `base-uri 'none'`. No follow-up needed.

### TE-4 (INFO, HIGH) — `npm audit --audit-level=high` returns clean

No new CVE surface since cycle r5. Continue to rely on this gate.

### TE-5 (LOW, MEDIUM) — fixtures parity

`e2e/fixtures/` directory exists; tests reference GPX/KML/JSON fixtures. No drift from cycle r5. Verified `tiny-trim.gpx`, `single-quote-attrs.gpx`, `point-placemarks.kml`, `invalid-elevation.gpx` are all used in the spec.

No schedule.

---

Scheduling recommendation: TE-2. One-line assertions embedded into existing tests.
