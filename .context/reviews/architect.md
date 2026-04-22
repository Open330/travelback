# Architect Review — Cycle 1 (2026-04-23)

## Summary
Review of architectural/design risks, coupling, layering, and component responsibility.

---

## Finding 1: HomeInner component is a 440-line "god component"
- **File**: `src/app/page.tsx`
- **Severity**: Medium | **Confidence**: High
- **Description**: `HomeInner` manages 20+ state variables, 15+ callback handlers, and orchestrates all child components. This is a classic "god component" anti-pattern that makes the code hard to test, maintain, and reason about. State management is entirely via `useState` with prop drilling.
- **Fix**: Consider extracting state management into custom hooks (e.g., `useTrackSession`, `useThemeState`, `useUIPanels`) and reducing prop drilling via context. The `useExportController` and `usePlaybackController` hooks are good examples of this pattern already applied.

---

## Finding 2: Tight coupling between MapView and camera/scene system
- **Files**: `src/components/MapView.tsx`, `src/lib/camera.ts`
- **Severity**: Low | **Confidence**: High
- **Description**: MapView directly imports and uses `computeCameraForProgress`, `normalizeScenes`, and `interpolateAlongTrack`. The camera computation logic is well-encapsulated in `camera.ts`, but MapView has intimate knowledge of scene-based camera vs. basic follow camera switching. This makes it hard to test camera behavior independently.
- **Fix**: Consider extracting camera mode selection into a custom hook that returns the computed camera state, which MapView just applies.

---

## Finding 3: CSS custom properties used without fallbacks
- **Files**: All components
- **Severity**: Low | **Confidence**: Medium
- **Description**: Components use CSS variables like `var(--t1)`, `var(--gl)`, `var(--bg)` etc. extensively in inline styles. These are defined in CSS files. If a CSS file fails to load, the UI falls back to browser defaults which may be unreadable. The layout.tsx body has `style={{ background: 'var(--bg,#EBEEF4)', color: 'var(--t1,#050810)' }}` which provides fallbacks, but most components don't.
- **Fix**: Add fallback values to all `var()` usages in inline styles, or ensure CSS loading is guaranteed.

---

## Finding 4: No error boundary around individual components
- **File**: `src/app/page.tsx`
- **Severity**: Low | **Confidence**: Medium
- **Description**: A single `ErrorBoundary` wraps all of `HomeInner`. If any child component crashes (e.g., MapView, ExportPanel), the entire app shows the error fallback. There are no granular error boundaries around individual components.
- **Fix**: Add error boundaries around MapView and the export pipeline so that a map error doesn't kill the entire UI.

---

## Finding 5: Good separation of parser logic into Web Worker
- **Severity**: Positive | **Confidence**: High
- **Description**: The JSON parsing is offloaded to a Web Worker with proper fallback to main thread. The worker creation, message passing, and error handling are well-structured. The pre-transfer buffer copy pattern ensures data is available for fallback.

---

## Finding 6: Good separation of export logic into useExportController hook
- **Severity**: Positive | **Confidence**: High
- **Description**: The export pipeline is well-isolated in a custom hook with proper cleanup, abort handling, and state management. The separation of concerns between the hook (orchestration) and `videoEncoder.ts` (frame loop) is clean.

---

## Final Sweep
- Component tree and data flow reviewed.
- State management patterns assessed.
- Separation of concerns evaluated.
- Error handling patterns checked.
