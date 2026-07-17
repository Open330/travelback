# Cycle 10 Architecture Review — 2026-07-17

Review target: `3d74754369d22ad1bb9e7970634e0f0163d5b777`.

## Result

Two cross-boundary ownership faults explain the user-visible Cycle 10 failures. Parsers manufacture localized display content even though they have no locale, and export completion collapses generated/download-started/save-confirmed into a display method that overstates persistence. No new dependency cycle, worker/main-thread parser fork, state-owner race, or map-generation regression survived the final sweep.

## Scope

Inventoried the complete 102-file application surface and traced imports among all app/components/lib/worker modules, tests/fixtures, public worker/assets/styles, scripts/configuration/workflow, README, and current architecture/development context. Cross-file paths covered import dispatch and limits, worker parity, track identity/state, playback and scene camera consumers, map lifecycle, Journey Creator ownership, encoder/finalization, locale/theme hydration, and static export hardening.

## Findings

### ARCH10-01 — Locale-neutral parsers own user-facing fallback copy

- Severity: Medium
- Confidence: High
- Status: Confirmed
- Locations: GPX `src/lib/parser.ts:214-216`; KML `src/lib/parser.ts:228-230`; Google `src/lib/googleJsonParser.ts:377-380`; downstream rendering/export naming through track state
- Fault: transport/domain parsing produces literal English display labels. Neither main-thread nor generated-worker parser API accepts locale, so the UI cannot distinguish a real source name from manufactured English text and cannot localize it later.
- Failure scenario: switching to Korean before importing an unnamed file still yields an English workspace title and may propagate that label into generated filenames.
- Root fix: represent identity structurally: preserve a source-provided name when present, otherwise carry `name: null` plus a source kind (or equivalent missing-name metadata). Resolve display/export fallbacks in the locale-aware presentation boundary. Keep worker serialization stable and add separate GPX/KML/Google contract cases.

### ARCH10-02 — Export state conflates generation, initiation, and persistence

- Severity: Medium
- Confidence: High
- Status: Confirmed
- Locations: `src/lib/videoEncoder.ts:296-303,336-360`; `src/lib/useExportController.ts:250-264`; `src/components/ExportPanel.tsx:302-310`
- Fault: the encoder correctly models the anchor path as `saved:false`, but the controller reduces the result to a method string and the panel derives a binary ready/success heading. “Generated,” “download attempted/started,” and “file save confirmed” therefore have no exclusive owner.
- Failure scenario: the platform blocks or redirects an anchor download, yet the UI enters the same “Video saved!” branch used after confirmed persistence.
- Root fix: promote a completion-state union such as `ready | download-started | save-confirmed`, with method retained as secondary telemetry. Make copy, recovery action, focus, and share eligibility exhaustive over that state.

## Boundary and lifecycle assessment

- Main-thread and worker imports still share the same parsing implementation and limit/error contract; no new parser duplication was found beyond the fallback-label responsibility above.
- Map generation/style/track ownership remains explicit; sample load and Scene preview produced no page errors in the live exact-HEAD app.
- Playback and encoder continue to share camera/interpolation logic; no second camera authority was introduced by the current revision.
- Modal focus, theme/locale hydration, local persistence, and static-base-path helpers retain single owners. The missing H1 is a markup defect rather than an architectural boundary fault.

## Final sweep

The missed-issue sweep challenged effect cleanup, stale async results, mutation/ref authority, duplicated derived state, locale hydration, parser/worker drift, scene interval ownership, map listener cleanup, export cancellation/finalization, build-worker parity, static asset rewriting, and dependency inversion. The visually suspected scene-range endpoint issue was rejected by symmetric live geometry; mobile safe-area behavior remains a physical-device validation item rather than a claimed architecture failure.

Fresh exact-HEAD lint, type generation/checking, worker parity, 17 files/405 unit tests, production build/hardening, and a retries-off 13-case Chromium journey/import/export slice all passed. These gates do not change the two deterministic cross-boundary findings above.
