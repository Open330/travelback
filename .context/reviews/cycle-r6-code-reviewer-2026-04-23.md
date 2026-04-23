## Cycle r6 — Code reviewer

Source-side review against HEAD `0000000b72`. All six gates reported green at cycle start.

### CR-1 (LOW, HIGH) — Buttons missing explicit `type="button"` still throughout components

`src/components/ErrorBoundary.tsx:51,58` — `handleReset` and `handleReload` buttons.
`src/components/Controls.tsx:80,130` — play/pause and follow-camera toggle.
`src/components/Toast.tsx:52` — toast dismiss button.
`src/components/TimelineSelector.tsx:328` — drag hint overlay.
`src/components/FileUpload.tsx:132,227,249,261` — load-new-file, browse, create-journey, google-guide entry.
`src/components/SceneEditor.tsx:358,362,373,377,381,385,449,607` — scene add, close, presets, remove, undo.
`src/components/JourneyCreator.tsx:634,714,719,732,740,748,769,773` — list item picker + action buttons.

Currently none of these live inside a `<form>`, so the implicit `type="submit"` does not surface as a bug today. This is defensive hardening — any future wrap in `<form>` (or a refactor that introduces one) flips these into inadvertent submit buttons and re-runs validation / full page nav. The repo already fixed this for `JourneyCreator` cancel in cycle r5 (R5-AGG-6). Fixing the rest is one-line and low-risk.

**Fix**: add `type="button"` to every non-submit button in the list above.

Confidence: HIGH. Fix scope: 30-odd single-attribute adds.

### CR-2 (INFO, MEDIUM) — TrackToolbar duplicate-ref guidance already lives in-source

`src/components/TrackToolbar.tsx:154-158` — a 4-line doc comment inside the inner menu panel explicitly warns "Do NOT reassign menuRef here". Good defensive narration, no code change needed.

### CR-3 (LOW, MEDIUM) — `handleInitialStyleLoad` in JourneyCreator.tsx registers style.load then immediately re-registers

`src/components/JourneyCreator.tsx:401-423`. The cleanup at L422-423 tries to off both `handleInitialStyleLoad` and `handleStyleReload`, but `handleInitialStyleLoad` is registered via `map.once(...)` on L414. After the callback fires, MapLibre internally drops the subscription, so the cleanup `map.off('style.load', handleInitialStyleLoad)` at L422 is a no-op on the path where `map.isStyleLoaded()` was true (L411 → `handleInitialStyleLoad()` is called synchronously, adding the `handleStyleReload` listener at L408). Not a leak — `handleStyleReload` has its own off call — but the `handleInitialStyleLoad` off call is dead code on both paths once it fires. Worth a short comment or remove.

**Fix**: drop the redundant off line (low priority) or comment why it is kept (for the not-yet-loaded race).

Confidence: MEDIUM.

### CR-4 (NITS, HIGH) — `handleInputChange` does not trigger the `handleFile` load on drop

`src/components/FileUpload.tsx:124-128` — compares the unsupported extension only on drop (L101). A keyboard-initiated file picker can still drop a `.txt` via `<input type="file">` (the `accept` is advisory). Parser will return `UNSUPPORTED_FORMAT` and surface via the existing error code map at L63-72. Not a security bug — the parser guard is the authoritative gate — but the duplicated validation layer is inconsistent. Carry-over observation.

No schedule. Confidence HIGH.

### CR-5 (INFO) — no new regressions in files touched by cycles r1-r5

Spot-checked `GlobalToolbar.tsx`, `TimelineSelector.tsx`, `SceneEditor.tsx`, `JourneyCreator.tsx`, `TrackToolbar.tsx`, `FileUpload.tsx`, `e2e/travelback.spec.ts`, `scripts/smoke-static.mjs` and `scripts/harden-static-export.mjs`. All cycle-r5 fixes are present and semantically correct.

---

Scheduling recommendation: CR-1 (add `type="button"` to the 30-odd buttons we still own). CR-2 and CR-5 are informational. CR-3, CR-4 defer as nits / carry-over.
