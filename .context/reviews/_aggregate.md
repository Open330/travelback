# Aggregate Deep Review — Cycle 9

Date: 2026-07-24
Reviewed revision: `0c7eb7cb0d9265797327c343684d27ad27fdfdfa`
Branch: `review-plan-fix/no-deploy-20260723`
Deployment: prohibited and not attempted

## Result

The grouped 12-role review plus the registered non-technical-traveler
perspective produced **3 genuinely new, deduplicated findings**:

- 0 Critical
- 0 High
- 1 Medium
- 2 Low

All findings are actionable in Cycle 9 and none is deferred. Duplicate
reports retain the highest supported severity and confidence. All Cycle 1–8
roots and repairs, prior execution errors, and the three explicit native/host
process boundaries were excluded.

No reviewer ran a full suite, process-supervisor test, E2E, Playwright,
Chromium/browser, server, build, deployment, commit, push, or process signal.

## Review provenance

The three complete provisional reports are:

- `cycle9-2026-07-24-core.md` — code quality, performance, security, tracing,
  and debugging;
- `cycle9-2026-07-24-arch-tests.md` — architecture, verification, tests, and
  documentation; and
- `cycle9-2026-07-24-ux-critic.md` — critic, designer, accessibility, i18n,
  and the non-technical-traveler perspective.

Compatible roles were grouped into three agents to respect the cycle's thread
capacity. Each group inventoried the complete current product, delivery,
test, asset, and active documentation surface and performed a closing
missed-file sweep.

## Deduplicated findings

### AGG9-01 — A valid duration draft bypasses the panel's prospective export eligibility

Severity: **Medium**
Confidence: **High**
Agreement: core reviewer

Evidence:

- `src/components/ExportPanel.tsx:111-164,241-263,483-505,569-598`
- `src/lib/videoEncoder.ts:7,113-132,157-173`
- `src/components/ExportPanel.test.ts:288-339`
- `e2e/travelback.spec.ts:3177-3203`

The duration input intentionally keeps a string draft until blur, Enter, or
Start Export, but all displayed output/memory/time estimates and
`canStartExport` still use the previously committed numeric duration.
`handleExport` checks that stale render-time gate before parsing the draft,
then sends the newly parsed duration to `onExport` without re-evaluating it.

At 1080×1920, 30 fps, and Maximum quality, a committed 10-second request is
estimated at about 87.14 MiB and is allowed. Typing a valid 180-second draft
while focus remains in the field leaves the UI on the 10-second estimates and
allowed state, although the same estimator gives the draft about 492.76 MiB.
An activation path that does not first fire blur can therefore admit the
180-second request. The encoder eventually rejects it at its independent
256 MiB guard, but only after the controller has acquired the export lease,
paused playback, resized the map, and begun settlement work.

Fix: parse one prospective duration for estimates, warnings, eligibility, and
the request. Recompute the size/memory gate from the parsed value inside the
Start handler as defense in depth. Add a component regression that crosses
the memory limit in both directions without a separate blur/Enter and proves
the estimates, warning, button state, and request duration stay consistent.

### AGG9-02 — Large-card social metadata has no image

Severity: **Low**
Confidence: **High**
Agreement: architecture/test/documentation reviewer and UX/critic reviewer

Evidence:

- `src/app/layout.tsx:24-37`
- `public/landing-preview.svg:1-47`
- `.context/project/01-overview.md:55,100`
- `scripts/smoke-static.mjs:141-273,438-475`

The root layout declares Open Graph text and
`twitter.card: "summary_large_image"`, but neither metadata object supplies
an image and no `opengraph-image.*` or `twitter-image.*` convention file
exists. The in-page landing SVG does not make Next emit `og:image` or
`twitter:image`. Shared links can therefore render a downgraded or text-only
card despite the project overview's “Full metadata for social sharing” claim.

Fix: add a crawler-compatible, locale-neutral 1200×630 raster preview with
useful alt text; register one base-path-safe absolute URL in both metadata
objects; and make the static smoke verify the generated head, dimensions,
alt text, mount path, media type, and served asset.

### AGG9-03 — Export cleanup documentation describes the pre-snapshot contract

Severity: **Low**
Confidence: **High**
Agreement: architecture/test/documentation reviewer

Evidence:

- `.context/project/02-architecture.md:46-84,148-159`
- `src/lib/useExportController.ts:369-389`
- `src/lib/map-export-presentation.ts:25-96`
- `src/components/MapView.tsx:373-409,494-510`
- `src/lib/map-export-presentation.test.ts:88-219`

The architecture guide and controller comments still describe `resetSize()`
as clearing inline dimensions to the container's natural layout. Cycle 5
changed the real contract into a presentation transaction: it captures exact
inline dimensions, automatic versus explicit DPR ownership, and (when Follow
is off) the manual camera; cleanup restores that snapshot in order. Only the
no-snapshot teardown fallback clears dimensions.

Fix: document capture/apply/restore as one presentation lease, distinguish
the snapshot and fallback paths, and correct the inline comments. Preserve
the existing focused tests that prove exact dimension, DPR, and manual-camera
restoration.

## Exclusions and final sweep

- The English text embedded in `public/landing-preview.svg` was excluded as
  Cycle 7's exact static-English-art-bypasses-i18n root
  (`CRIT7-03` / `DOC7-01`), not renamed as a new finding.
- The suspected FileUpload post-parse handoff race was rejected: active
  export keeps the app inert, the no-lease path settles in the current
  microtask checkpoint, and shared settlement continuations retain intent
  order.
- Scene camera preview/commit ordering was rejected after tracing keyboard,
  pointer, cancellation, and unmount terminals.
- Cycle 8 MapLibre initial/live canvas, navigation, compass, and attribution
  localization remains intact.
- Cycle 7 import collection bounds, parser/worker parity, Unicode filename
  handling, and architecture repair remain intact.
- Cycle 6 GPX fallback, wrapped-geometry release, Scene Editor settlement, and
  semantic no-op export preservation remain intact.
- The three explicit platform boundaries remain unchanged: pre-observation
  identity erasure, pidfd-grade atomic signaling, and exact global marker
  discovery without native/host-environment support.

The final missed-file sweep found no fourth distinct root. No deployment
occurred.
