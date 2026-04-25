# Cycle 1 Tracer Review — causal flow substitute

Repository: `/Users/hletrd/flash-shared/Travelback`  
Lane: deep review / causal tracer substitute  
Date: 2026-04-26 (Asia/Seoul)

## Scope and method

I traced the requested path end-to-end instead of sampling: upload -> parse -> track/session state -> map layers -> playback -> scenes -> export -> static build/test. I reviewed the tracked non-generated source, public runtime assets, fixtures, e2e coverage, build scripts, and deploy/static configuration that participate in those flows.

Generated/vendor/external directories were excluded from review: `node_modules/`, `.next/`, `out/`, `.git/`, Playwright reports/results, coverage/dist/build artifacts. Existing `.context/reviews/*` files are prior review outputs, not app runtime inputs; they were not used as product evidence. The untracked `.tmp-travelback-mina-manual.mjs` was inspected as a scratch/manual harness and excluded from product-flow findings.

## Relevant file inventory examined (not sampled)

- App shell/session/state: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/styles/vitro-base.css`, `src/types.ts`.
- Upload/parse/input: `src/components/FileUpload.tsx`, `src/components/GoogleGuide.tsx`, `src/lib/parser.ts`, `public/workers/trackParser.worker.js`, `public/sample-trip.gpx`.
- Manual journey creation: `src/components/JourneyCreator.tsx`.
- Track/map/playback UI: `src/components/TrackWorkspace.tsx`, `src/components/TrackToolbar.tsx`, `src/components/TimelineSelector.tsx`, `src/components/Controls.tsx`, `src/components/ElevationProfile.tsx`, `src/components/MapView.tsx`, `src/components/GlobalToolbar.tsx`, `src/components/ThemeToggle.tsx`, `src/components/Toast.tsx`, `src/components/ErrorBoundary.tsx`, `src/components/KeyboardHelp.tsx`, `src/components/ModalDialog.tsx`.
- Playback/scenes/export internals: `src/lib/interpolate.ts`, `src/lib/usePlaybackController.ts`, `src/lib/camera.ts`, `src/components/SceneEditor.tsx`, `src/components/ExportPanel.tsx`, `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`, `src/lib/env.ts`, `src/lib/i18n.ts`.
- Static/runtime assets: `public/map-styles/{bright,dark,liberty,positron,voyager}.json`, `public/fonts/pretendard.css`, `public/fonts/PretendardVariable.woff2`, `public/favicon.svg`, `public/icon.svg`, `public/landing-preview.svg`, `public/guide/google-maps-phone-export.svg`, `public/guide/google-takeout-export.svg`, `public/{file,globe,next,vercel,window}.svg`, `src/app/favicon.ico`.
- Build/static/test/deploy: `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `playwright.config.ts`, `playwright.static.config.ts`, `.github/workflows/deploy-pages.yml`, `scripts/fetch-map-styles.mjs`, `scripts/harden-static-export.mjs`, `scripts/run-dev-e2e.mjs`, `scripts/run-static-e2e.mjs`, `scripts/serve-static.mjs`, `scripts/smoke-static.mjs`, `README.md`.
- E2E specs and fixtures: `e2e/travelback.spec.ts`, `e2e/fixtures/antimeridian.gpx`, `google-mixed-duplicate-branches.json`, `google-records.json`, `google-revisit-segments.json`, `google-semantic-location.json`, `google-semantic-segments.json`, `google-timeline-edits.json`, `invalid-elevation.gpx`, `korea-japan.gpx`, `korea-japan.json`, `korea-japan.kml`, `multiline-entity.gpx`, `point-placemarks.kml`, `sample.gpx`, `segmented-city-hop.gpx`, `single-quote-attrs.gpx`, `tiny-trim.gpx`.

## Causal trace summary

- Upload enters through `FileUpload.handleFile` (`src/components/FileUpload.tsx:52-60`) or sample loading (`src/app/page.tsx:325-339`), both feeding `parseTrackFile`.
- JSON import is routed through the worker path (`src/lib/parser.ts:557-640`) and then finalized (`src/lib/parser.ts:660-674`) before `loadTrackIntoSession` installs `fullTrack`, `track`, clears stale export/scene state, and resets playback (`src/app/page.tsx:266-276`, `317-319`).
- Trimming flows through `handleRangeChange` (`src/app/page.tsx:288-315`), segment-aware distance arrays (`src/lib/interpolate.ts:18-41`), `TimelineSelector`, and `MapView` geometry normalization.
- Map layers are rebuilt on style load/change and track change in `MapView`, while playback and camera state flow from `usePlaybackController` -> `MapView` animation/camera effects -> `camera.ts` scene interpolation.
- Scene edits normalize through `SceneEditor` and `camera.normalizeScenes`, then export uses those scenes or generated defaults in `useExportController` and `videoEncoder`.
- Static export depends on `next.config.ts` base path, `scripts/harden-static-export.mjs` CSP hashing, `scripts/serve-static.mjs`, `scripts/smoke-static.mjs`, and the Playwright static config.

## Findings

### F-01 — Google semantic-segment `timelinePath` silently drops URI variants, blocking the downstream journey

- **Severity:** Medium
- **Confidence:** High for the parser behavior; medium for real-world frequency of affected exports.
- **Validation status:** Confirmed parser behavior; real-world export incidence needs manual validation against current Google exports.
- **Exact locations:**
  - `src/lib/parser.ts:344-352` — main-thread parser uses `match(/geo:([-\d.]+),([-\d.]+)/)` for `semanticSegments[].timelinePath[].point`.
  - `public/workers/trackParser.worker.js:118-127` — worker parser duplicates the same lower-case/no-whitespace match.
  - `src/lib/parser.ts:660-674` — `finalizeTrack` converts the resulting zero-point track into `TOO_FEW_POINTS`.
  - `e2e/travelback.spec.ts:1432-1436` and `e2e/fixtures/google-semantic-segments.json` — current regression coverage only exercises lower-case `geo:` with no space after the comma.
- **Causal chain:** User uploads a Google JSON export -> `FileUpload` calls `parseTrackFile` -> JSON is sent to `public/workers/trackParser.worker.js` in normal browsers -> `parseSemanticSegments` skips any `timelinePath` point whose `point` string is not exactly lower-case `geo:<lat>,<lng>` with no interior whitespace -> all affected path points are omitted -> `parseTrackFile.finalizeTrack` rejects the import as too few points, or a mixed file imports with gaps/missing path segments -> no usable track reaches map layers, playback, scene editing, or export.
- **Concrete failure scenario:** A semantic-segment export contains points such as `"GEO:37.5665,126.9780"`, `"geo:+37.5665,126.9780"`, or `"geo:37.5665, 126.9780"`. The URI scheme is case-insensitive, signed decimal coordinates are common in coordinate parsers, and the app already allows whitespace in the related visit `latLng` parser. These points are silently skipped. A file composed only of that timelinePath shape fails with the visible upload error for too few locations; a file with visits plus skipped paths loads as a misleading sparse visit-only route.
- **Evidence:** A direct VM evaluation of the checked-in worker parser produced:

  ```text
  no-space 2
  space-after-comma 0
  uppercase 0
  ```

  This confirms the same worker path used by normal JSON uploads accepts only the exact fixture shape.
- **Suggested fix:** Replace the duplicated ad-hoc regex with a shared/kept-in-sync helper that accepts URI-scheme case, optional leading `+`/`-`, decimal formats, and harmless whitespace, for example an anchored case-insensitive pattern like `^\s*geo:\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)` before the existing bounds checks. Apply the same logic to `src/lib/parser.ts` and `public/workers/trackParser.worker.js` or generate one from the other. Add e2e or parser regression fixtures covering upper-case `GEO:`, `+` coordinates, and whitespace after the comma so parser/worker drift is caught.

## Missed-issue sweep / hypotheses checked

- Upload and sample load both converge on `parseTrackFile`; file-size and unsupported-format errors are mapped without leaking stale session state.
- GPX/KML parsing paths are size-limited, sanitize XML entities before DOM parse, and have e2e coverage for single-quoted XML attributes, multiline entity declarations, point placemarks, and malformed elevation.
- Track session replacement clears prior export artifacts, scene state, and playback state; e2e coverage includes starting a new route and track edits clearing completed export results.
- Timeline trimming preserves a full-track distance scale, avoids one-point tracks, clears scenes when trimming away from the full track, and has e2e coverage for no-op clicks preserving export results.
- Segment-aware distance calculation and MapView geometry avoid connecting Google segment gaps; e2e coverage includes segmented tracks not counting gaps and antimeridian scene framing.
- Map style changes rebuild route/trail/current-position layers after style load; static map-style assets are locally bundled and covered by style-cycling tests.
- Playback and scene camera interpolation are bounded through `camera.ts`; export generates default scenes when none exist, clamps duration through `videoEncoder`, waits for map idle, and restores playback after export/cancel.
- Static build hardening is currently functional for this Next output: CSP hashing ran and `smoke:static` passed. The hardening regex remains worth keeping under smoke coverage on Next upgrades, but I did not find a current break in the generated output.

## Verification performed

```text
npm run lint && npm run typecheck && npm run build && npm run smoke:static
```

Result: passed. `next build` completed, `scripts/harden-static-export.mjs` hardened CSP across 3 HTML files, and `scripts/smoke-static.mjs` reported OK.

Additional targeted parser proof:

```text
no-space 2
space-after-comma 0
uppercase 0
```

## Skipped-file confirmation

Skipped only generated/vendor/report artifacts and prior review outputs: `node_modules/`, `.next/`, `out/`, `.git/`, `coverage/`, `dist/`, `build/`, `playwright-report/`, `test-results/`, and `.context/reviews/*` other than this newly written report. No tracked source, public runtime asset, fixture, build script, test config, or e2e spec relevant to the requested flow was skipped.
