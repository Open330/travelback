# Critic — Cycle r9 (2026-04-24)

## Multi-Perspective Critique

### Code Quality Perspective

The codebase is well-structured with consistent patterns. The `useCallback`/`useRef` dance for stale-closure avoidance is thorough and correct. Error handling is comprehensive with `try/catch` around all localStorage access and async operations.

One pattern worth noting: the `eslint-disable-next-line react-hooks/exhaustive-deps` comments are abundant (found in MapView, page.tsx, TimelineSelector, JourneyCreator). Each includes an explanation, which is good practice. However, the sheer number (8 instances across the codebase) suggests a structural issue: many effects intentionally omit dependencies that React's rules-of-hooks would normally require. This is a known trade-off in map-heavy React applications where re-running effects on every prop change would cause excessive map re-initialization.

### Architecture Perspective

The `HomeInner` component in `page.tsx` remains a "god component" holding ~30 state variables. This is already deferred as DF-C4-001. The component manages: track, theme, map style, export, journey, scenes, keyboard help, toast, units, and playback state. While this is functionally correct, it makes the component hard to test and reason about in isolation.

### UX/DX Perspective

The `TrackWorkspace` component passes through 30+ props from `HomeInner` — essentially a pass-through layer. This is a sign that state management could benefit from React Context or a state machine.

### Correctness Perspective

The `matchedKey` variable in FileUpload (C9-CR-001) is the most notable correctness-adjacent issue. While it doesn't cause a bug today, the variable name creates a misleading mental model.

### Findings

- C9-CR-001 (FileUpload `matchedKey` naming): AGREED, LOW/MEDIUM severity for maintainability
- All prior deferred items remain valid

## Summary

- 0 new findings beyond what code-reviewer identified
- The codebase has fully converged on functional issues; remaining concerns are architectural and maintainability-related
