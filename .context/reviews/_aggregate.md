# Aggregate Review — Cycle 2 (2026-04-23, orchestrator run r2)

## Methodology
Multi-perspective deep review across 10 specialist angles (code quality, security, performance, architecture, accessibility, test engineering, debugger, verification, tracing, critic, documentation, UI/UX) performed in-process (no registered external reviewer agents beyond `perf-reviewer`). Full `src/` re-read; gates run end-to-end; deferred-findings list cross-checked against current code.

Per-agent review files for this cycle are preserved under `.context/reviews/cycle-r2-<agent>-2026-04-23.md`. This aggregate dedupes overlapping findings and records cross-agent agreement.

---

## GATE STATUS — all green this cycle

- ESLint: **PASS** (0 errors, 0 warnings).
- TypeScript (`tsc --noEmit`): **PASS** (0 errors).
- Next.js build: **PASS**; `harden-static-export` hardened 3 HTML files.
- `npm audit --audit-level=high`: **PASS** (0 vulnerabilities).
- `npm run smoke:static`: **PASS**.
- `npm run test:e2e:static:ci`: **PASS** (53 passed, 2.6m).

No gate regressions vs. cycle 1.

---

## NEW FINDINGS (cycle 2 — orchestrator run r2)

All findings are below the "schedule-this-cycle" bar except one quick-win accessibility nit. Everything else is recorded as deferred.

### R2-AGG-1 (LOW, HIGH confidence) — Missing `aria-hidden="true"` on decorative `Circle` bullet icon in GoogleGuide tips
- **Files**: `src/components/GoogleGuide.tsx:389` — `<Circle size={6} fill="currentColor" strokeWidth={0} className="mt-1.5 flex-shrink-0" />`.
- **Agreement**: accessibility (R2-A11Y-1).
- **Fix**: add `aria-hidden="true"`. Trivial one-attribute change consistent with the pattern applied to the 7 illustration SVGs in the same file.
- **Schedule this cycle**: **YES** (P2 quick win).

### R2-AGG-2 (LOW, MEDIUM confidence) — Duplicated approximate-distance helpers in MapView and JourneyCreator
- **Files**: `src/components/MapView.tsx:70-75` (`centerDistanceMeters`, handles antimeridian via `shortestLngDelta`), `src/components/JourneyCreator.tsx:29-34` (`approxDistanceMeters`, does NOT handle antimeridian).
- **Agreement**: code-quality (R2-CQ-3), architecture (R2-AR-3).
- **Failure scenario**: journey creator double-click suppression (PROXIMITY_THRESHOLD_METERS=5) fails near antimeridian.
- **Fix**: export a shared `approxDistanceMeters(a, b)` from `src/lib/interpolate.ts` (using `shortestLngDelta` for the lng term); use in both components.
- **Schedule this cycle**: **NO** — record as deferred (cosmetic cleanup; pragmatic to reach antimeridian while drawing journeys only at extreme latitudes).

### R2-AGG-3 (LOW, MEDIUM confidence) — `smoothAngle` in MapView reuses `shortestLngDelta` instead of a bearing-specific helper
- **Files**: `src/components/MapView.tsx:61-64`.
- **Agreement**: code-quality (R2-CQ-1).
- **Fix**: add `shortestAngleDelta(from, to)` to `src/lib/interpolate.ts` and use it; delete the inline duplicate in `camera.ts:104-107`. Same shared-helper refactor as R2-AGG-2.
- **Schedule this cycle**: **NO** — record as deferred (naming/DRY; math is correct today).

### R2-AGG-4 (LOW, MEDIUM confidence) — `smoothCameraState` inlines longitude normalization instead of using `normalizeLng`
- **Files**: `src/components/MapView.tsx:77-88`.
- **Agreement**: code-quality (R2-CQ-2).
- **Fix**: call `normalizeLng(...)` helper. Equivalent to current math.
- **Schedule this cycle**: **NO** — record as deferred (cosmetic DRY).

### R2-AGG-5 (LOW/MEDIUM, MEDIUM confidence) — Inconsistent file-read API between `.json` vs `.gpx/.kml` in parser
- **Files**: `src/lib/parser.ts:538-566`.
- **Agreement**: code-quality (R2-CQ-4).
- **Fix**: migrate `.gpx/.kml` branch to `await file.text()`. Non-breaking.
- **Schedule this cycle**: **NO** — record as deferred (parser-reliability pass scope).

### R2-AGG-6 (LOW/MEDIUM, MEDIUM confidence) — Units preference not bootstrapped
- **Files**: `src/app/page.tsx:68` reads units via state initializer; `src/app/layout.tsx:49` bootstrap script handles theme + mapstyle + locale but NOT units.
- **Agreement**: code-quality (R2-CQ-5).
- **Fix**: extend bootstrap script with `data-units`.
- **Schedule this cycle**: **NO** — record as deferred (cosmetic FOUC; no functional impact).

### R2-AGG-7 (LOW, MEDIUM confidence) — `SceneRangeEditor` drag does not fire `clearPreview` on pointer-up
- **Files**: `src/components/SceneEditor.tsx:92-137` vs. the slider onPointerUp pattern at `:529,545,564,580`.
- **Agreement**: code-quality (R2-CQ-6).
- **Fix**: wire `onDragComplete` from `SceneRangeEditor` up to `clearPreview`.
- **Schedule this cycle**: **NO** — record as deferred (minor UX polish).

### R2-AGG-8 (LOW, MEDIUM confidence) — Landing page has `<h2>` as first heading; no `<h1>`
- **Files**: `src/components/FileUpload.tsx:191`.
- **Agreement**: accessibility (R2-A11Y-2).
- **Fix**: promote to `<h1>`; when a track is loaded, the track name in TrackWorkspace can take `<h1>`.
- **Schedule this cycle**: **NO** — record as deferred.

### R2-AGG-9 (LOW, MEDIUM confidence) — `ElevationProfile` uses `role="img"` but is keyboard-scrubbable
- **Files**: `src/components/ElevationProfile.tsx:94-102`.
- **Agreement**: accessibility (R2-A11Y-7).
- **Fix**: switch to `role="slider"` with `aria-valuenow/min/max/text`.
- **Schedule this cycle**: **NO** — record as deferred.

### R2-AGG-10 (LOW, MEDIUM confidence) — `ExportPanel.handleShare` swallows non-AbortError silently
- **Files**: `src/components/ExportPanel.tsx:139-150`.
- **Agreement**: debugger (R2-DB-11).
- **Fix**: emit an error toast on non-AbortError share failures.
- **Schedule this cycle**: **NO** — record as deferred (requires new i18n key; UX polish).

### R2-AGG-11 (LOW, HIGH confidence) — Redundant `as TrackPoint[]` cast in JourneyCreator.handleConfirmCreate
- **Files**: `src/components/JourneyCreator.tsx:522-528`.
- **Agreement**: debugger (R2-DB-4).
- **Fix**: drop the cast.
- **Schedule this cycle**: **NO** — record as deferred (trivially cosmetic).

### R2-AGG-12 (LOW, MEDIUM confidence) — Documentation gap: architecture doc doesn't mention JS-based frame-breaker
- **Files**: `.context/project/02-architecture.md:114-118`.
- **Agreement**: documentation (R2-DOC-1).
- **Fix**: add one sentence describing the inline bootstrap-script frame-break.
- **Schedule this cycle**: **NO** — record as deferred.

### R2-AGG-13 (LOW, HIGH confidence) — `interpolate.ts` exports lack JSDoc
- **Files**: `src/lib/interpolate.ts:161-185`.
- **Agreement**: documentation (R2-DOC-2).
- **Fix**: add brief JSDoc lines.
- **Schedule this cycle**: **NO** — record as deferred.

### R2-AGG-14 (LOW, MEDIUM confidence) — Dead fallback code in `MapView`/`useExportController` computing `cumulativeDistances` that never fires in practice
- **Files**: `src/components/MapView.tsx:772-773`, `src/lib/useExportController.ts:133-135`.
- **Agreement**: performance (R2-PF-2).
- **Fix**: delete fallbacks; document invariant.
- **Schedule this cycle**: **NO** — record as deferred.

### R2-AGG-15 (LOW, MEDIUM confidence) — E2E "playback controls work" test doesn't verify progress advanced
- **Files**: `e2e/travelback.spec.ts:444-457`.
- **Agreement**: test-engineer (R2-TE-6).
- **Fix**: poll playback-stats or `__travelbackDebug.getCamera()` for movement.
- **Schedule this cycle**: **NO** — record as deferred.

### R2-AGG-16 (LOW, MEDIUM confidence) — No size guard on e2e JSON fixtures
- **Files**: `e2e/fixtures/google-*.json`.
- **Agreement**: test-engineer (R2-TE-7).
- **Fix**: add a pre-commit or smoke-time fixture-size check (e.g., reject > 1 MB).
- **Schedule this cycle**: **NO** — record as deferred.

### R2-AGG-17 (LOW, MEDIUM confidence) — Mid-breakpoint (640px–1024px) hides track title
- **Files**: `src/components/TrackWorkspace.tsx:117-123` (`hidden … lg:block`).
- **Agreement**: UI/UX (R2-UX-2).
- **Fix**: show title with smaller typography at `sm:block`.
- **Schedule this cycle**: **NO** — record as deferred.

### R2-AGG-18 (LOW, MEDIUM confidence) — No parse progress indicator for large files
- **Files**: `src/components/FileUpload.tsx:149-151`.
- **Agreement**: UI/UX (R2-UX-4).
- **Fix**: display file size during "Parsing...".
- **Schedule this cycle**: **NO** — record as deferred.

### R2-AGG-19 (MEDIUM, HIGH confidence) — Deferral backlog growth (process observation, not a code defect)
- **Sources**: critic (R2-CR-1).
- **Recommendation**: once per 10 cycles pick one long-standing deferred item and schedule it. Not a code finding; a process one.
- **Schedule this cycle**: **NO** — process recommendation only.

---

## CROSS-CYCLE PRIOR FIXES — STILL GOOD

Verified this cycle (verifier angle + static re-scan):

- C1-T1 (cycle 1) — all 5 map-style JSONs are local-only with `"sources": {}`; CSP does not mention `cartocdn.com`; smoke passes.
- C12-F1 (cycle 12) — GoogleGuide SVGs aria-hidden. Still good.
- C11-F1 (cycle 11) — ElevationProfile SVG children aria-hidden. Still good.
- C10-F4 — Toast `role="log"` absent. Still good.
- C10-F8 — Controls progress aria-valuetext. Still good.
- C10-F10 — TimelineSelector shared `ratioToIndex`. Still good.
- C10-F11 — ExportPanel bitrate `readOnly` without `aria-disabled`. Still good.
- C10-F12 — SceneRangeEditor `userSelect`. Still good.
- C17-P0-1..-8 & C17-P1-1..-2 — all still applied.
- DF-C17-007 (SceneEditor aria-valuetext) — still RESOLVED.
- DF-C17-012 (GoogleGuide keyboard tabs) — still RESOLVED.

No regressions introduced this cycle.

---

## PRIOR DEFERRED FINDINGS CARRIED FORWARD

All items in `.context/plans/deferred-findings-cycle17-2026-04-23.md` (minus the two RESOLVED) remain active with their original exit criteria:

- DF-C17-001 — normalizeScenes drops zero-duration scenes (MEDIUM/HIGH).
- DF-C17-002 — Worker fallback path inconsistency (MEDIUM/MEDIUM).
- DF-C17-003 — CSP unsafe-inline CI check (MEDIUM/HIGH).
- DF-C17-004 — Video export sequential waitForIdle performance (MEDIUM/HIGH).
- DF-C17-005 — MapView re-renders every progress change (MEDIUM/HIGH).
- DF-C17-006 — HomeInner god component (MEDIUM/HIGH).
- DF-C17-008 — No unit tests (HIGH/HIGH).
- DF-C17-009 — No scene undo/redo (MEDIUM/HIGH).
- DF-C17-010 — CSS custom properties without fallbacks (LOW/MEDIUM).
- DF-C17-011 — No granular error boundaries (LOW/MEDIUM).
- DF-C17-013 — interpolateAlongTrack at progress=1.0 (LOW/MEDIUM).
- DF-C17-014 — showSaveFilePicker type casting (LOW/HIGH).
- DF-C17-015 — JourneyCreator totalDistance comment (LOW/HIGH).
- DF-C17-016 — i18n bundled inline (LOW/HIGH).
- DF-C17-017 — Mobile density on small screens (LOW/MEDIUM).
- DF-C17-018 — FileUpload drop zone focus indicator (LOW/MEDIUM).
- DF-C17-019 — Export frame count display inaccuracy (LOW/MEDIUM).
- DF-C4-001 — SceneEditor normalize on name keystroke (MEDIUM/MEDIUM).
- DF-C4-002 — ExportPanel ETA multiplier cosmetic (LOW/MEDIUM).
- DF-C2-010 — Local-only bundled styles (re-asserted in cycle 1; exit criterion = richer-basemap project).

---

## AGENT FAILURES

None — all 10 specialist angles completed successfully this cycle.

---

## SCHEDULED THIS CYCLE (PROMPT 2 input)

Exactly one code fix is scheduled: R2-AGG-1 (add aria-hidden to GoogleGuide Circle bullet icons). All other findings are deferred.

Repo policy compliance for the scheduled item:
- GPG-sign the commit.
- Conventional commit + gitmoji (e.g., `fix(a11y): 🐛 add aria-hidden to GoogleGuide tip bullet icons`).
- Fine-grained — one commit for the code change.
- No `Co-Authored-By` lines.
- No `--no-verify`, no force-push.
- No suppressions.
