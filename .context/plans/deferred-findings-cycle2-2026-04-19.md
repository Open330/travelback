# Deferred Findings — Cycle 2 (2026-04-19)

Findings from the cycle 2 review that are not scheduled for implementation this cycle.

---

## F4. Reference grid dominates sparse map (MEDIUM)
- **File:** `src/components/MapView.tsx:165-321`
- **Original severity/confidence:** MEDIUM / CONFIRMED
- **Reason for deferral:** Depends on F1 (map style fix) being completed first. After full CARTO styles are restored, the grid may no longer dominate visually.
- **Exit criterion:** Re-evaluate after F1 is fixed. If grid still dominates with full styles, schedule for implementation.

## F5. Map navigation control placement conflicts with toolbar (LOW)
- **File:** `src/components/MapView.tsx:508`
- **Original severity/confidence:** LOW / CONFIRMED
- **Reason for deferral:** Minor cosmetic issue. Does not affect functionality.
- **Exit criterion:** When UI polish pass is scheduled.

## F6. ErrorBoundary has no i18n for error messages (LOW)
- **File:** `src/components/ErrorBoundary.tsx`
- **Original severity/confidence:** LOW / CONFIRMED
- **Reason for deferral:** Error boundary is rarely shown. i18n coverage is nice-to-have.
- **Exit criterion:** When i18n completeness pass is scheduled.

## F7. downloadVideo fallback fetches URL that may already be revoked (MEDIUM)
- **File:** `src/lib/videoEncoder.ts:162-163`
- **Original severity/confidence:** MEDIUM / LOW
- **Reason for deferral:** Latent risk — current code always passes `blob`, so the `fetch(url)` fallback is never reached in practice.
- **Exit criterion:** If video download logic changes to not pass blob, or if blob becomes optional.

## F8. ElevationProfile SVG useId() SSR mismatch (LOW)
- **File:** `src/components/ElevationProfile.tsx:17`
- **Original severity/confidence:** LOW / LOW
- **Reason for deferral:** App is fully client-rendered (`'use client'`), so SSR mismatch is theoretical.
- **Exit criterion:** If SSR is introduced for this component.

## F9. Worker parser fallback may silently lose data for large files (MEDIUM)
- **File:** `src/lib/parser.ts:450-516`
- **Original severity/confidence:** MEDIUM / MEDIUM
- **Reason for deferral:** Edge case affecting only very large (>50MB) files when worker creation fails. Current fallback behavior (reject with error message) is acceptable for now.
- **Exit criterion:** When large file handling improvements are prioritized.

## F11. Map interactive when aria-hidden (LOW)
- **File:** `src/components/MapView.tsx:382-391`
- **Original severity/confidence:** LOW / CONFIRMED
- **Reason for deferral:** Minor accessibility issue. The `inert` attribute should prevent keyboard interaction, but mouse events may still reach the map canvas.
- **Exit criterion:** When accessibility audit is scheduled.

## F12. TimelineSelector stale closure risk (MEDIUM)
- **File:** `src/components/TimelineSelector.tsx`
- **Original severity/confidence:** MEDIUM / LOW
- **Reason for deferral:** Theoretical risk — no reported bugs from this. Would need careful analysis of event handler lifecycles.
- **Exit criterion:** If timeline selector bugs are reported, or when component is refactored.

## F14. JourneyCreator coordinate validation (LOW)
- **File:** `src/components/JourneyCreator.tsx`
- **Original severity/confidence:** LOW / LOW
- **Reason for deferral:** Low impact — invalid coordinates would place markers in the ocean, which is self-correcting via drag.
- **Exit criterion:** When input validation pass is scheduled.

## F16. SceneEditor start >= end validation (MEDIUM)
- **File:** `src/lib/camera.ts:19-44`, `src/components/SceneEditor.tsx`
- **Original severity/confidence:** MEDIUM / MEDIUM
- **Reason for deferral:** The `normalizeScenes()` function handles this gracefully. The UX could be improved but it's not broken.
- **Exit criterion:** When scene editor UX improvements are scheduled.
