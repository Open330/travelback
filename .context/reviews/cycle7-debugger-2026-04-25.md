# Cycle 7 Debugger Review — 2026-04-25

## Scope

Live runtime surface, browser-facing helpers, test harness, static serving, and project docs were reviewed. The pass covered `src/app/*`, `src/components/*`, `src/lib/*`, `public/workers/trackParser.worker.js`, `scripts/*`, `e2e/travelback.spec.ts`, `package.json`, `playwright*.ts`, `.context/project/*`, and `.context/development/*`.

Verification baseline during review:
- `npm run lint` passed
- `npm run typecheck` passed
- `npm run build` passed

## Findings

### 1. High — Google JSON imports still materialize the full payload before the point cap is enforced

Symptoms:
- A dense but valid Google Takeout JSON export can spike memory or stall the tab before the app reaches the `TOO_MANY_POINTS` rejection.
- The worker path still decodes and parses the entire buffer before the cap is checked.

Root cause:
- `parseGoogleLocationHistory()` performs `JSON.parse(text)` and only enforces the point budget after the full segment flatten/dedupe pass.
- The worker path in `public/workers/trackParser.worker.js` decodes the entire `ArrayBuffer` to text and then calls the same parser.

Reproduction:
- Upload a large Google Location History export that is under the 100 MB transport limit but close to the point ceiling, especially one with large `timelineObjects` / `semanticSegments` payloads.
- The browser or worker can allocate the whole object graph before the cap is reached, so the failure arrives too late to protect responsiveness.

Fix:
- Enforce the point budget during extraction instead of after full `JSON.parse`, or switch the large-JSON path to a streaming/chunked parser.
- If the current worker architecture is retained, reject before decoding/parsing the whole payload when the point budget is already known to be exceeded.

Confidence: high

References:
- `src/lib/parser.ts:476`
- `src/lib/parser.ts:480`
- `src/lib/parser.ts:523`
- `src/lib/parser.ts:541`
- `src/lib/parser.ts:545`
- `public/workers/trackParser.worker.js:316`
- `public/workers/trackParser.worker.js:319`
- `public/workers/trackParser.worker.js:322`

### 2. High — GPX/KML still parse on the main thread and can freeze the UI

Symptoms:
- A crafted or simply dense XML import can monopolize the main thread, making the tab unresponsive before the user can recover.
- The XML size cap reduces exposure but does not eliminate the freeze risk.

Root cause:
- GPX and KML still go through `FileReader.readAsText()`, `DOMParser`, and `@tmcw/togeojson` on the UI thread.
- XML parsing is only bounded by a 4 MB file-size check, which is a size guard, not a guarantee of cheap parse time.

Reproduction:
- Upload a large GPX or KML file near the current XML limit, or a maliciously nested / densely encoded XML file that stays under the size cap.
- The app can spend enough time in `parseXml()`, `parseGPX()`, or `parseKML()` to look hung, and cancellation does not help once parsing is on the main thread.

Fix:
- Move XML parsing behind a worker, or lower the XML cap to a size that is known to be safe for synchronous browser parsing.
- If workerizing XML is not in scope, surface a stricter product limit and make the parser reject earlier.

Confidence: high

References:
- `src/lib/parser.ts:158`
- `src/lib/parser.ts:166`
- `src/lib/parser.ts:206`
- `src/lib/parser.ts:669`
- `src/lib/parser.ts:675`
- `src/lib/parser.ts:678`
- `src/components/FileUpload.tsx:56`
- `src/components/FileUpload.tsx:59`

### 3. Medium-High — runtime-critical public assets are cached for an hour

Symptoms:
- After a deploy, browsers can keep an old worker script or old map-style JSON for up to an hour.
- That can strand users on stale parser behavior or stale map definitions even though the HTML bundle has already changed.

Root cause:
- `scripts/serve-static.mjs` returns `public, max-age=3600` for every non-HTML asset outside `_next/static/`.
- That policy covers the worker script and the bundled map-style JSON files in `public/`.

Reproduction:
- Deploy a new build with a worker or map-style change.
- Revisit the app in the same browser session within an hour.
- The browser may reuse the cached worker/style asset and run behavior that no longer matches the current HTML and client bundle.

Fix:
- Fingerprint these runtime-critical public assets so they can be cached immutably, or move them to `no-cache` / `must-revalidate`.
- Keep immutable caching only for hashed assets under `_next/static/`.

Confidence: medium-high

References:
- `scripts/serve-static.mjs:62`
- `scripts/serve-static.mjs:65`
- `scripts/serve-static.mjs:66`
- `scripts/serve-static.mjs:146`
- `scripts/serve-static.mjs:150`

## Missed-Issue Sweep

Final sweep did not surface additional high-confidence runtime crashes in playback, export, or scene editing beyond the items above.

Residual risk that remains outside this report:
- The real export / cancellation path is still mostly covered by stubbed E2E flows.
- Parser negative-path coverage remains thin for malformed Google JSON and worker fallback edges.
- Long-track rendering and playback performance are still architectural backlog items rather than fresh correctness failures.
