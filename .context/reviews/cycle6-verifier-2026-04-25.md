# Cycle 6 Verifier Review - 2026-04-25

## Verdict
PARTIAL

The repository is buildable and the static export path is healthy, but there are still open availability/performance issues in the import and high-frequency interaction paths.

## Evidence
- Inventory sweep: `rg --files .` covered the tracked repo surface, then I reviewed the app shell, every `src/app`, `src/components`, `src/lib`, `scripts`, `e2e`, and relevant `public` trust-boundary file.
- `npm run -s lint` - passed.
- `npm run -s typecheck` - passed.
- `npm run -s build` - completed and emitted `out/` with the exported app, static assets, map styles, and worker bundle.
- `npm run -s smoke:static` - passed with `[smoke-static] OK`.

## Confirmed Issues
1. [src/lib/parser.ts](/Users/hletrd/flash-shared/Travelback/src/lib/parser.ts#L160) and [src/components/FileUpload.tsx](/Users/hletrd/flash-shared/Travelback/src/components/FileUpload.tsx#L52) still parse GPX/KML XML on the main thread. Severity: MEDIUM. Confidence: HIGH. Failure scenario: a crafted or simply large XML track can freeze the tab during `FileReader.readAsText()` plus `DOMParser` traversal before the user gets a chance to recover. Suggested fix: move XML imports behind the worker boundary too, or lower the XML limit to something safely parseable on the UI thread.
2. [src/lib/parser.ts](/Users/hletrd/flash-shared/Travelback/src/lib/parser.ts#L318) and [public/workers/trackParser.worker.js](/Users/hletrd/flash-shared/Travelback/public/workers/trackParser.worker.js#L289) still decode and parse the full Google JSON payload before the 250k-point cap is enforced. Severity: MEDIUM. Confidence: MEDIUM-HIGH. Failure scenario: a dense but valid export under the 100 MB transport limit can exhaust worker/browser memory during `TextDecoder` plus `JSON.parse` and only get rejected after the object graph is already materialized. Suggested fix: enforce a running point budget during extraction or switch the large-file path to a streaming/bounded parser.

## Likely Issues
3. [src/components/TimelineSelector.tsx](/Users/hletrd/flash-shared/Travelback/src/components/TimelineSelector.tsx#L201) and [src/app/page.tsx](/Users/hletrd/flash-shared/Travelback/src/app/page.tsx#L286) still do full filtered-track commits during pointer movement. Severity: HIGH. Confidence: HIGH. Failure scenario: dragging the trim handles on a long track repeatedly slices `fullTrack.points`, rebuilds segment indices, resets playback, and then forces `MapView` to rebuild the visible geometry. On large tracks this is an O(n) per-frame loop that will hitch or lock the UI. Suggested fix: separate live drag preview from committed trim bounds and only mutate the track on pointer-up or via a debounce window.
4. [src/app/page.tsx](/Users/hletrd/flash-shared/Travelback/src/app/page.tsx#L129), [src/components/TrackWorkspace.tsx](/Users/hletrd/flash-shared/Travelback/src/components/TrackWorkspace.tsx#L122), and [src/lib/usePlaybackController.ts](/Users/hletrd/flash-shared/Travelback/src/lib/usePlaybackController.ts#L17) keep playback progress in the page shell, so every animation tick rerenders the whole workspace tree. Severity: MEDIUM. Confidence: HIGH. Failure scenario: normal playback and export progress updates fan out to the toolbar, controls, timeline, scene editor props, and map plumbing on every frame, compounding the trail geometry work in `MapView` and making long-track playback/export noticeably more expensive than it needs to be. Suggested fix: move the high-frequency progress signal into a narrower store/context and keep render work localized to the map overlay and controls that actually need it.

## Risks
- No unit/integration harness protects the highest-risk deterministic logic yet. Current coverage is mostly Playwright and static smoke, so parser, camera, interpolation, playback, and export regressions can still ship if they are not surfaced through browser-level behavior.
- The Playwright suite still relies on fixed waits and some broad text assertions, which makes it more fragile than the app code itself. I did not run the full dev/static E2E suites in this pass; the static smoke gate and build were enough to verify emitted output, but not enough to eliminate test flake risk.
- Static hardening works on the current build path, but it still depends on `postbuild` mutation. An alternate deploy path that skips the hardening script could publish the placeholder CSP instead of the hashed static policy.

## Gaps
- I did not execute `npm run test:e2e` or `npm run test:e2e:static:ci` in this pass.
- The review did not find any critical auth, XSS, or secret-handling defects in the current repo snapshot.
