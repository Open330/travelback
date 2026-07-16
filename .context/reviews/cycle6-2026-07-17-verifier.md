# Cycle 6 Verifier — 2026-07-17

Reviewed revision `1d2755c`. Verdict: **PARTIAL** — all available gates pass, but three current product behaviors remain actionable.

## Verification matrix

| Check | Result |
| --- | --- |
| `npm audit --audit-level=high --json` | Pass: 0 vulnerabilities / 579 dependencies |
| `npm test -- --reporter=verbose` | Pass: 15 files, 366 tests; one React `act(...)` warning |
| `npm run lint` | Pass |
| Isolated `npm run build` | Pass: compile, TypeScript, 4 static pages, CSP hardening across 3 HTML files |
| Isolated `npm run smoke:static` | Pass |
| Isolated current static Chromium E2E | Pass: 94; expected skip: 1; failures/retries: 0 |

The dev E2E lane could not start a second same-worktree server because the existing `.next/dev/lock` belonged to live PID 80360 on port 3106. I did not stop or alter that process. The replacement isolated static workspace therefore supplied the current-HEAD browser evidence without touching port 3114.

## Findings

### VR6-01 — Retry Map loses route context when camera tracking is off

- Severity: Medium
- Confidence: High
- Classification: Confirmed by deterministic current-code path; browser regression absent
- File/region: `src/components/MapView.tsx:435,843-885,903-914,1055-1083,1195-1203`; `e2e/travelback.spec.ts:594-704`
- Failure scenario: load a route, disable camera tracking, pan to a useful overview, make the next style fail, then choose Retry Map. The replacement map starts at `[0,20]`, zoom 2. `fitTrackOnReadyRef` was consumed on the first hydration, and the unchanged track does not re-arm it, so the route/marker can be offscreen even though recovery reports success.
- Fix: capture and restore the outgoing manual camera before incrementing `mapRetryNonce`; if no valid camera exists, re-arm a one-generation route fit. Add a retry E2E with camera tracking disabled and assert camera/route visibility.

### VR6-02 — Timeline and elevation bands overlap, stealing Reset pointer ownership

- Severity: Medium
- Confidence: High
- Classification: Confirmed in current static Chromium
- File/region: `src/components/TrackWorkspace.tsx:142-159`; `src/components/TimelineSelector.tsx:683-700`; `src/components/ElevationProfile.tsx:91-105`; `e2e/travelback.spec.ts:1157-1260`
- Failure scenario: trim a route with elevation and click Reset. At 1440×1000 Reset renders 10×10 at `(844.34,843)` while the elevation slider spans `(16,821.69,1408,40)`; its center hit resolves to the SVG path. At 390×844 Reset is 10×45.77 and its center is still owned by elevation. The click seeks playback instead of resetting the range.
- Fix: put timeline, elevation, and playback controls in one non-overlapping bottom stack, give Reset at least a 24×24 target (prefer the project 44px target), and assert non-intersection plus center-point ownership at both viewports.

### VR6-03 — Scene adjustment warnings leak English into every non-English locale

- Severity: Low
- Confidence: High
- Classification: Confirmed static/reachable UI path
- File/region: `src/components/SceneEditor.tsx:346-385,501-554,626-631`; `src/lib/i18n.ts:93-97,455-459,817-821,1179-1183,1541-1545`
- Failure scenario: in Korean, Japanese, Chinese, or Spanish, make a scene range overlap so normalization adjusts a boundary. The visible warning and live status contain hardcoded `start:` or `end:` amid localized UI.
- Fix: add localized adjustment templates/labels for both boundaries and render the whole warning through `t(...)`; cover one non-English normalization path.

## Dedupe, sweep, and skipped accounting

B01-B04 and D01-D04 remain existing blocked/evidence-gated carryovers and were not counted again. The stale superseded-style error hypothesis was rejected because MapLibre abort-suppresses the shipped request path and local styles have no asynchronous sources/sprites/glyphs. A final sweep covered all executable source/config/script/test files. Generated/static assets and archived context were handled as described in the security report, not silently skipped.
