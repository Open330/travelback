# Critic Review — Review-Plan-Fix Cycle 1/100 (2026-04-24)

**Reviewer:** critic lane
**Scope:** whole current repo plus relevant `.context` docs, with emphasis on product correctness, architecture, edge cases, UX risks, and deployment/static-export assumptions.

## Inventory of Review-Relevant Files

### Runtime product surface
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/styles/vitro-base.css`
- `src/components/*.tsx`
- `src/lib/*.ts`
- `src/types.ts`
- `public/workers/trackParser.worker.js`
- `public/map-styles/*.json`

### Build, test, and export surface
- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `eslint.config.mjs`
- `postcss.config.mjs`
- `playwright.config.ts`
- `playwright.static.config.ts`
- `scripts/harden-static-export.mjs`
- `scripts/serve-static.mjs`
- `scripts/smoke-static.mjs`
- `scripts/fetch-map-styles.mjs`
- `e2e/travelback.spec.ts`
- `e2e/fixtures/*`

### Relevant `.context` docs examined
- `.context/README.md`
- `.context/project/01-overview.md`
- `.context/project/02-architecture.md`
- `.context/development/01-conventions.md`
- `.context/plans/README.md`
- `.context/reports/cycle5-report-2026-04-23.md`
- `.context/reviews/cycle-c2-aggregate-2026-04-24.md`

## Verification Performed

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm run build` — passed
- `npm run smoke:static` — passed
- A full `npm run test:e2e:static:ci` run was started, but I did not wait for completion after confirming the suite launched; it is not used as evidence below.

## Findings

### CRITIC-001 — JourneyCreator’s travel-icon picker is a no-op

- **Status:** Confirmed issue
- **Severity:** Medium
- **Confidence:** High
- **Evidence:** `src/components/JourneyCreator.tsx:41-48`, `src/components/JourneyCreator.tsx:52-60`, `src/components/JourneyCreator.tsx:184-205`, `src/components/JourneyCreator.tsx:539-545`, `src/components/JourneyCreator.tsx:665-692`, `src/types.ts:15-19`
- **Why this is a problem:** The UI offers walk/car/plane/bus/train/bike choices, but the selected icon is only written into GeoJSON feature properties. The map renders those waypoints with a `circle` layer, not a symbol/icon layer, and the created `Track` type has nowhere to persist the chosen mode. The control changes button highlight only; it does not change the preview or any saved/exported state.
- **Concrete failure scenario:** A user recreates a flight and selects the plane icon to distinguish it from a walking route. The authoring preview still shows identical orange circles, and the completed journey/export is indistinguishable from the walking version. That makes the control misleading and undermines trust in the editor.
- **Suggested fix:** Either implement the feature fully by rendering the chosen icon in the authoring map and persisting travel-mode metadata into the created route model, or remove the picker until it has actual behavioral impact.

### CRITIC-002 — Manual-route preview does not handle antimeridian crossings even though the main track renderer does

- **Status:** Confirmed issue
- **Severity:** Medium
- **Confidence:** High
- **Evidence:** `src/components/JourneyCreator.tsx:63-70`, `src/components/JourneyCreator.tsx:149-158`, `src/components/JourneyCreator.tsx:163-181`, `src/components/MapView.tsx:106-166`
- **Why this is a problem:** `JourneyCreator` draws the in-progress line with raw longitudes, while `MapView` already contains wrap-aware geometry logic for imported tracks. That means the manual-creation surface regresses on a geography edge case the playback/export surface already knows how to handle.
- **Concrete failure scenario:** A user creates a trip from `179.8` to `-179.7` near the dateline. Distance math remains sensible, but the live authoring line stretches the long way across the world instead of crossing the dateline cleanly. The preview says one thing while the loaded/final route later behaves differently.
- **Suggested fix:** Reuse the wrapped line-building logic from `MapView` or move that logic into a shared helper in `src/lib/` so JourneyCreator and MapView generate route geometry the same way.

### CRITIC-003 — Export silently does nothing when the map failed to initialize

- **Status:** Confirmed issue
- **Severity:** Medium
- **Confidence:** High
- **Evidence:** `src/components/MapView.tsx:613-639`, `src/components/MapView.tsx:942-952`, `src/app/page.tsx:365-500`, `src/lib/useExportController.ts:87-90`
- **Why this is a problem:** Map initialization/style failures surface a visible error panel, but the rest of the track workflow remains live. If the user loads a track anyway, `TrackWorkspace` and `ExportPanel` still render. Pressing export then returns early because there is no map/canvas handle, with no toast, error state, or disabled CTA.
- **Concrete failure scenario:** WebGL is unavailable or the style JSON fails to load. The user uploads a GPX file, sees the rest of the app chrome, opens Export, presses “Start Export,” and nothing happens. There is no feedback tying the no-op back to the map failure.
- **Suggested fix:** Gate export/playback UI on a healthy map handle, or make `exportTrack()` emit a user-visible error when `mapHandle`/`canvas` is unavailable instead of returning silently.

### CRITIC-004 — Download success reporting is overly optimistic and can claim success without a confirmed saved file

- **Status:** Confirmed issue, with likely browser-dependent user impact
- **Severity:** High
- **Confidence:** Medium-High
- **Evidence:** `src/lib/videoEncoder.ts:171-211`, `src/lib/useExportController.ts:158-170`, `src/components/ExportPanel.tsx:207-214`
- **Why this is a problem:** The fallback download path always returns `{ saved: true, method: 'fallback' }` immediately after synthetic anchor click. `useExportController` then marks the export `done` and shows a success toast, and `ExportPanel` tells the user the video was saved or the download started. That is not a confirmed save; it is just an attempted browser download initiation.
- **Concrete failure scenario:** On a restrictive mobile browser or WebView, `a.click()` does not produce a persisted download after a long async export. The app still says “Your video download has started,” leaving the user with no file and no clear recovery path beyond the preview blob.
- **Suggested fix:** Reserve “saved” only for the File System Access path or another confirmed completion signal. For fallback browsers, treat the result as “ready” unless a save is explicitly confirmed, keep the preview URL available, and present a clear manual download CTA. If a real save dialog is desired, collect the file handle before encoding begins instead of after the async export finishes.

### CRITIC-005 — Production deployment is hard-wired to `/travelback` and one default site origin

- **Status:** Likely risk / hard deployment assumption
- **Severity:** Medium
- **Confidence:** High
- **Evidence:** `next.config.ts:3-10`, `package.json:5-17`, `src/app/layout.tsx:4-6`, `scripts/smoke-static.mjs:18-25`, `scripts/smoke-static.mjs:167-180`
- **Why this is a problem:** The production build, preview server, smoke test, and metadata all assume GitHub Pages-style hosting at `/travelback` and default origin `https://open330.github.io`. That is fine for one deployment target, but it is encoded as a build invariant rather than a deployment configuration.
- **Concrete failure scenario:** The team deploys the exported `out/` directory to a root custom domain or to a different subdirectory. The build still passes locally, but runtime asset URLs, public-file fetches, and metadata URLs resolve under `/travelback/...` and break.
- **Suggested fix:** Make base path and public site URL explicit environment configuration, default them safely for root hosting, and run smoke/static E2E coverage against both root and configured-subpath deployments.

### CRITIC-006 — Google JSON parsing still lives in two independent implementations

- **Status:** Likely risk
- **Severity:** Medium
- **Confidence:** High
- **Evidence:** `src/lib/parser.ts:429-573`, `public/workers/trackParser.worker.js:1-322`
- **Why this is a problem:** The Google Location History parser, depth checks, point limits, and error mapping are duplicated between the main-thread path and the public worker file. That keeps current behavior working, but it creates a maintenance trap where fixes can land in one path and not the other.
- **Concrete failure scenario:** A future parser bugfix is applied only to `src/lib/parser.ts`. Small files or worker-fallback cases start parsing correctly, while normal worker-backed imports still reject or normalize differently. The app then behaves inconsistently based on file size or Worker availability.
- **Suggested fix:** Move the Google parser into a shared module used by both environments, or generate the worker from the same source during build so behavior cannot drift. Add fixture parity tests that exercise both paths.

## Final Sweep Note

- **Examined:** the current app/config/test surface under `src/`, `scripts/`, `public/workers/`, `e2e/`, and top-level config files, plus the relevant `.context` project/development/plan/report/review docs listed above.
- **Skipped:** I did **not** exhaustively reread every archived file under `.context/reviews/` and `.context/plans/archive/`; they were inventoried as historical context, but the review was grounded in the current code/config/test surface.
- **Nothing current was skipped:** no active source files in `src/`, no top-level runtime/build configs, no static-export scripts, no current Playwright spec, and no worker/runtime asset files were skipped.
