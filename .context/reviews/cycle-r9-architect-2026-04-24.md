# Architect — Cycle r9 (2026-04-24)

## Architectural Review

### Component Architecture

The application follows a top-down data flow pattern with `HomeInner` as the root state container:

```
HomeInner (30+ state variables)
├── MapView (ref-based imperative API)
├── FileUpload / JourneyCreator (data input)
├── TrackWorkspace (track display + editing)
│   ├── TrackToolbar
│   ├── SceneEditor
│   ├── TimelineSelector
│   ├── ElevationProfile
│   └── Controls
├── ExportPanel (via ModalDialog)
├── GoogleGuide (via ModalDialog)
├── KeyboardHelp (via ModalDialog)
├── GlobalToolbar
└── Toast
```

### Layering Assessment

- **Data flow:** Unidirectional, props-driven. No two-way binding anti-patterns.
- **Side effects:** Properly contained in `useEffect` hooks with cleanup.
- **Imperative escape hatches:** MapView uses `useImperativeHandle` for camera/resize control, which is appropriate for a WebGL component.
- **Modal management:** `ModalDialog` uses a stack (`openModalStack`) for nested dialog support. This is well-designed.

### Coupling Assessment

- `HomeInner` is tightly coupled to all child components via prop drilling (DF-C4-001).
- `usePlaybackController` and `useExportController` are well-decoupled custom hooks.
- `i18n` system uses React Context correctly with a provider at the top level.

### Risks

1. **HomeInner god component** (DF-C4-001): Remains the primary architectural risk. The component has ~470 lines and manages ~30 state variables. Extracting state into Context providers would reduce prop drilling and improve testability.

2. **Module-level mutable state in ModalDialog** (`openModalStack`, `lockedBodyOverflow`): This is module-level state shared across all ModalDialog instances. While it works correctly for the current single-app-page use case, it would break if the component were used in a micro-frontend or if multiple app instances existed on the same page.

### Findings

No new architectural findings beyond existing deferred items.

## Summary

- 0 new findings
- Architectural concerns (DF-C4-001, DF-C4-002) remain deferred and unchanged
