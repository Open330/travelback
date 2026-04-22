# Tracer — Cycle 5 (2026-04-23)

## Methodology
Causal tracing of suspicious flows, competing hypotheses for failure modes, and data-flow verification across the system.

## Trace 1: File Upload → Parse → Track Loading Flow
- User drops file → `handleDrop` → `handleFile` → `parseTrackFile` → worker or main-thread parse → `onTrackLoaded` → `loadTrackIntoSession` → state updates
- The `loading` guard added in cycle 4 correctly prevents concurrent parses
- Worker fallback path: Worker crash → `textCopy` fallback → main-thread parse. Worker parse error → reject (no fallback). This asymmetry is intentional and documented.
- **Verdict**: Flow is correct. No new issues found.

## Trace 2: Scene Editor → Camera State → Map Rendering
- User changes scene → `updateScene` → `commitScenes` → `normalizeScenes` → `onChange` → state update → MapView re-render
- During playback: `progress` change → `interpolateAlongTrack` → `computeCameraForProgress` → camera state → `map.jumpTo`
- The `aria-valuetext` issue (C5-F1) is confirmed: hardcoded English in the slider accessibility attributes
- **Verdict**: Functional flow is correct. Accessibility gap identified (C5-F1).

## Trace 3: Export → Video Encoding → Download
- Export click → `exportTrack` → `exportVideo` (mediabunny) → frame loop → `downloadVideo` → save
- Abort handling: `AbortController` signal checked at loop start and after renderFrame
- `completed` flag prevents finalization on abort — correct
- Cleanup: `resetSize` with fallback for container dimensions
- **Verdict**: Export flow is robust. No new issues found.

## Summary
No new causal flow issues discovered. The i18n accessibility gap (C5-F1) was traced through the SceneEditor → screen reader pipeline and confirmed.
