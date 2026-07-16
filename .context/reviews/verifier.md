# Verifier — Evidence Report (2026-07-16)

## Gate matrix

| Check | Result | Evidence |
| --- | --- | --- |
| npm run lint | Pass | Exit 0 |
| npm run typecheck | Pass | Exit 0 |
| npm test | Pass | 6 files, 219/219 tests |
| npm run build | Pass | Next 16.2.3 static export completed; postbuild hardened 3 HTML files |
| npm audit --audit-level=low | Fail | 6 vulnerabilities: 3 High, 2 Moderate, 1 Low |
| npm run smoke:static | Fail | Worker MAX_TRACK_POINTS parity assertion fails |
| Static Playwright run past smoke | Fail in observed cases | Five deterministic failures were captured by test 38, including four desktop-toolbar/locale failures and one timeline-trim count failure |
| Deployment | Not run | Explicit no-deployment constraint |

## Independent verifications

### VR-01 — Smoke failure is a stale verifier, not a mismatched constant

Severity: High | Confidence: High | Status: Reproduced

Evidence: src/lib/parse-utils.ts:7 defines MAX_TRACK_POINTS as 250,000; public/workers/trackParser.worker.js:276 defines 250000. scripts/smoke-static.mjs:223-236 searches src/lib/parser.ts, where the constant is now only imported at line 4. The same smoke function checks parser.ts for parseSemanticPoint at lines 254-258, although that function moved to src/lib/googleJsonParser.ts:138-158. A clean build followed by npm run smoke:static reproduces the failure.

Verdict: release gate failure; repair parity-test source ownership or generate the worker from shared code.

### VR-02 — The trail cannot move continuously under the current guard

Severity: High | Confidence: High | Status: Proven by control flow

Evidence: interpolateAlongTrack returns one segmentIndex for the entire interval between adjacent points. MapView.tsx:570-578 and 1072-1080 call trailSource.setData only when that integer changes, although point changes every frame. Therefore the active endpoint is stale by construction.

Verdict: confirmed playback and export rendering defect.

### VR-03 — Identical-camera export frames are not synchronized

Severity: High | Confidence: High | Status: Proven by ordering

Evidence: MapView.tsx:563-578 schedules marker/trail source updates; lines 581-603 then resolve immediately for an unchanged camera. The render listener is not installed until lines 612-648. videoEncoder.ts:158-164 can subsequently capture without any guaranteed paint of those source changes.

Verdict: confirmed stale-frame race; add source-aware render synchronization.

### VR-04 — Desktop settings disappear after route load

Severity: Medium | Confidence: High | Status: Reproduced

Evidence: GlobalToolbar.tsx:25 sets hidden when hasTrack. TrackToolbar.tsx:162 places the only replacement menu under sm:hidden, and language/units/theme are nested at lines 227-278. Static Playwright retried and failed e2e/travelback.spec.ts:274, 290, 537, and 567 because the loaded desktop toolbar/settings were hidden.

Verdict: confirmed responsive-layout regression, not test flakiness.

### VR-05 — 4K feasibility contradicts the preset catalog

Severity: Medium | Confidence: High | Status: Arithmetic verification

Evidence: videoEncoder.ts:59-65 estimates a 4K raw-frame term of 3840 × 2160 × 4 × 8 × 1.5 = 398,131,200 bytes, about 379.7 MiB. The limit at line 7 is 256 MiB. Duration, bitrate, and bookkeeping only increase the total.

Verdict: both 4K presets at types.ts:102-103 are unreachable for every valid configuration.

### VR-06 — Singleton segment handling is inconsistent

Severity: Medium | Confidence: High | Status: Proven by fixture shape

Evidence: googleJsonParser.ts:173-190 emits a one-point visit segment. MapView.tsx:242-244 pushes completed segment coordinates unchanged, while buildTrackGeometry explicitly duplicates singletons at MapView.tsx:153-155. The trail path therefore produces one-coordinate line members that the route path avoids.

Verdict: confirmed invalid/missing trail risk for semantic visits.

### VR-07 — Passing unit checks do not cover the failing release paths

Severity: Medium | Confidence: High | Status: Confirmed

Evidence: all 219 unit tests pass, yet smoke, dependency audit, and multiple static browser cases fail. The workflow at .github/workflows/deploy-pages.yml:28-32 does not invoke npm test, so even the passing suite is absent from CI.

Verdict: current green local unit status is insufficient for release readiness.

## Release verdict

Not ready. The project has three High correctness/release blockers, a failing security gate, and reproduced desktop E2E regressions. No deployment was attempted.
