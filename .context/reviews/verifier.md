# Verifier Review — Cycle 4

Date: 2026-07-16
Reviewed revision: 4917d39
Deployment: **not run**, per the explicit constraint

## Result

**Verified actionable findings: 2 Medium / High-confidence.** One map-generation defect reopens a historical risk/deferred readiness item with two independently reproduced manifestations; one export/style race is a new asynchronous variant that contradicts the renderer's stable-style assumption.

## Inventory and direct evidence

Reviewed all 53 tracked src files, including 15 Vitest files; e2e/travelback.spec.ts and all 18 fixtures; 7 scripts; 19 public assets including the generated worker and five styles; package, TypeScript, lint, Next, PostCSS, and Playwright configuration; the Pages workflow; README; and active project/development/plan context. Historical reports were used only for provenance and duplicate suppression.

| Check | Result | Evidence |
| --- | --- | --- |
| npm test | Pass | 15 files, 352/352 tests, exit 0 |
| npm audit --audit-level=high | Pass | Zero vulnerabilities |
| Loaded-track in-app map retry | Fail | Marker count 1 before failure, 0 after recovery; one live canvas remained |
| Journey Creator in-app map retry | Fail | Recovered canvas click left Undo disabled; delayed baseline click enabled Undo |
| System appearance change while exporting | Fail exclusivity invariant | While exporting=true, style changed light→dark; aborting dark.json also produced mapError=true |
| Build/typegen/full E2E | Not rerun here | Cycle 3 plan records the green matrix; this role avoided shared generated-output mutation |
| Deployment | Not run | Explicit user constraint |

The focused browser checks ran against the existing static preview. They produced no repository files and made no external or production change.

## New findings

### VR4-01 — In-app map retry restores a canvas, not the active session

Severity: **Medium**
Confidence: **High**
Status: **Confirmed in loaded-track and Journey Creator journeys**

Source evidence:

- src/components/MapView.tsx:577-671 recreates the map when Retry Map increments mapRetryNonce.
- src/components/MapView.tsx:632-639 restores global grid/track layers only.
- src/components/MapView.tsx:841-903 owns track bounds and HTML-marker setup but does not depend on the retry generation.
- src/components/MapView.tsx:911-1006 owns progress, marker position, and camera but also does not depend on it.
- src/components/JourneyCreator.tsx:284-517 captures and listens to the old map; the effect depends only on isActive and its no-map polling counter.
- e2e/travelback.spec.ts:392-427 tests error presentation and full-page reload, not the in-app retry button's recovered behavior.

Prior status: cycle2-code-reviewer-2026-04-26.md:74-82 identified split map ownership as a Risk, while cycle-c2-aggregate-2026-04-24.md:89-94 deferred readiness work until an active panel without working journey layers could be reproduced. Reproduction B meets that exit criterion, so this item is reopened as Confirmed rather than counted as a novel blocked carryover.

Reproduction A:

1. Load the sample trip and wait for its HTML marker.
2. Intercept positron.json, cycle the style, and wait for map-error.
3. Remove interception and click Retry Map.
4. Wait for the new canvas/style.

Observed: .maplibregl-marker count changed from 1 to 0 while .maplibregl-canvas count was 1. Source inspection also shows the constructor camera [0,20]/zoom 2 is not replaced by fitBounds/current camera during that retry.

Reproduction B:

1. Intercept the initial voyager.json and wait for map-error.
2. Activate Draw a route while the failed map object still exists.
3. Remove interception, click Retry Map, and wait 1.5 seconds after recovery.
4. Click the recovered canvas at a clear center position.

Observed: the Journey Creator Undo button remained disabled, meaning no point was accepted. A control run with the same viewport, wait, and click but no retry enabled Undo and displayed one location.

User impact: Retry Map can look successful while the trip is visually incomplete or route creation is permanently inert until a full reload.

Suggested verification target: expose a map generation/ready signal, hydrate all current state and rebind external consumers on every generation, then add both browser scenarios. Assertions should include route/trail sources, HTML and canvas markers, non-world camera/current progress, retained creator waypoints, and a working post-retry click.

### VR4-02 — A system theme event changes MapLibre style inside the export interval

Severity: **Medium**
Confidence: **High**
Status: **Runtime race confirmed; exact encoded-frame corruption not separately decoded**

Source evidence:

- src/app/page.tsx:265-291 applies a theme-derived map style on media-query changes without an isExporting condition.
- src/components/MapView.tsx:673-697 calls map.setStyle for that state change.
- src/components/MapView.tsx:452-478 and src/lib/useExportController.ts:205-234 update and capture the same map during export.
- src/components/ModalDialog.tsx:44-71 blocks interactive controls but cannot suppress MediaQueryList events.
- e2e/travelback.spec.ts:1577-1604 verifies the theme listener but has no concurrent export assertion.

Prior distinction: tracer-2026-04-27.md:20-30 covered a direct user style-toggle during export. The modal now makes the app root inert, but the system appearance listener bypasses that control. VR4-02 verifies this distinct remaining path.

Runtime verification held a localhost-only stub export in its exporting state, then changed emulated media light→dark. document data-mapstyle became dark while data-travelback-exporting remained true. Repeating with dark.json aborted made map-error visible during that same exporting state. This proves the style effect is not frozen. Source control flow establishes that a real export can receive the event between per-frame map mutation and canvas capture; MapLibre style replacement removes sources/layers asynchronously, so missing route frames or render/idle failure is a direct reachable consequence.

Suggested verification target: defer the style change until isExporting becomes false. A regression should hold a real or deterministic frame renderer open, emulate the appearance change, assert the style URL/layers remain stable for every captured frame, and assert the queued dark preference applies after cleanup.

## Documentation and control verification

The architecture's client-only privacy, generated-worker, parser limits, map-export marker, and cleanup descriptions match current code. Its export statement that visual updates are exclusively driven by renderFrameAndWait is incomplete because the independent system-theme style effect remains active; VR4-02 should be fixed or documented as a prohibited concurrent mutation. README local-only runtime claims remain accurate.

Cycle 3 B01-B04 and W01 remain explicit authorization/legal/evidence/watch items. They were checked for status but not recounted as new findings.

## Final missed-issue sweep

Rechecked the two reproductions against no-failure controls, MapView cleanup and style-load listeners, Journey Creator rebinding, export modal inert behavior, theme explicit-choice gates, current tests, and the active plan. No additional verifier finding met the threshold. Actionable count: **2 Medium** (1 reopened, 1 new variant).
