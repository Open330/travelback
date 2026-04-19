# Code Review Summary

**Scope:** Whole-repo current-state review after inventorying 77 tracked project files across app shell, parser/worker, map/render/export, UI workflows, static-serving scripts, and e2e coverage.

**Checks run:**
- `git status --short`
- `rg --files` inventory
- `eslint` ✅
- TypeScript/LSP diagnostics ✅ (`npx tsc --noEmit`, 0 errors)
- `npm run smoke:static` ✅
- `npm run build` could not be re-run because a pre-existing hung `next build` process was already holding the Next build lock (`node .../next build`, PID 16644)
- `ast-grep` requested by workflow was unavailable locally, so pattern scanning fell back to `rg`

## Highest-signal issues

### 1) [HIGH] Google phone exports collapse segment boundaries into one continuous route
- **Confidence:** High
- **Status:** Open
- **Files / regions:** `src/lib/parser.ts:267-303`, `public/workers/trackParser.worker.js:99-123`
- **Issue:** The `semanticSegments` parser appends points but never records `segmentStartIndices`, unlike the `timelineObjects` path. That means supported Google phone exports lose their real segment breaks.
- **Concrete failure scenario:** Import a phone-export Timeline JSON containing multiple disconnected segments (for example, walk → flight → visit). Travelback will render fake straight lines between unrelated segments, and timeline/elevation/distance calculations will include impossible gap-spanning travel.
- **Suggested fix:** Thread `segStarts` through `parseSemanticSegments` in both the main-thread parser and the worker, and push a new segment start whenever a segment contributes points after prior data. Add a regression fixture with at least two disconnected `semanticSegments` entries and assert that no bridging distance/line is produced.

### 2) [HIGH] Antimeridian routes interpolate and render through the wrong side of the world
- **Confidence:** High
- **Status:** Open
- **Files / regions:** `src/lib/interpolate.ts:112-118`, `src/components/MapView.tsx:132-152`
- **Issue:** Route interpolation and GeoJSON line generation use raw longitude deltas. For points near `+180/-180`, the code linearly interpolates across ~360° instead of taking the wrapped shortest path.
- **Concrete failure scenario:** A route from `179.8°E` to `-179.8°W` will place mid-playback positions near Greenwich and draw a trail that crosses most of the map, so playback, camera follow, and exported video are visibly wrong for trans-Pacific / dateline-crossing trips.
- **Suggested fix:** Apply the same shifted-longitude strategy already used elsewhere (`camera.ts`, fit-bounds logic) when interpolating points and when building rendered line segments, then add an antimeridian fixture plus playback/export assertions.

### 3) [MEDIUM] Document language never follows the selected locale
- **Confidence:** High
- **Status:** Open
- **Files / regions:** `src/app/layout.tsx:52`, `src/app/page.tsx:33`, `src/lib/i18n.ts:8`
- **Issue:** The app supports `en`, `ko`, `ja`, `zh`, and `es`, but the document root is always rendered as `<html lang="en">` and nothing updates it when the locale changes.
- **Concrete failure scenario:** Switch the UI to Korean or Japanese: screen readers still use English pronunciation rules, browser translation heuristics stay wrong, and language metadata remains inconsistent with the rendered interface.
- **Suggested fix:** Update `document.documentElement.lang` whenever locale changes (or move locale ownership high enough to render `<html lang>` correctly). Add an e2e assertion that locale switching updates `document.documentElement.lang`.

## Recommendation

**REQUEST CHANGES** — there are two correctness bugs in supported travel-data flows (Google phone exports and antimeridian routes) that should be fixed before considering the repo fully healthy.
