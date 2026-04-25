# Cycle 1 verifier review

## Scope reviewed
Inspected the repo areas that govern the claims in README/.context docs, package scripts, static export, parser, playback, export, and end-to-end coverage:
- `README.md`
- `.context/README.md`
- `.context/project/01-overview.md`
- `.context/project/02-architecture.md`
- `.context/development/01-conventions.md`
- `package.json`
- `next.config.ts`
- `playwright.config.ts`
- `playwright.static.config.ts`
- `scripts/*.mjs`
- `src/app/layout.tsx`, `src/app/page.tsx`
- `src/lib/{camera,interpolate,parser,usePlaybackController,useExportController,videoEncoder}.ts`
- `src/components/{FileUpload,JourneyCreator,ExportPanel,TrackToolbar,MapView,SceneEditor}.tsx`
- `public/workers/trackParser.worker.js`
- `e2e/travelback.spec.ts`
- `.github/workflows/deploy-pages.yml`

### Commands/evidence reviewed
- `npm run typecheck` — passed
- `npm run lint` — passed
- `npm run build` — passed; postbuild hardened 3 HTML files
- `npm run smoke:static` — passed
- `npm run test:e2e:static:ci` — started; Playwright reported `Running 74 tests using 1 worker`
- `grep -c "^  test(" e2e/travelback.spec.ts` — `74`

### Skipped directories
Excluded generated/vendor/runtime artifacts from review: `node_modules/`, `.git/`, `.next/`, `coverage/`, `playwright-report/`, `out/`, and other build outputs. No source under those dirs was used as review evidence.

## Findings

### 1) README understates the number and shape of scene presets
- **File/region:** `README.md:52`
- **Severity:** low
- **Confidence:** high
- **Status:** confirmed
- **Failure scenario:** A contributor or reviewer relying on the README will expect the preset buttons to auto-generate only 4–6 scenes, but the current presets are `1` scene for `Simple`, `1` for `Bird's Eye`, `6` for `Cinematic`, and `8` for `Dynamic`. That makes the documented behavior materially wrong for scene-editor expectations and for any future tests or UX copy derived from the README.
- **Evidence:**
  - `src/lib/camera.ts:261-332` — `generateSimpleFlyover()` returns 1 scene, `generateBirdeyeFlyover()` returns 1 scene, `generateDynamicScenes()` returns 8 scenes, and `generateDefaultScenes()` returns 6 scenes.
  - `src/components/SceneEditor.tsx:395-405` — the preset buttons call those exact generators.
- **Suggested fix:** Rewrite the feature bullet to list the actual preset lengths or remove the count entirely. If you want a succinct description, use something like “one-click preset compositions for cinematic, simple, dynamic, and bird’s-eye sequences.”

### 2) README understates the E2E suite size
- **File/region:** `README.md:145`
- **Severity:** low
- **Confidence:** high
- **Status:** confirmed
- **Failure scenario:** A maintainer using the README as the source of truth will think the repo has 39 Playwright tests, but the current suite has 74. That makes coverage expectations and review budgets wrong, and it hides the current breadth of the static/browser behavior checks.
- **Evidence:**
  - `grep -c "^  test(" e2e/travelback.spec.ts` → `74`
  - `npm run test:e2e:static:ci` output began with `Running 74 tests using 1 worker`
- **Suggested fix:** Update the README comment to the current count, or better, remove the hardcoded number and describe it generically as the Playwright E2E suite so the docs do not drift again.

## Final sweep
- Build, lint, typecheck, and static smoke verification all passed.
- I did not find any confirmed code defects in the inspected parser/export/playback/static-export paths; the issues above are documentation accuracy problems.
- Static E2E execution was observed to begin correctly at 74 tests; I did not rely on it as pass evidence because the review was finished once the grounded findings were identified.
