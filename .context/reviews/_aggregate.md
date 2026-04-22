# Aggregate Review — Cycle 5 (2026-04-23)

## Methodology
10 review agents: code-reviewer, security-reviewer, perf-reviewer, architect, designer, test-engineer, debugger, verifier, critic, tracer, document-specialist. All 30+ source files examined. Findings deduplicated with prior cycle reviews. Cross-agent agreement noted.

---

## CYCLE 4 FIX VERIFICATION

Both cycle 4 fixes are confirmed applied:
- C4-F1 (NaN coordinates bypass): FIXED — `Number.isFinite()` checks added in both `parser.ts` and worker across all 4 code paths
- C4-F2 (FileUpload concurrent parse race): FIXED — `if (loading) return` guards in `handleDrop` and `handleInputChange`

---

## NEW FINDINGS (sorted by severity x confidence)

### C5-F1. SceneEditor aria-valuetext uses hardcoded English — i18n accessibility gap
- **Severity**: MEDIUM | **Confidence**: HIGH
- **Cross-agent**: code-reviewer (C5-F1), designer (C5-D1), critic (C5-CR1)
- **Files**: `src/components/SceneEditor.tsx:531, 547, 565, 581`
- **Issue**: The `aria-valuetext` attributes on zoom, pitch, bearing, and rotation sliders use hardcoded English words ("Zoom", "Tilt", "Direction", "Orbit speed") instead of i18n translation keys. For non-English screen reader users, these labels are announced in English while the rest of the UI is in their locale. This undermines the comprehensive i18n investment (~170 keys across 5 locales).
  - Line 531: `aria-valuetext={`Zoom ${scene.params.zoom}`}`
  - Line 547: `aria-valuetext={`Tilt ${scene.params.pitch}°`}`
  - Line 565: `aria-valuetext={`Direction ${scene.params.bearingOffset}°`}`
  - Line 581: `aria-valuetext={`Orbit speed ${scene.params.rotationSpeed}°/s`}`
- **Fix**: Add translation keys (e.g., `scenes.zoomValue`, `scenes.pitchValue`, `scenes.bearingValue`, `scenes.rotationValue`) to all 5 locales and use `t()` in the `aria-valuetext` attributes. Example: `aria-valuetext={`${t('scenes.zoom')} ${scene.params.zoom}`}`.
- **Impact**: WCAG 2.2 language of parts (3.1.2) concern. Screen reader users in non-English locales hear inconsistent language.

### C5-F2. Coordinate validation boundary inconsistency in parseSemanticSegments visit path
- **Severity**: LOW | **Confidence**: HIGH
- **Cross-agent**: code-reviewer (C5-F2), debugger (C5-DB1), verifier (C5-V1), critic (C5-CR2)
- **Files**: `src/lib/parser.ts:281 vs 305`, `public/workers/trackParser.worker.js:110 vs 128`
- **Issue**: In `parseSemanticSegments`, the timelinePath branch rejects coordinates at exactly ±90 lat / ±180 lng using `Math.abs(lat) > 90 || Math.abs(lng) > 180` (strict inequality, so ±90/±180 are accepted). Wait — `> 90` means lat=90 is NOT rejected (90 is not > 90). The visit branch uses `Math.abs(lat) <= 90 && Math.abs(lng) <= 180` (accepts ±90/±180). Meanwhile, `pushE7` and `parseRecords` use `Math.abs(lat) > 90` which accepts ±90. So actually all paths accept ±90/±180 consistently. Let me re-verify...
  - `pushE7` (line 186): `Math.abs(lat) > 90` — lat=90 passes (90 is not > 90)
  - `parseRecords` (line 196): `Math.abs(lat) > 90` — lat=90 passes
  - timelinePath (line 281): `Math.abs(lat) > 90` — lat=90 passes
  - visit (line 305): `Math.abs(lat) <= 90` — lat=90 passes
  - All paths accept lat=90. The inconsistency is in the *style* of the comparison (`> 90` vs `<= 90`), not in the actual behavior. Both accept the boundary values. However, if someone changes one to use `>= 90` (rejecting boundary), the other would still accept it. The double-negative logic in the visit path (`!(Math.abs(lat) > 90 || Math.abs(lng) > 180)` would be clearer and more consistent.
- **Fix**: Refactor the visit path in both `parser.ts:305` and worker line 128 to use the same pattern as the other branches: `if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue` instead of the current `if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) && !(Math.abs(lat) > 90 || Math.abs(lng) > 180))`.
- **Impact**: No behavioral difference today, but the inconsistent pattern increases maintenance risk.

### C5-F3. Duplicate longitude wrapping logic across three modules
- **Severity**: LOW | **Confidence**: HIGH
- **Files**: `src/lib/interpolate.ts:5-6`, `src/lib/camera.ts` (local `shortestLngDelta` and `normalizeLng`), `src/components/MapView.tsx:61-63` (local `shortestLongitudeDelta`)
- **Issue**: The `normalizeLng`, `shortestLngDelta`, and equivalent `shortestLongitudeDelta` functions are reimplemented locally in three files. `interpolate.ts` exports `normalizeLng` and `shortestLngDelta`, but `camera.ts` and `MapView.tsx` have their own copies with slightly different names. If the wrapping algorithm needs updating (e.g., for edge cases near antimeridian), all three copies must be found and updated.
- **Fix**: Import from `interpolate.ts` in `camera.ts` and `MapView.tsx` instead of duplicating.
- **Impact**: Maintenance risk from code duplication. No behavioral difference today.

### C5-F4. Worker ERROR_CODE and MAX_MESSAGE_SIZE constants not enforced against parser.ts
- **Severity**: LOW | **Confidence**: HIGH
- **Files**: `public/workers/trackParser.worker.js:209-220`
- **Issue**: The worker JS file has comments saying `// Must match JSON_MAX_FILE_SIZE in src/lib/parser.ts` and `// Error codes — must match ParseError codes in src/lib/parser.ts`, but there's no build-time or runtime enforcement. The worker is a plain JS file that isn't type-checked. If a new error code is added to `parser.ts` but not to the worker (or vice versa), the mismatch would only be caught by manual testing.
- **Impact**: Currently the constants match. Low risk but noted for maintenance.
- **Fix consideration**: Could add a build validation step or convert the worker to TypeScript.

---

## AGENT FAILURES
None. All 10+ review perspectives covered.

## POSITIVE FINDINGS
- Cycle 4 fixes verified as correctly applied in both code paths
- NaN validation fix covers all four code paths (pushE7/parseRecords in both parser.ts and worker)
- Concurrent parse race fix is clean with guards in both handleDrop and handleInputChange
- Worker/main-thread parser synchronization is consistent after recent fixes
- Security posture remains strong — no new security issues found
- Playback uses accumulator-based progress — eliminates float drift
- Export controller has robust cleanup with mounted ref and abort signal
- The codebase is in a mature, converging state

---

## PRIOR DEFERRED FINDINGS CARRIED FORWARD

All 19 deferred items from `.context/plans/deferred-findings-cycle17-2026-04-23.md` remain valid and are carried forward without modification (DF-C17-001 through DF-C17-019), plus DF-C4-001 and DF-C4-002 from cycle 4.

---

## CONVERGENCE NOTE

Cycle 5 found 4 new issues (1 Medium, 3 Low), continuing the convergence trend. The Medium-severity finding (C5-F1) is an i18n accessibility gap that affects real users in non-English locales. The three Low-severity findings are code hygiene/maintenance issues (boundary condition style, code duplication, unenforced constant synchronization). No new security, correctness, or data-loss issues were found.
