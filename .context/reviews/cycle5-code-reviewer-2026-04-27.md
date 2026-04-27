# Code Reviewer — Cycle 5 (2026-04-27)

Repository: `/Users/hletrd/flash-shared/Travelback`
Reviewer: code-reviewer

## Findings

### C5-CR-01 — Export continues after component unmount, can produce corrupt video
- **Severity:** MEDIUM-HIGH
- **Confidence:** High
- **File:** `src/lib/useExportController.ts:60-65, 102-261`
- **Description:** When the `useExportController`-owning component unmounts during an active export (e.g., React strict-mode double-mount, or a route change), `mountedRef.current` is set to `false`, preventing state updates. However, the `AbortController` is NOT aborted. The export loop in `videoEncoder.ts` continues iterating, calling `renderFrameAndWait` and `waitForIdle` against a potentially-destroyed map. Since `MapView` cleanup destroys the map on unmount, `mapRef.current` becomes `null`, causing `waitForIdle` to resolve immediately with `true` and `renderFrameAndWait` to resolve immediately (no map). The encoder produces a video with blank/black frames.
- **Failure scenario:** User starts export, navigates away or the component remounts. A "successful" MP4 is produced but contains no actual map frames. User downloads a useless video file.
- **Suggested fix:** Abort `exportAbortRef.current` in the unmount cleanup effect. Also verify that `mapHandle.getMap()` returns a valid map before each frame capture.
```ts
useEffect(() => {
  return () => {
    mountedRef.current = false
    exportAbortRef.current?.abort() // Add this line
  }
}, [])
```

---

### C5-CR-02 — `window.confirm()` used instead of app's ModalDialog
- **Severity:** MEDIUM
- **Confidence:** High
- **File:** `src/app/page.tsx:295`
- **Description:** `handleRangeChange` uses `window.confirm(t('scenes.trimClearConfirm'))` to ask the user whether to clear scenes when trimming the range. This is inconsistent with the rest of the app, which uses the custom `ModalDialog` component (e.g., JourneyCreator's discard confirm, SceneEditor's preset replace confirm). `window.confirm()` blocks the main thread, cannot be styled, and provides a jarring UX inconsistency especially on mobile where browser confirm dialogs look alien.
- **Failure scenario:** User on mobile sees an unstyled browser alert when trimming the timeline range with scenes active. This breaks the visual design language.
- **Suggested fix:** Replace with a `useState<boolean>` toggle + `ModalDialog`, following the same pattern as `JourneyCreator`'s `showDiscardConfirm`.

---

### C5-CR-03 — JourneyCreator re-implements `wrapLngNear` locally instead of importing shared function
- **Severity:** LOW
- **Confidence:** High
- **File:** `src/components/JourneyCreator.tsx:91-96` vs `src/lib/interpolate.ts:10-15`
- **Description:** `buildLineGeoJSON` in JourneyCreator defines a local `wrapLngNear` closure that is functionally identical to the exported `wrapLngNear` from `@/lib/interpolate`. The file already imports `shortestLngDelta` and `normalizeLng` from that same module. The local definition diverges in style (while-loop vs while-loop, same logic) but is identical in behavior. This is a DRY violation.
- **Failure scenario:** A future fix to `wrapLngNear` (e.g., optimization, edge-case handling) is applied to `interpolate.ts` but not to the local copy in JourneyCreator. Behavior diverges.
- **Suggested fix:** Import `wrapLngNear` from `@/lib/interpolate` and remove the local definition.

---

### C5-CR-04 — TrackWorkspace forwards 25+ props without type narrowing
- **Severity:** LOW-MEDIUM
- **Confidence:** Medium
- **File:** `src/components/TrackWorkspace.tsx:13-50, 52-89`
- **Description:** `TrackWorkspace` receives 25+ props and passes most of them straight through to child components (`Controls`, `ElevationProfile`, `TimelineSelector`, `TrackToolbar`, `SceneEditor`). This "prop drilling" layer adds no logic — it's purely a pass-through. Any future addition to the child component interfaces requires editing TrackWorkspace's props too. This is a maintainability concern that compounds over time.
- **Failure scenario:** Adding a new prop to `Controls` requires editing three files: the page, TrackWorkspace, and Controls. If TrackWorkspace is skipped, the prop silently doesn't reach Controls.
- **Suggested fix:** Consider using React Context or a composed-children pattern for the workspace. At minimum, use object spread forwarding (`<Controls {...controlsProps} />`) to reduce explicit prop listing.

---

### C5-CR-05 — `isCodecSupported` swallows all errors, returning `false` without actionable feedback
- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **File:** `src/lib/videoEncoder.ts:248-258`
- **Description:** When `isCodecSupported` catches an error (e.g., mediabunny import fails due to CSP, network error), it returns `false` and logs to `console.debug`. The ExportPanel then shows "codec unavailable" with no explanation of WHY. Users behind strict CSP or with network issues see all codecs grayed out with no actionable guidance.
- **Failure scenario:** Corporate proxy blocks the mediabunny module. All codecs show "unsupported" in the export panel. User cannot export at all and has no idea why.
- **Suggested fix:** Differentiate between "codec not supported by browser" (WebCodecs API check) and "codec check failed" (import error). Surface the latter as a distinct error message in the export panel.

---

### C5-CR-06 — `downloadVideo` fallback provides no confirmation that download actually started
- **Severity:** LOW-MEDIUM
- **Confidence:** Medium
- **File:** `src/lib/videoEncoder.ts:225-245`
- **Description:** The `<a>` click download technique is a best-effort fallback. Some browsers (especially mobile WebViews, Safari < 15.4) may silently fail to initiate the download. The function returns `{ saved: false, method: 'fallback' }`, which the ExportPanel uses to show "Saved to Downloads" — but the download may not have actually started. This creates a false-positive UX.
- **Failure scenario:** User on older Safari clicks "Download", sees "Saved to Downloads" message, but no file was actually saved. User believes the download succeeded.
- **Suggested fix:** Change the success message for fallback downloads to be less definitive (e.g., "Download started" instead of "Saved to Downloads"). Add a retry button or suggest using the "Share" alternative.

---

## Summary

| ID | Severity | Confidence | File |
|----|----------|------------|------|
| C5-CR-01 | MEDIUM-HIGH | High | useExportController.ts |
| C5-CR-02 | MEDIUM | High | page.tsx |
| C5-CR-03 | LOW | High | JourneyCreator.tsx |
| C5-CR-04 | LOW-MEDIUM | Medium | TrackWorkspace.tsx |
| C5-CR-05 | LOW-MEDIUM | High | videoEncoder.ts |
| C5-CR-06 | LOW-MEDIUM | Medium | videoEncoder.ts |
