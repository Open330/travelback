# Cycle r3 — critic review (2026-04-23)

Scope: multi-perspective devil's advocate critique of the repo as of cycle r3 start.

## Observations

### R3-CR-C-1 — Bootstrap script frame-break goes straight to `about:blank`
- **File**: `src/app/layout.tsx:49`.
- **Observation**: if the frame-break try throws and the `window.top.location =` assignment fails, the fallback is `window.location.replace('about:blank')`. The UX for a legitimately-embedded-but-wrong-origin user is a blank page with no explanation. Alternative: redirect to the known canonical origin or show an inline "This page cannot be embedded; open in a new tab" message.
- **Confidence**: Medium. Deferrable — most users will never hit this.
- **Schedule**: defer.

### R3-CR-C-2 — Export CTA disabled-state visual feedback
- **File**: `src/components/ExportPanel.tsx:131-137` (`handleExport` returns early on `!codecReady`).
- **Observation**: when the export button is disabled because no codec is supported, the UI needs to tell the user *why*. A tooltip or text near the disabled state would help.
- **Confidence**: Low. Deferrable.
- **Schedule**: defer.

### R3-CR-C-3 — `videoEncoder` clamp warning is console-only
- **File**: `src/lib/videoEncoder.ts:60-62`.
- **Observation**: when a user sets duration=1000s and the clamp kicks in, they see the shorter video and no UI message. `console.warn` hides the fact. A toast would close the feedback loop. Low severity.
- **Schedule**: defer.

### R3-CR-C-4 — `FileUpload` and `JourneyCreator` both show different spinner styles
- **Observation**: consistency nit — minor UI polish.
- **Schedule**: defer.

### R3-CR-C-5 — `.context/reviews/` is growing large with per-cycle files
- **Observation**: the directory now contains 80+ files. Cycle-rotation and archival policy would help discoverability. `_aggregate.md` is overwritten each cycle — that's good; the per-agent files accumulate.
- **Schedule**: defer — meta-process concern, not code.

## Recommendations

No new code findings unique to the critic lane this cycle. Meta-findings (R3-CR-C-5) recorded.
