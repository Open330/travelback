# Verifier Review — review-plan-fix cycle 2

## Verdict

PASS

I reviewed the behavior-defining source, the static-export path, and the cycle-2 E2E coverage. No confirmed correctness issues were found against the stated behavior, existing tests, or the static export contract.

## Evidence

- `npm run typecheck` — passed.
- `npm run build` — passed; Next.js generated the static pages and `postbuild` hardened CSP across 3 HTML files.
- `npm run smoke:static` — passed with `[smoke-static] OK`.
- `npx playwright test -c playwright.static.config.ts --grep "journey coordinate search supports keyboard selection and antimeridian duplicate suppression|timeline keyboard trimming updates the track without scrubbing playback|scene overview camera frames antimeridian tracks without zooming to the world|scene presets use localized default names|explicit map style choices survive later system theme changes"` — 5/5 passed.

Code and review surfaces inspected:

- App shell and export bootstrap: `src/app/layout.tsx:1-85`, `src/app/page.tsx:1-481`, `next.config.ts:1-16`
- Core math and parsing: `src/lib/interpolate.ts:1-185`, `src/lib/camera.ts:1-260`, `src/lib/parser.ts:1-675`, `src/lib/videoEncoder.ts:1-225`
- UI/control surfaces: `src/components/MapView.tsx:1-961`, `src/components/FileUpload.tsx:1-260`, `src/components/JourneyCreator.tsx:1-826`, `src/components/TimelineSelector.tsx:1-260`, `src/components/TrackWorkspace.tsx:1-170`, `src/components/Controls.tsx:1-159`, `src/components/ExportPanel.tsx:1-295`, `src/components/TrackToolbar.tsx:1-248`, `src/components/GlobalToolbar.tsx:1-70`, `src/components/ThemeToggle.tsx:1-81`, `src/components/ModalDialog.tsx:1-189`, `src/components/SceneEditor.tsx:1-520`, `src/components/ElevationProfile.tsx:1-131`, `src/components/ErrorBoundary.tsx:1-84`, `src/components/GoogleGuide.tsx:1-320`, `src/components/KeyboardHelp.tsx:1-83`, `src/components/Toast.tsx:1-91`
- Static/export tooling: `scripts/serve-static.mjs:1-183`, `scripts/smoke-static.mjs:1-192`, `scripts/harden-static-export.mjs:1-118`, `public/workers/trackParser.worker.js:1-322`, `src/lib/env.ts:1-1`
- Browser coverage: `e2e/travelback.spec.ts:1-1160`, plus the committed fixtures under `e2e/fixtures/`

## Findings

None confirmed.

The cycle-2 implementation and the shipped browser regressions cover the intended dateline, map-style persistence, keyboard, timeline, and export/static-export flows. I did not find a behavior break or a mismatch with the current test gates.

## Gaps

- There is still no deterministic unit-test harness for the pure parser/camera/interpolate/controller logic, so low-level math and fallback branches remain mostly protected through browser tests.
- Playwright still depends on some forced interactions and timed waits in the broader suite, which is a flake risk, but the focused cycle-2 regressions and static smoke passed in this run.
- The pre-existing coverage gaps called out by the test-engineer lane remain testability gaps, not confirmed correctness bugs.

## Final Sweep

No relevant file in the requested review scope was skipped.

I reviewed the source files that define app behavior, the full static-export toolchain, the generated worker bundle, the Playwright configs, the cycle-2 E2E spec, and the committed fixtures that those tests exercise. I did not line-by-line audit derived outputs such as `.next/` or `out/`, because those are build artifacts rather than source-of-truth files.
