# Aggregate Review — Cycle 3 (2026-04-23, orchestrator run r3)

## Methodology
Multi-angle deep review across 12 lanes (code-reviewer, security, perf, accessibility, architect, debugger, critic, verifier, test-engineer, tracer, documentation, designer) performed in-process. All of `src/` re-read; `scripts/harden-static-export.mjs` assumed unchanged vs. cycles r1-r2; gates run end-to-end; deferred list cross-checked against current code.

Per-agent review files this cycle are preserved under `.context/reviews/cycle-r3-<agent>-2026-04-23.md`. This aggregate dedupes overlapping findings and records cross-agent agreement.

---

## GATE STATUS — all green this cycle

- ESLint: **PASS** (0 errors, 0 warnings).
- TypeScript (`tsc --noEmit`): **PASS** (0 errors).
- Next.js build: **PASS**; `harden-static-export` ran.
- `npm audit --audit-level=high`: **PASS** (0 vulnerabilities).
- `npm run smoke:static`: **PASS**.
- `npm run test:e2e:static:ci`: **PASS** (0 failures).

No gate regressions vs. cycle r2.

---

## NEW FINDINGS (cycle r3)

Three findings are schedulable this cycle (one-line fixes, high confidence, no risk). Everything else recorded as deferred or carry-over.

### R3-AGG-1 (LOW, HIGH confidence) — `FileUpload.handleDrop` leaks a `setTimeout(setIsDragging)` pair
- **Files**: `src/components/FileUpload.tsx:85, 90`.
- **Agreement**: code-reviewer (R3-CR-1), debugger (R3-DB-1), tracer (T-1).
- **Failure scenario**: after a fast-drop + parse, `setIsDragging(false)` runs on the new render state (`hasTrack=true`), which is redundant and wastes a scheduled task. If the component later unmounts through a different path, the setTimeout can fire with no cleanup.
- **Fix**: track the timer id in a `useRef`; clear in `useEffect` cleanup AND before scheduling a new one in the second branch.
- **Schedule this cycle**: **YES** (P2 quick-win — converges toward explicit-cleanup pattern used by other components).

### R3-AGG-2 (LOW, HIGH confidence) — `videoEncoder.isCodecSupported` silently swallows module-load errors
- **Files**: `src/lib/videoEncoder.ts:205-212`.
- **Agreement**: code-reviewer (R3-CR-3), debugger (R3-DB-5).
- **Failure scenario**: If mediabunny dynamic-import fails (CSP/network), the user sees "codec unavailable" for every codec with no diagnostic breadcrumb.
- **Fix**: `console.debug('[Travelback] codec probe failed:', err)` inside the catch (single line). No user-facing change; keeps `return false` for the probe.
- **Schedule this cycle**: **YES** (P3 diagnostics polish).

### R3-AGG-3 (LOW, HIGH confidence) — Exporting overlay needs `role="dialog" aria-modal="true"` + `aria-labelledby`
- **Files**: `src/app/page.tsx:329-345`.
- **Agreement**: accessibility (R3-A11Y-4), designer (R3-UX-1).
- **Failure scenario**: Screen reader users have no signal that the rest of the page is inert during export; keyboard can Tab out of the overlay.
- **Fix**: add `role="dialog" aria-modal="true" aria-labelledby="export-overlay-title"` to the overlay div; give the "Rendering video" `<p>` the matching `id`.
- **Schedule this cycle**: **YES** (P2 a11y improvement — two single-line attribute additions).

---

## OTHER NEW FINDINGS — all deferred

### R3-AGG-4 (LOW, MEDIUM) — `videoEncoder.ts` `showSaveFilePicker` uses `(window as unknown as ...)` casts
- File: `src/lib/videoEncoder.ts:173-183`.
- Agreement: code-reviewer (R3-CR-2).
- Schedule: **NO** — typing cleanup; defer.

### R3-AGG-5 (LOW, MEDIUM) — Nominatim search vs. CSP `connect-src 'self'`
- File: `src/components/JourneyCreator.tsx` (search path) + `src/app/layout.tsx:62`.
- Agreement: security (R3-SEC-2), tracer (T-3).
- Schedule: **NO** — needs a hands-on production-build verification; defer with an exit criterion.

### R3-AGG-6 (LOW, MEDIUM) — `ElevationProfile` double-iterates elevations
- File: `src/components/ElevationProfile.tsx:20-60`.
- Agreement: perf (R3-PERF-2).
- Schedule: **NO** — cosmetic.

### R3-AGG-7 (LOW, MEDIUM) — `computeCameraForScene` rebuilds bbox every frame in overview
- File: `src/lib/camera.ts:154`.
- Agreement: perf (R3-PERF-3).
- Schedule: **NO** — not current bottleneck.

### R3-AGG-8 (LOW, MEDIUM) — `SceneEditor` `role="slider"` lacks `aria-orientation`
- File: `src/components/SceneEditor.tsx:170-184`.
- Agreement: a11y (R3-A11Y-3).
- Schedule: **NO** — informational only.

### R3-AGG-9 (LOW, MEDIUM) — `FileUpload` parsing-button `aria-label` doesn't swap with label
- File: `src/components/FileUpload.tsx:206-210`.
- Agreement: designer (R3-UX-3).
- Schedule: **NO** — polish.

### R3-AGG-10 (LOW, MEDIUM) — No antimeridian unit-test coverage
- Agreement: test-engineer (R3-TE-1).
- Schedule: **NO** — test-writing; defer.

### R3-AGG-11 (LOW, MEDIUM) — `videoEncoder.exportVideo` fallback recomputes cumulative distances
- File: `src/lib/videoEncoder.ts:66`.
- Agreement: debugger (R3-DB-2).
- Schedule: **NO** — no current-caller bug.

### R3-AGG-12 (LOW, MEDIUM) — Export clamp warning is console-only
- File: `src/lib/videoEncoder.ts:60-62`.
- Agreement: critic (R3-CR-C-3).
- Schedule: **NO** — UX polish, needs new i18n key.

### R3-AGG-13 (LOW, MEDIUM) — Frame-break fallback goes to `about:blank` with no explanation
- File: `src/app/layout.tsx:49`.
- Agreement: critic (R3-CR-C-1).
- Schedule: **NO** — edge case.

### R3-AGG-14 (INFO) — `.context/reviews/` file growth
- Agreement: critic (R3-CR-C-5).
- Schedule: **NO** — meta-process, not code.

---

## CARRY-OVER FINDINGS (unchanged from prior deferred lists)

- DF-R2-001..-017 (cycle r2) all remain active and re-validated this cycle.
- DF-C17-* items remain per cycle-17 review.
- DF-C4-001, DF-C4-002, DF-C2-010 remain.

---

## AGENT FAILURES

None. All 12 lanes produced review files.

---

## Summary

- 14 new findings; 3 scheduled; 11 deferred this cycle.
- All gates green; no correctness/security regressions.
- Code quality is stable; cycle focuses on tiny accessibility + diagnostics polish.
