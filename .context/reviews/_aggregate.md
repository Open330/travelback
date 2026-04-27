# Cycle 5 Aggregate Review — 2026-04-27

Repository: `/Users/hletrd/flash-shared/Travelback`

## Review lanes completed

- `cycle5-code-reviewer-2026-04-27.md` — 6 findings (1 MEDIUM-HIGH, 3 MEDIUM/LOW-MEDIUM, 2 LOW)
- `cycle5-perf-reviewer-2026-04-27.md` — 5 findings (1 HIGH, 3 MEDIUM, 1 LOW)
- `cycle5-security-reviewer-2026-04-27.md` — 3 findings (1 MEDIUM, 2 LOW)
- `cycle5-critic-2026-04-27.md` — 5 findings (1 MEDIUM-HIGH, 2 MEDIUM, 2 LOW-MEDIUM)
- `cycle5-verifier-2026-04-27.md` — 3 findings (1 MEDIUM-HIGH, 1 MEDIUM, 1 LOW)
- `cycle5-test-engineer-2026-04-27.md` — 4 findings (1 MEDIUM-HIGH, 2 MEDIUM, 1 LOW-MEDIUM)
- `cycle5-tracer-2026-04-27.md` — 3 findings (2 MEDIUM, 1 LOW)
- `cycle5-architect-2026-04-27.md` — 3 findings (1 MEDIUM-HIGH, 1 MEDIUM, 1 LOW-MEDIUM)
- `cycle5-debugger-2026-04-27.md` — 3 findings (1 HIGH, 2 MEDIUM)
- `cycle5-document-specialist-2026-04-27.md` — 3 findings (1 LOW-MEDIUM, 2 LOW)
- `cycle5-designer-2026-04-27.md` — 4 findings (1 MEDIUM, 3 LOW-MEDIUM)

Total: 42 raw findings across 11 reviewers.

## Deduplicated findings

Severity/confidence preserves the highest level reported by any lane. "Agreement" lists lanes that independently flagged the same or overlapping issue.

---

### CF5-01 — Export continues producing blank/corrupt video after map is destroyed or component unmounts

- **Severity:** HIGH
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/lib/useExportController.ts:60-65, 102-261`, `src/components/MapView.tsx:511-514, 762-778`
- **Agreement:** debugger (DBG5-01, DBG5-02), code-reviewer (C5-CR-01), verifier (V5-01)
- **Failure scenario:** MapView unmounts during export (HMR, error boundary, route change). `renderFrameAndWait` resolves immediately when map is null. Export continues producing blank frames. User downloads a useless MP4. Additionally, the AbortController is NOT aborted on unmount.
- **Suggested fix:** (1) Abort `exportAbortRef.current` in the unmount cleanup effect. (2) Have `renderFrameAndWait` reject instead of resolve when map is null. (3) In the export loop, check map validity before each frame capture.

---

### CF5-02 — Trail geometry sent to MapLibre on every frame even when segment index unchanged (O(n) per frame)

- **Severity:** HIGH
- **Confidence:** High
- **Status:** Confirmed (carried/evolved from cycle2 F02)
- **Files:** `src/components/MapView.tsx:991-1064`
- **Agreement:** perf-reviewer (P5-01)
- **Failure scenario:** During playback of 250K-point track, full trail GeoJSON is sent to MapLibre at ~60fps. Main thread jank, frame drops, battery drain.
- **Suggested fix:** Only update trail geometry when segment index changes. Between segment changes, only update marker position. Throttle trail updates to ~10 Hz during playback.

---

### CF5-03 — Export "done" state persists stale video from previous track after failed export of new track

- **Severity:** MEDIUM-HIGH
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/lib/useExportController.ts:56-57, 91-96, 206-223`
- **Agreement:** critic (C5-01)
- **Failure scenario:** User exports track A successfully, loads track B, starts export of track B. Track B export fails. `hadExistingExport` (captured at start) is true, so UI shows "done" state with track A's video still visible. User thinks track B export succeeded.
- **Suggested fix:** Clear `exportedVideoUrl/VideoBlob/VideoFilename` at the start of each new export. Or compute `hadExistingExport` based on whether the CURRENT export produced a video.

---

### CF5-04 — MapView effect ordering dependencies create fragile race conditions

- **Severity:** MEDIUM-HIGH
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/components/MapView.tsx:430-1146`
- **Agreement:** architect (ARCH5-01), tracer (T5-02)
- **Failure scenario:** Track change causes `cumulDistRef` to lag behind `trackRef`. Progress effect interpolates with mismatched data, producing incorrect marker position or camera state.
- **Suggested fix:** Synchronize `cumulDistRef` update with track change in the same effect. Add guard that `cumulDistRef.current.length === track.points.length` before interpolation.

---

### CF5-05 — No unit tests for `computeCameraForProgress` (scene transitions, gap interpolation, blending)

- **Severity:** MEDIUM-HIGH
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/lib/camera.ts:350-436`
- **Agreement:** test-engineer (TE5-01)
- **Failure scenario:** Changes to scene transition blending break smooth camera transitions. No test catches regression.
- **Suggested fix:** Add unit tests covering: in-scene, two-scene transition, gap interpolation, before-first-scene, after-last-scene, zero-duration scene, overlapping scenes.

---

### CF5-06 — Debug camera API exposed on `window.__travelbackDebug` in production builds on localhost

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/components/MapView.tsx:704-743`
- **Agreement:** security-reviewer (S5-01)
- **Failure scenario:** Malicious browser extension or injected script on localhost reads map camera state to extract user location data.
- **Suggested fix:** Restrict debug API to `NODE_ENV === 'development'` only. Remove the localStorage/URL-parameter production escape hatch.

---

### CF5-07 — `window.confirm()` used instead of app's `ModalDialog` for scene-trim confirmation

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/app/page.tsx:295`
- **Agreement:** code-reviewer (C5-CR-02)
- **Failure scenario:** Browser's native confirm dialog breaks visual design language on mobile.
- **Suggested fix:** Replace with `useState` toggle + `ModalDialog`, following JourneyCreator's discard confirm pattern.

---

### CF5-08 — Mobile "more controls" menu lacks focus trap despite `role="dialog"`

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Confirmed (carried/evolved from cycle2 F12)
- **Files:** `src/components/TrackToolbar.tsx:145-259`
- **Agreement:** designer (D5-02)
- **Failure scenario:** Keyboard users can Tab out of the menu into page content. Screen readers get non-modal dialog semantics.
- **Suggested fix:** Implement focus trap using `ModalDialog` pattern, or downgrade to `role="menu"` with proper semantics.

---

### CF5-09 — Animated mesh CSS runs during export, competing with WebGL canvas

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Status:** Confirmed (carried/evolved from cycle2 F13)
- **Files:** `src/styles/vitro-base.css:389-435`, `src/app/layout.tsx:80-81`
- **Agreement:** perf-reviewer (P5-04)
- **Failure scenario:** Mesh animation causes MapLibre render events to fire late, resulting in export timeouts or duplicate frames.
- **Suggested fix:** Pause mesh animation during export via `data-exporting` attribute + CSS `animation-play-state: paused`.

---

### CF5-10 — Export progress bar visual lags behind actual progress due to CSS transition

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/components/ExportPanel.tsx:296`
- **Agreement:** designer (D5-01)
- **Failure scenario:** Fast exports show progress bar at 80% when actual progress is 95%. Bar "rubber bands" to 100% at completion.
- **Suggested fix:** Remove or shorten transition during active export. Only animate the final 100% transition.

---

### CF5-11 — Timeline trim silently fails when resulting slice has <2 points

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/app/page.tsx:288-321`, `src/components/TimelineSelector.tsx`
- **Agreement:** critic (C5-02)
- **Failure scenario:** User drags handles close together, nothing happens. No feedback.
- **Suggested fix:** Enforce minimum range in TimelineSelector, or show toast explaining rejection.

---

### CF5-12 — `computeCumulativeDistances` called twice for same track when no trimming applied

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/app/page.tsx:149-158`
- **Agreement:** perf-reviewer (P5-03)
- **Failure scenario:** Two identical O(n) haversine scans on initial load. Wasted computation.
- **Suggested fix:** Reuse `fullTrackCumulativeDistances` when `track === fullTrack`.

---

### CF5-13 — Scene editor normalization warnings show stale/incorrect messages about deleted scenes

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Confirmed (carried/evolved from cycle2 F24/F30)
- **Files:** `src/components/SceneEditor.tsx:266-285`
- **Agreement:** critic (C5-03)
- **Failure scenario:** User creates scene with equal start/end. Warning references scene that no longer exists.
- **Suggested fix:** Show warning before normalization. Present as "Scene X was removed" rather than "has start >= end".

---

### CF5-14 — Export pipeline crosses three modules without unified error model; string-based error classification

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`, `src/components/MapView.tsx`
- **Agreement:** architect (ARCH5-02)
- **Failure scenario:** New error type in encoder is not recognized by controller's error handler. User sees generic "Export failed" without actionable details.
- **Suggested fix:** Define unified `ExportPipelineError` hierarchy with machine-readable codes.

---

### CF5-15 — `checkJsonDepth` depth counter can go negative on malformed JSON

- **Severity:** LOW
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/lib/parser.ts:508-525`
- **Agreement:** security-reviewer (S5-02)
- **Failure scenario:** Malformed JSON with excessive closing brackets passes depth check but fails at `JSON.parse` with a less-specific error.
- **Suggested fix:** Add `if (depth < 0) throw new ParseError('Invalid JSON structure', 'INVALID_GOOGLE_JSON')`.

---

### CF5-16 — `stripXmlEntities` is dead code after `preflightXml` rejects DOCTYPE/ENTITY

- **Severity:** LOW
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/lib/parser.ts:155-195`
- **Agreement:** security-reviewer (S5-03)
- **Failure scenario:** Developer sees `stripXmlEntities` and assumes it provides XXE protection, not realizing `preflightXml` already blocks the input.
- **Suggested fix:** Reorder so `stripXmlEntities` runs before `preflightXml`, or remove and document `preflightXml` as sole guard.

---

### CF5-17 — `generateId()` fallback can produce non-unique IDs in rapid loops

- **Severity:** LOW
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/types.ts:1-6`
- **Agreement:** tracer (T5-03)
- **Failure scenario:** Automated test creates scenes rapidly. Two scenes get same ID. One overwrites the other.
- **Suggested fix:** Add counter to fallback: `${Date.now()}-${counter++}-${random}`.

---

### CF5-18 — JourneyCreator re-implements `wrapLngNear` instead of importing shared function

- **Severity:** LOW
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/components/JourneyCreator.tsx:91-96`
- **Agreement:** code-reviewer (C5-CR-03)
- **Failure scenario:** Future fix to `wrapLngNear` is applied to interpolate.ts but not the local copy. Behavior diverges.
- **Suggested fix:** Import `wrapLngNear` from `@/lib/interpolate`.

---

### CF5-19 — Toast notifications can overlap bottom controls on small viewports

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/components/Toast.tsx`, `src/components/Controls.tsx`
- **Agreement:** designer (D5-04)
- **Failure scenario:** Export toast overlaps playback controls. User can't adjust playback until toast dismisses.
- **Suggested fix:** Position toasts above controls when track is loaded.

---

### CF5-20 — `harden-static-export.mjs` lacks inline security rationale documentation

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `scripts/harden-static-export.mjs`
- **Agreement:** document-specialist (DS5-01)
- **Failure scenario:** Contributor removes CSP injection thinking it's redundant. Static export loses CSP on GitHub Pages.
- **Suggested fix:** Add JSDoc comments explaining security purpose of each step.

---

## Cross-cycle note

Several findings in this cycle evolve or reinforce findings from the cycle2 aggregate:

- **CF5-02** (trail per-frame rebuild) = F02 from cycle2, still HIGH, no fix applied
- **CF5-08** (mobile dialog semantics) = F12 from cycle2, still MEDIUM, no fix applied
- **CF5-09** (animated mesh) = F13 from cycle2, now with specific export-impact evidence
- **CF5-13** (scene normalization warnings) = F24/F30 from cycle2, with new concrete scenario

New HIGH-severity findings this cycle:
- **CF5-01** (blank video on map unmount during export) — 4 independent reviewers
- **CF5-02** (O(n) trail per frame) — carried from cycle2, still unfixed

## Finding count summary

| Severity | Count |
|----------|-------|
| HIGH | 2 |
| MEDIUM-HIGH | 3 |
| MEDIUM | 8 |
| LOW-MEDIUM | 4 |
| LOW | 3 |
| **Total** | **20** |
