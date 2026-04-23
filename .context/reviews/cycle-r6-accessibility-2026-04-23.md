## Cycle r6 — Accessibility

### A11Y-1 (LOW, HIGH) — `ThemeToggle` button lacks focus-visible ring

`src/components/ThemeToggle.tsx:59-72`. `className="gi flex h-11 w-11 items-center justify-center cursor-pointer"` — no `focus-visible:outline-…` utility. Used prominently in both the `GlobalToolbar` (landing screen) and the track workspace (`TrackToolbar`'s mobile menu). Keyboard users cannot see where focus landed.

**Fix**: append `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]`.

Schedule: YES. Confidence HIGH.

### A11Y-2 (LOW, HIGH) — `ErrorBoundary` recovery buttons lack focus-visible ring

See UX-1. Since ErrorBoundary is a last-resort recovery UI, keyboard access is critical.

Schedule: YES (bundle with UX-1..UX-8).

### A11Y-3 (LOW, HIGH) — `MapView` map-error reload button lacks focus-visible ring

See UX-2.

Schedule: YES (bundle).

### A11Y-4 (LOW, HIGH) — `KeyboardHelp` help toggle lacks focus-visible ring

See UX-3.

Schedule: YES (bundle).

### A11Y-5 (LOW, HIGH) — `TrackToolbar` command row buttons lack focus-visible ring

See UX-4. 7+ buttons: New, Camera, Map style, Export, mobile menu trigger, mobile menu items (x3), units buttons (x2).

Schedule: YES (bundle).

### A11Y-6 (LOW, MEDIUM) — `SceneEditor` close and preset buttons lack focus-visible rings

`src/components/SceneEditor.tsx:358-367` (add+close), `:373-388` (preset buttons × 4), `:449-453` (delete scene), `:473-482` (customize toggle), `:602-611` (undo banner button), `:617-633` (modal confirm + cancel).

Schedule: YES (bundle) for the subset visible without scene expansion (close, add, presets, delete). Expanded-panel sliders and range-editor already handle focus-visible via the existing class.

### A11Y-7 (LOW, MEDIUM) — `ExportPanel` close and action buttons lack focus-visible rings

`src/components/ExportPanel.tsx:190-199` (close), `:225-233` (Export Again), `:304-313` (Advanced toggle), `:360-362` (Start Export already uses `.vitro-btn-primary`). Share button `:235-243` already has primary class.

Schedule: YES (bundle) for close + Export Again + Advanced toggle.

### A11Y-8 (LOW, MEDIUM) — `GoogleGuide` close button lacks focus-visible ring

`src/components/GoogleGuide.tsx:278-287`. Visible on all tab panels. Landing via keyboard Tab needs a focus indicator.

Schedule: YES (bundle).

### A11Y-9 (LOW, MEDIUM) — `FileUpload` load-new-file trigger lacks focus-visible ring

`src/components/FileUpload.tsx:132-141`. The small fixed-position button at `top-4 left-4` is the keyboard entry point to replace a loaded track. No focus ring.

Schedule: YES (bundle).

### A11Y-10 (LOW, MEDIUM) — `Controls` play/pause + follow-camera buttons lack focus-visible ring

`src/components/Controls.tsx:80-92` (play/pause), `:130-142` (follow-camera toggle). Primary playback surface.

Schedule: YES (bundle).

### A11Y-11 (LOW, MEDIUM) — `Toast` dismiss button lacks focus-visible ring

`src/components/Toast.tsx:52-56`. Error toasts land in an aria-live region that screen readers announce, but keyboard users need the dismiss indicator.

Schedule: YES (bundle).

### A11Y-12 (LOW, MEDIUM) — `JourneyCreator` header buttons lack focus-visible rings

`src/components/JourneyCreator.tsx:545-551` (cancel — has text ring? no, only `transition-colors`), `:600-611` (search submit), `:612-619` (search disable), `:571-580` (enable-search), `:655-672` (icon buttons × 6), `:714-725` (confirm cancel/create), `:732-756` (undo/clear/done), `:769-776` (discard modal cancel/confirm).

Schedule: YES (bundle) for the primary surface — header cancel, enable-search, icon buttons, undo/clear/done.

### A11Y-13 (LOW, MEDIUM) — `TimelineSelector` drag-hint overlay button lacks focus-visible ring

`src/components/TimelineSelector.tsx:328-337`. Shown on first load. Keyboard users tab through and need a focus indicator.

Schedule: YES (bundle).

---

Scheduling recommendation: one "focus-visible coverage sweep" landing covering A11Y-1..A11Y-13 and UX-1..UX-8. The set overlaps entirely — one mechanical pass. Also CR-1 (defensive `type="button"`) happens to cover the same buttons, so the two can land as one sweep per-file to minimize review churn.
