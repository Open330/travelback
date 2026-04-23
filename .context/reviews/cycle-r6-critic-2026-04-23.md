## Cycle r6 — Critic

Aggressive look for design decisions that haven't aged well.

### CT-1 (LOW, HIGH) — Defensive `type="button"` posture is inconsistent

Cycle r5 correctly added `type="button"` to `JourneyCreator` cancel (R5-AGG-6). But ~30 other non-submit buttons still lack the attribute. Either the repo should be all-in on defensive `type="button"`, or explain why only the journey-cancel needed it. This is the sort of half-finished hardening where a future Next.js upgrade that adds a `<form>` somewhere unexpectedly surfaces 30 submit buttons. The safer stance is to land all of them in one mechanical pass.

Files + lines: see CR-1 in cycle-r6-code-reviewer. Schedule: YES.

### CT-2 (INFO, HIGH) — `seekNonce` invariant at `MapView.tsx:886,926,929` is correct but fragile

`src/components/MapView.tsx:886` compares `seekNonce !== lastSeekNonceRef.current`; L926 and L929 update `lastSeekNonceRef.current = seekNonce` on each camera-effect fire. The no-follow path (L927-930) also updates the ref on every frame, which means if followCamera flips back ON without a new seek, the snap branches at L914-916 (which require `explicitSeek`) can miss a genuine follow-on seek. Testing today hasn't surfaced this because toggling follow doesn't change `seekNonce`. Still, any future design that triggers a camera reset via "follow on" rather than a seek will quietly not snap. Document or refactor.

No schedule. Confidence HIGH.

### CT-3 (LOW, MEDIUM) — `TimelineSelector.clampRatios` uses `minGap = 1 / points.length`

`src/components/TimelineSelector.tsx:153-161`. For 250k-point tracks, minGap ≈ 4e-6, which rounds to zero when multiplied by the slider's 0.01 keystep in the arrow-key path (L388, L443). Result: holding arrow down on a 250k-point track can leave the start/end ratios 1 minGap apart but the `ratioToIndex` binary search may still land on two adjacent points. Not a user-visible bug — the `endIdx <= startIdx` guard at L135-137 corrects — but the minGap logic is effectively dead weight at those sizes. Document or simplify.

No schedule. Confidence MEDIUM.

### CT-4 (INFO, MEDIUM) — `isTouchDevice` detection via `ontouchstart`

`src/components/FileUpload.tsx:30-32`. Standard feature-detect. On laptops with touchscreens plus a keyboard/mouse this returns true, and the iOS tip at L242-246 ("iosTip") displays unnecessarily. Not dire — but the copy says iOS — so a Lenovo user sees an iOS tip. Better to check `navigator.userAgent` for iPhone/iPad if the tip text is iOS-specific, or generalize the copy. Noted but not scheduled this cycle.

No schedule. Confidence MEDIUM.

### CT-5 (INFO, HIGH) — `ErrorBoundary` renders a `<div>` wrapper around `children`

`src/components/ErrorBoundary.tsx:70`. The wrapper `<div key={this.state.resetKey}>` exists specifically so that changing `resetKey` forces React to remount children on "try again". Important not to lose — if a future refactor removes the div, `handleReset` silently stops working. Worth an inline comment.

No schedule — keep as-is.

---

Scheduling recommendation: CT-1. Rest is informational.
