# Critic — Adversarial Review (Cycle 5, 2026-07-16)

Reviewed revision: bdfb1d7

## Result

**Two new actionable findings:** one Medium/High and one Low/High. Both were reproduced in the rendered app. The Playwright retry anomaly is routed to TEST5-01 and is not presented as a confirmed product regression. No deployment was performed.

## Inventory and challenge method

Challenged all 53 src files and their cross-file ownership, 15 unit-test files, the complete 93-test Playwright journey and 18 fixtures, public worker/map assets, scripts, package/framework configuration, Pages workflow, README, and current project/development/plan context. Cycle 4 findings and B01-B04/D01-D03 carryovers were checked before assigning new IDs.

The live audit used desktop 1440×1000 and mobile 390×844, dark/light, EN/KO, keyboard/focus, landing, sample/import, playback, timeline, Camera, Export, invalid upload, error/loading states, storage/network, console, and responsive geometry.

## New findings

### CRIT5-01 — Playback UI covers MapLibre attribution and blocks its pointer target

Severity: **Medium** | Confidence: **High** | Status: **Confirmed at desktop and mobile**

Evidence:

- src/components/MapView.tsx:1011-1017 applies map-has-track-controls after a track loads.
- src/app/globals.css:214-257 offsets only MapLibre's top-left/top-right controls and enlarges attribution controls, but gives .maplibregl-ctrl-bottom-right no bottom clearance.
- src/components/TrackWorkspace.tsx:142-174 anchors the timeline/elevation/playback stack over the full bottom edge at z-index 10.
- src/components/Controls.tsx:147-154 puts distance and time statistics on that same bottom row.
- e2e/travelback.spec.ts:710-785 checks top controls/toolbars only; it never compares attribution with the bottom overlays.

Runtime proof at 390×844:

- attribution box: x=295.64, y=810, w=84.36, h=24
- playback-stats box: x=27, y=809, w=336, h=16
- time text: x=307.89, y=809, w=55.11, h=16
- elementFromPoint over the collision returned the playback time span, leaving attribution below the application overlay.

The desktop 1440×1000 capture also shows the attribution under the translucent playback panel. Its text bleeds through, but the link/toggle is not reliably pointer reachable.

Failure scenario: a phone user cannot read the current time cleanly or open the map attribution control. This is not merely cosmetic: the app obscures a third-party attribution surface that must remain legible and interactive.

Required fix: reserve a bottom-right gutter or move .maplibregl-ctrl-bottom-right above the full playback/elevation stack at each responsive layout. Keep attribution visible, clickable, and keyboard reachable. Add desktop/mobile box-intersection and hit-target regressions.

### CRIT5-02 — Changing locale leaves the loaded-workspace live status in the old language

Severity: **Low** | Confidence: **High** | Status: **Confirmed in EN→KO runtime switch**

Evidence:

- src/app/page.tsx:329-341 snapshots workspaceAnnouncement with tRef.current only when a track loads.
- src/app/page.tsx:638-642 renders that stored string in role=status with aria-live=polite.
- src/lib/i18n.ts:1873-1887 changes document.lang and the translation callback when locale changes.
- src/lib/i18n.ts:689 contains the Korean app.trackLoaded translation.
- e2e/travelback.spec.ts:311-323 checks document.lang and visible labels, but not the already-populated live status.

Runtime proof: load “Namsan Tower Walk” in English, switch Language to KO, then inspect the status region. document.documentElement.lang is ko and visible controls are Korean, but the region still reads “Track loaded: Namsan Tower Walk.”

Failure scenario: a screen-reader user switches to Korean and later encounters English status content inside a Korean document/voice context. Other loaded-workspace labels update, so the mismatch is surprising and can cause incorrect pronunciation.

Required fix: store semantic status data rather than a translated sentence, or recompute the rendered status when locale changes. Decide deliberately whether the locale switch should re-announce it. Add a loaded-track EN→KO assertion for both document.lang and status text.

## Cross-role observations

The full E2E run classified the map-retry journey case as flaky, but the same test passed 3/3 with retries disabled in isolation. TEST5-01 treats this as an intermittent readiness/test-harness issue, not proof of a product retry defect. The stale destructive E2E command in the Mina runbook is routed to DOC5-01.

## Final missed-issue sweep

Rechallenged import races, parser/worker parity, map retry hydration, playback ownership, trimming transactions, scene undo, theme/export leases, modal focus, share/download states, privacy/network behavior, and responsive overlays. No third new product defect met the confidence threshold.
