# Aggregate Review — Cycle r5 (2026-04-23)

## Methodology

Cycle r5 ran a source-side multi-agent review on a repo whose last commit is cycle-r4's doc commit `00000002d`. All six quality gates were green at cycle start. User-injected queue was empty (ingested and handled in cycle r4).

Twelve lanes ran in this cycle: code-reviewer, perf, security, critic, verifier, test-engineer, tracer, architect, debugger, document-specialist, designer (UI/UX), accessibility. Per-agent reviews live in `.context/reviews/cycle-r5-*.md`.

---

## GATE STATUS — all green at the start of cycle r5

- ESLint (`npm run lint`): **PASS**
- TypeScript (`npm run typecheck`): **PASS**
- Next.js build (`npm run build`): **PASS** (harden-static-export ran on 3 HTML files)
- `npm run smoke:static`: **PASS** (frame-ancestors regression guard fires)
- `npm run test:e2e:static:ci`: **PASS**
- `npm audit --audit-level=high`: **PASS** (0 vulnerabilities)

---

## NEW FINDINGS — SCHEDULED THIS CYCLE

### R5-AGG-1 (LOW, HIGH) — TrackToolbar mobile menu duplicates `menuRef` on outer wrapper and inner panel

- **Files**: `src/components/TrackToolbar.tsx:134-155`.
- **Agreement**: code-reviewer (CR-1), critic (CT-1), tracer (T-1), debugger (DB-1).
- **Evidence**: both `<div className="relative sm:hidden" ref={menuRef}>` (L134) and the inner `<div role="menu" … ref={menuRef}>` (L155) assign the same ref. React assigns "last one wins", so after the menu opens, `menuRef.current` points to the inner panel only. The outside-click listener at L58-60 (`menuRef.current?.contains(event.target as Node)`) then returns false for clicks on the trigger button (trigger is inside the wrapper but outside the panel), creating a flicker/race.
- **Fix**: drop the inner `ref={menuRef}`. `useFocusFirstOnOpen` continues to resolve the first `<button>` descendant via the outer wrapper.
- **Schedule**: YES.

### R5-AGG-2 (LOW, HIGH) — FileUpload `handleDragLeave` does not debounce with `scheduleDragEnd`

- **Files**: `src/components/FileUpload.tsx:116-119`.
- **Agreement**: code-reviewer (CR-2), critic (CT-2), tracer (T-2), debugger (DB-2).
- **Evidence**: `handleDragOver`/`handleDrop` use debounced `scheduleDragEnd` (200ms) to survive leave-then-enter bounces, but `handleDragLeave` sets `setIsDragging(false)` synchronously and does not cancel any pending timer. Produces visible flicker when the pointer crosses child elements inside the zone.
- **Fix**: replace `setIsDragging(false)` at L118 with `scheduleDragEnd()`.
- **Schedule**: YES.

### R5-AGG-3 (LOW, HIGH) — `GlobalToolbar` language `<select>` lacks focus-visible ring

- **Files**: `src/components/GlobalToolbar.tsx:49-61`.
- **Agreement**: code-reviewer (CR-3), designer (UX-2), accessibility (A11Y-2).
- **Evidence**: `gi` class suppresses default outlines. Other `gi` controls recently got `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]` — the language select is still missing it. Keyboard users cannot see focus on this control.
- **Fix**: append focus-visible utilities to the `className` at L53.
- **Schedule**: YES.

### R5-AGG-4 (LOW, MEDIUM) — `TimelineSelector` reset button lacks focus-visible ring

- **Files**: `src/components/TimelineSelector.tsx:497-512`.
- **Agreement**: critic (CT-3), designer (UX-1), accessibility (A11Y-1).
- **Evidence**: rendered only when the user has actively trimmed; no keyboard focus indicator.
- **Fix**: append `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]` (with rounded-full padding to match the tiny icon-only button).
- **Schedule**: YES.

### R5-AGG-5 (LOW, MEDIUM) — `SceneEditor` and `JourneyCreator` panels are unnamed landmarks

- **Files**: `src/components/SceneEditor.tsx:352`, `src/components/JourneyCreator.tsx:537-544`.
- **Agreement**: architect (AR-3, AR-4), designer (UX-4), accessibility (A11Y-3, A11Y-4).
- **Evidence**: both panels exist as persistent on-screen regions but have no `role="region"` and no `aria-labelledby`. AT users lose landmark navigability.
- **Fix**:
  - `SceneEditor.tsx:352` — add `role="region" aria-labelledby="scene-editor-title"`; add `id="scene-editor-title"` to the existing `<h3>` at L356.
  - `JourneyCreator.tsx:537` — add `role="region" aria-labelledby="journey-creator-title"`; add `id="journey-creator-title"` to the existing `<span>` at L542-544.
- **Schedule**: YES.

### R5-AGG-6 (LOW, MEDIUM) — JourneyCreator "Cancel" button is missing `type="button"`

- **Files**: `src/components/JourneyCreator.tsx:545-550`.
- **Agreement**: critic (CT-4), designer (UX-3), accessibility (A11Y-5).
- **Evidence**: defensive hardening — no form ancestor today, but any future wrap in `<form>` would trigger submit-on-click.
- **Fix**: add `type="button"`.
- **Schedule**: YES.

### R5-AGG-7 (LOW, HIGH) — e2e has no `<main>` landmark assertion (cycle-r4 D6 exit criterion now satisfiable)

- **Files**: `e2e/travelback.spec.ts`.
- **Agreement**: test-engineer (TE-1), accessibility (A11Y-8).
- **Evidence**: cycle-r4 P-2 added `<main id="app">`. The deferred exit criterion was "next cycle adds a tiny spec asserting the `<main>` landmark exists". Now trivial.
- **Fix**: add a single Playwright assertion verifying `main#app[data-travelback-app-root="true"]` is attached.
- **Schedule**: YES.

### R5-AGG-8 (LOW, MEDIUM) — `smoke-static.mjs` doesn't assert `object-src` / `base-uri` CSP invariants

- **Files**: `scripts/smoke-static.mjs`.
- **Agreement**: test-engineer (TE-2).
- **Evidence**: `STYLE_POLICY` in `harden-static-export.mjs` pins `object-src 'none'` and `base-uri 'none'` but the smoke test does not assert them in the emitted CSP. Cheap regression guard.
- **Fix**: add two `csp.includes` assertions to the existing `assertStaticCspWasHardened` function.
- **Schedule**: YES.

### R5-AGG-9 (DOC) — Architecture doc note for new region landmarks

- **Files**: `.context/project/02-architecture.md`.
- **Agreement**: document-specialist (DS-5) — only lands if R5-AGG-5 lands.
- **Fix**: append one sentence noting SceneEditor and JourneyCreator panels are named regions as of cycle r5.
- **Schedule**: YES (dependent on R5-AGG-5).

---

## NEW FINDINGS — DEFERRED

### R5-AGG-D1..D13 — Cycle-r4 carryovers (unchanged)

All of cycle-r4's `R4-AGG-D1..R4-AGG-D13` deferred items remain unchanged this cycle. No exit criteria have been triggered:

- R4-AGG-D1 (primary CTA contrast) — design-owner sign-off still pending.
- R4-AGG-D2 (WebGL-fail tab order) — architectural refactor pending.
- R4-AGG-D3 (320w + ko probe) — no browser-driven probe this cycle.
- R4-AGG-D4 (Real-WebGL LCP/INP/CLS) — no real-WebGL run this cycle.
- R4-AGG-D5 (forced-colors audit) — no Windows probe.
- R4-AGG-D7 (`preserveDrawingBuffer`) — carryover.
- R4-AGG-D8 (`videoEncoder.ts` `window as unknown as` casts) — carryover.
- R4-AGG-D9 (Nominatim CSP) — carryover; search path remains local-only.
- R4-AGG-D10 (2-letter language codes) — copy-owner review pending.
- R4-AGG-D11 (Google guide copy) — copy-owner review pending.
- R4-AGG-D12 (prefers-reduced-motion spec) — out of cycle r5 scope.
- R4-AGG-D13 (Lighthouse/LCP/INP e2e) — out of cycle r5 scope.

### R5-AGG-D14 (NITS, HIGH) — `FileUpload` prop optionality is all-or-nothing

- **Source**: code-reviewer CR-5.
- **File+line**: `src/components/FileUpload.tsx:17`.
- **Original severity / confidence**: NITS / HIGH.
- **Reason**: stylistic polish; the conditional guards do no harm and removing optionality is cosmetic refactoring out of cycle scope.
- **Exit criterion**: next cleanup pass that touches `FileUpload`'s prop contract.

### R5-AGG-D15 (INFO, MEDIUM) — `Toast` onDismiss closure reallocated on parent render

- **Source**: perf PR-1.
- **File+line**: `src/components/Toast.tsx:70`.
- **Original severity / confidence**: INFO / MEDIUM.
- **Reason**: negligible cost at ≤3 concurrent messages; ToastItem already uses `onDismissRef` to avoid re-render cascade.
- **Exit criterion**: if toast volume grows or a profiler flags allocation pressure, revisit.

### R5-AGG-D16 (INFO, MEDIUM) — `TimelineSelector.buckets` recomputes on `points` reference change

- **Source**: perf PR-2.
- **File+line**: `src/components/TimelineSelector.tsx:103-121`.
- **Original severity / confidence**: INFO / MEDIUM.
- **Reason**: O(n) bucketing only runs at trim boundaries; acceptable for 250k-point maximum.
- **Exit criterion**: if a real 250k-point profile shows this dominates the trim frame.

### R5-AGG-D17 (INFO, MEDIUM) — `buildReferenceGridData` rebuilds on every style reload

- **Source**: perf PR-3.
- **File+line**: `src/components/MapView.tsx:224-324`.
- **Original severity / confidence**: INFO / MEDIUM.
- **Reason**: pass cost <1 ms for common tracks.
- **Exit criterion**: if style cycling is measured to introduce jank.

---

## AGENT FAILURES

None this cycle.
