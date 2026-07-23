# Aggregate Deep Review — Cycle 8

Date: 2026-07-24
Reviewed revision: `9b3343cd0c01fabb84dc47f4f34c28238d98a99e`
Branch: `review-plan-fix/no-deploy-20260723`
Deployment: prohibited and not attempted

## Result

The grouped 12-role reviewer fan-out plus the registered non-technical
traveler reviewer produced **1 genuinely new, deduplicated finding**:

- 0 Critical
- 0 High
- 1 Medium
- 0 Low

The finding is actionable in Cycle 8 and is not deferred. Reports shared by
multiple roles count once at the highest supported severity and confidence.
All Cycle 1–7 fixes, the three explicit native/host process boundaries, and
the final-loop-only user cleanup task were excluded.

No reviewer ran a full suite, process-supervisor test, E2E, Playwright,
Chromium/browser, server, deployment, commit, push, or process signal.

## Review provenance

Current Cycle 8 reports:

- `cycle8-2026-07-24-core.md` — code quality, security, tracing, and debugging
- `cycle8-2026-07-24-arch-tests.md` — performance, architecture,
  verification, tests, and documentation
- `cycle8-2026-07-24-ux-critic.md` — critic, designer, accessibility, and the
  registered non-technical-traveler reviewer

All requested roles completed. Compatible roles were grouped into three
review agents to respect the cycle's thread-capacity limit. The core reviewer
used one bounded static library audit while a slot was available. It returned
zero additional roots and made no file or process changes.

## Deduplicated finding

### AGG8-01 — Selected locale never reaches MapLibre's own controls

Severity: **Medium**
Confidence: **High**
Agreement: critic, designer, non-technical-traveler reviewer

Evidence:

- `src/lib/i18n.ts:1953-1977`
- `src/components/MapView.tsx:254-274,837-875,1159-1166`
- `src/app/page.tsx:625-640`
- installed
  `node_modules/maplibre-gl/dist/maplibre-gl.d.ts:10227-10239,11219-11224`

`LocaleProvider` updates React locale state and `<html lang>`, but `MapView`
reads only the translation callback and constructs `maplibregl.Map` without
the library's supported `locale` patch. MapLibre therefore installs its
default English UI strings for:

- the map canvas (`Map.Title`);
- zoom in and zoom out;
- reset bearing / compass guidance; and
- compact attribution toggling.

Changing the app to Korean, Japanese, Chinese, or Spanish updates the
surrounding interface while those visible tooltips and accessible names
remain English. A screen reader can consequently pronounce English control
names using the selected document-language voice.

This is distinct from earlier localized app copy, live status, guide artwork,
range controls, attribution geometry, and attribution keyboard-operation
fixes. Repository-history searches found no previous MapLibre locale mapping
or dynamic control-label lifecycle.

Fix: add app-owned translations for the five used MapLibre strings, pass the
selected locale mapping when creating the map, and synchronize the long-lived
canvas/control DOM after locale changes without rebuilding the map. Add a
focused mapping regression plus a retries-off browser assertion that switches
languages after a track is loaded and proves the same map/route remains while
canvas, zoom, compass, and attribution names change.

## Exclusions and final sweep

- All completed Cycle 1–7 causal roots and gate corrections, including Cycle
  7 bounded import collection, parser cardinality regressions, Unicode-safe
  filename truncation, and architecture corrections.
- Cycle 6 GPX fallback, wrapped-geometry release, Scene Editor preview
  settlement, and semantic scene no-op export preservation.
- The three explicit platform boundaries: pre-observation identity erasure,
  pidfd-grade atomic signaling, and exact host-environment marker discovery.
- The final-loop-only task in
  `.context/plans/user-injected/pending-next-cycle.md`.
- Previously measured or explicitly deferred XML materialization,
  `preserveDrawingBuffer`, app-shell playback reconciliation, and browser
  encoder/finalizer limits.
- Browser-only visual hypotheses without a distinct source-backed failure.

The final missed-file sweep found no second genuinely new root. No deployment
occurred.
