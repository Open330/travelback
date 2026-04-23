# Deferred Findings — Cycle r5 (2026-04-23)

Every finding below is explicitly deferred with file+line, original severity,
concrete reason, and exit criterion. No silent drops.

## Carryovers from cycle r4 (unchanged)

All cycle-r4 deferred items remain in `.context/plans/deferred-findings-cycle-r4-2026-04-23.md`
with the same file+line, original severity, and exit criteria. No exit criterion triggered this cycle.

- R4-AGG-D1 — Primary CTA contrast 3.08:1 (`src/app/globals.css:127-132`). MEDIUM / MEDIUM. Design-owner sign-off pending.
- R4-AGG-D2 — Tab order in WebGL-fail path (`src/components/MapView.tsx:429-441`, `src/app/page.tsx:315-327`). LOW / MEDIUM. Architectural refactor pending.
- R4-AGG-D3 — 320w + ko touch-target audit. LOW / MEDIUM. Probe not run this cycle.
- R4-AGG-D4 — Real-WebGL LCP/INP/CLS. LOW / MEDIUM. Probe environment limitation.
- R4-AGG-D5 — Forced-colors audit (`src/app/globals.css:127-132`). LOW / MEDIUM. Windows probe not run.
- R4-AGG-D7 — `preserveDrawingBuffer=true` (`src/components/MapView.tsx:552-558`). LOW / MEDIUM. Architectural change pending.
- R4-AGG-D8 — `videoEncoder.ts` `window as unknown as …` casts (`src/lib/videoEncoder.ts:173-183`). LOW / MEDIUM. WICG types pending.
- R4-AGG-D9 — Nominatim CSP (`src/components/JourneyCreator.tsx`). LOW / MEDIUM. Security deferral permitted by `.context/project/02-architecture.md:117` host-layer delegation rule; search path remains local-only.
- R4-AGG-D10 — Language `<select>` shows 2-letter codes (`src/components/GlobalToolbar.tsx:55-60`). LOW / MEDIUM. Copy-owner review pending.
- R4-AGG-D11 — "Need help finding your file?" aria-label (`src/components/FileUpload.tsx:253-264`). LOW / MEDIUM. Copy-owner review pending.
- R4-AGG-D12 — `prefers-reduced-motion` e2e spec. LOW / MEDIUM. Out of cycle r5 scope.
- R4-AGG-D13 — Lighthouse/LCP/INP e2e spec. LOW / MEDIUM. Out of cycle r5 scope.

## New deferrals this cycle

### R5-AGG-D14 — `FileUpload` prop optionality is all-or-nothing

- **Source**: code-reviewer CR-5.
- **File+line**: `src/components/FileUpload.tsx:17`.
- **Original severity / confidence**: NITS / HIGH.
- **Reason**: stylistic polish; all three conditional-render guards (`onShowGoogleGuide ? …`, `onLoadSample ? …`, `onCreateJourney ? …`) work correctly. Narrowing the type contract is cosmetic refactoring outside the cycle scope rule for scheduled items.
- **Exit criterion**: next cleanup pass that intentionally touches the FileUpload prop contract.

### R5-AGG-D15 — `Toast.tsx` onDismiss closure reallocated on parent render

- **Source**: perf PR-1.
- **File+line**: `src/components/Toast.tsx:70`.
- **Original severity / confidence**: INFO / MEDIUM.
- **Reason**: `ToastItem` stores `onDismissRef` to avoid render cascade; the extra closure allocation is O(messages-on-screen) per render. Typical volume ≤3 messages.
- **Exit criterion**: if a profiler run or a real incident shows toast churn dominating frame time, memoize.

### R5-AGG-D16 — `TimelineSelector.buckets` recomputes on `points` reference change

- **Source**: perf PR-2.
- **File+line**: `src/components/TimelineSelector.tsx:103-121`.
- **Original severity / confidence**: INFO / MEDIUM.
- **Reason**: O(n) bucketing runs only on trim boundaries. Acceptable at 250,000-point limit.
- **Exit criterion**: profile reveals >16 ms on 250k-point trim.

### R5-AGG-D17 — `buildReferenceGridData` rebuilds on every style reload

- **Source**: perf PR-3.
- **File+line**: `src/components/MapView.tsx:224-324`.
- **Original severity / confidence**: INFO / MEDIUM.
- **Reason**: pass cost <1 ms for representative tracks; rebuild is correct when the track changes.
- **Exit criterion**: style cycling introduces measured jank.
