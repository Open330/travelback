# Debugger Review - Cycle 4 (2026-04-25)

## Scope

Read-only inspection of the current repo inventory:

- `src/app/*`
- `src/components/*`
- `src/lib/*`
- `public/workers/trackParser.worker.js`
- `scripts/*`
- `e2e/travelback.spec.ts`
- `playwright.config.ts`
- `playwright.static.config.ts`
- `package.json`
- `tsconfig.json`
- `eslint.config.mjs`
- `next.config.ts`
- `postcss.config.mjs`
- relevant `.context/` review and architecture notes that overlap these runtime surfaces

I checked the high-risk paths you named: upload/parsing weird inputs, map lifecycle, animation loops, export abort/resize cleanup, modals/focus/hotkeys, static hardening scripts, E2E setup, and browser compatibility.

## Findings

### 1. Confirmed: journey search results use an undefined background token
- Severity: Low
- Confidence: High
- Status: confirmed
- Evidence: `src/components/JourneyCreator.tsx:680-685`
- Evidence: repo-wide search for `--bg1` only returns those two usages in `JourneyCreator.tsx`; there is no definition in `src/app/globals.css` or `src/styles/vitro-base.css`
- Failure scenario: once coordinate search returns results, the listbox and option rows request `var(--bg1)`. Because that custom property is undefined, the browser drops the declaration and the dropdown can sit directly on top of the map with no stable fill, which hurts readability exactly when the user is trying to confirm a location.
- Suggested fix: replace `var(--bg1)` with an existing token such as `var(--bg)`, `var(--go-bg)`, or `var(--gc-bg)`, or define `--bg1` centrally with light/dark values.

### 2. Confirmed: the Journey Creator icon picker does not affect the rendered route preview
- Severity: Low
- Confidence: High
- Status: confirmed
- Evidence: `src/components/JourneyCreator.tsx:52-59`, `src/components/JourneyCreator.tsx:181-229`, `src/components/JourneyCreator.tsx:695-710`
- Failure scenario: a user selects Plane, Bus, or Train expecting the waypoint markers to change. The map still renders the same orange circle markers because the selected symbol is stored in GeoJSON properties, but the rendered layer is a plain `circle` layer. The only visible effect is the eventual track name prefix.
- Suggested fix: either render the selected symbol in the preview, or relabel the control so it is clearly a route label/name selector rather than a visual icon picker.

### 3. Likely: flat Google JSON arrays are only recognized if one of the first 100 entries looks like a location record
- Severity: Medium
- Confidence: High
- Status: likely
- Evidence: `src/lib/parser.ts:479-483`
- Failure scenario: a weird-but-valid Google Takeout flat array with real location records after index 99 is rejected as `Unsupported Google Location History format`, even though `parseRecords()` would have accepted the later entries.
- Suggested fix: replace the fixed 100-item sample with a bounded shape check that can still discover a valid record later in the array, or validate the array shape without relying on the first 100 elements alone.

### 4. Likely: Journey Creator gives up on map hookup after about 3 seconds
- Severity: Low
- Confidence: High
- Status: likely
- Evidence: `src/components/JourneyCreator.tsx:243-250`
- Failure scenario: on a slow device or a cold browser start, the Journey Creator can become active before `mapRef.current?.getMap()` exists. The effect retries only 30 times at 100 ms, then stops. After that, the panel stays inert until the user toggles the mode off and on again.
- Suggested fix: keep retrying while the panel is active, or bind the panel to a real map-ready signal instead of a fixed retry budget.

### 5. Manual-validation risk: the E2E gate is still coupled to a fixed dev port and sleep-heavy waits
- Severity: Low
- Confidence: High
- Status: manual-validation risk
- Evidence: `playwright.config.ts:3-44`
- Evidence: `e2e/travelback.spec.ts:136-147`, `e2e/travelback.spec.ts:500-507`, `e2e/travelback.spec.ts:817-845`, `e2e/travelback.spec.ts:1268-1310`
- Failure scenario: `npm run test:e2e` can fail outright if port `3099` is already in use, and the suite still relies on repeated fixed sleeps that make timing-sensitive regressions flaky or hard to reproduce. The current full-journey tests also stop at export-panel readiness instead of proving the final MP4 save/share path.
- Suggested fix: use a dynamic port or server reuse strategy for dev E2E, replace fixed sleeps with event-driven waits, and add one deterministic export-end-to-end check in the static harness.

## Final missed-bug sweep

I re-checked the main runtime risk areas one more time:

- upload/parsing weird inputs
- map lifecycle and style reloads
- playback animation loops
- export abort/resize cleanup
- modal focus, hotkeys, and nested dialogs
- static export hardening and server behavior
- browser compatibility paths for download/share/export
- E2E setup and validation gaps

No additional confirmed runtime defect surfaced beyond the four findings above.

## Skipped-file Confirmation

I did not intentionally skip any file in the inspected runtime surface. The review covered the source, test, script, worker, and config inventory listed above, plus the current review/context notes that overlapped those paths.
