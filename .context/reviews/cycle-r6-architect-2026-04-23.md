## Cycle r6 — Architect

Architecture-level review against HEAD `0000000b72`.

### AR-1 (INFO, HIGH) — Named-region posture after cycle r5

Post r5 all persistent on-screen non-modal panels expose landmark semantics:
- `<main id="app">` at `src/app/page.tsx:314`.
- `role="region" aria-labelledby="scene-editor-title"` at `src/components/SceneEditor.tsx:352`.
- `role="region" aria-labelledby="journey-creator-title"` at `src/components/JourneyCreator.tsx:537`.

Everything modal uses `ModalDialog` (role=dialog, aria-modal, focus trap).

Architecture score: landmark coverage complete. No further region work needed this cycle.

### AR-2 (LOW, MEDIUM) — `TrackToolbar` mobile menu panel lacks region label

`src/components/TrackToolbar.tsx:147-159`. The inner panel has `role="menu"` + `aria-label` — that is correct semantics for a transient menu, not a region. The outer wrapper at L134 is effectively a popover trigger container. No change needed; the trigger button `aria-expanded={menuOpen}` at L139 + `role="menu"` on the panel is the right pattern.

No schedule.

### AR-3 (INFO, HIGH) — ErrorBoundary architecture

`src/components/ErrorBoundary.tsx`. Class component + functional wrapper for `useLocale` consumption. That split is intentional because React 19 still requires class components for `getDerivedStateFromError`. No concerns.

### AR-4 (INFO, MEDIUM) — Prop drilling through TrackWorkspace

`src/components/TrackWorkspace.tsx:13-48` — 36-field props interface. High, but explicit; no hidden context plumbing. A refactor to split playback vs chrome concerns would help, but mid-scope and out-of-cycle.

No schedule.

### AR-5 (INFO, HIGH) — Gate script portfolio unchanged

`scripts/harden-static-export.mjs` + `scripts/smoke-static.mjs` + `scripts/fetch-map-styles.mjs` + `scripts/serve-static.mjs`. All four scripts are cohesive and have clear single responsibilities. No architectural drift.

### AR-6 (LOW, MEDIUM) — Timeline `buckets` and `cumulativeDistances` recompute independently

`src/components/TimelineSelector.tsx:103-121` owns its own `buckets` useMemo. `src/app/page.tsx:97-101` owns `cumulativeDistances` useMemo. Both are track-scoped. The split is fine. If we ever add a third distance-histogram consumer we should hoist.

No schedule.

---

Nothing architectural to schedule this cycle.
