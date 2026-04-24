# Cycle 3 Review Implementation Plan - 2026-04-24

## Scope

Address the concrete cycle-3 findings from `.context/reviews/_aggregate.md` while deferring broad architecture/test backlog items with explicit citations.

## Scheduled Fixes

1. **FIX-C3-001 - Confirmation dialogs render unstyled**
   - Files: `src/components/SceneEditor.tsx`, `src/components/JourneyCreator.tsx`
   - Plan: pass the same centered overlay/panel styling pattern used by other `ModalDialog` call sites.
   - Status: done

2. **FIX-C3-002 - Follow camera skips progress zero**
   - File: `src/components/MapView.tsx`
   - Plan: allow follow-camera calculation at progress `0` so explicit seek/restart applies the start camera immediately.
   - Status: done

3. **FIX-C3-003 / FIX-C3-004 - Export follow-up state loses filename and fallback download method**
   - Files: `src/lib/useExportController.ts`, `src/components/ExportPanel.tsx`
   - Plan: store the generated export filename in controller state; preserve `fallback` as a download method; use the filename for follow-up download/share actions.
   - Status: done

4. **FIX-C3-005 - Replacement uploads fail silently**
   - File: `src/components/FileUpload.tsx`
   - Plan: render compact loading/error feedback in the loaded-track replacement branch.
   - Status: done

5. **FIX-C3-006 - Journey icon picker expectation mismatch**
   - File: `src/lib/i18n.ts`
   - Plan: relabel the control as a route-name icon rather than a map-rendering travel icon.
   - Status: done

6. **FIX-C3-007 - Landing map error hidden behind upload overlay**
   - File: `src/components/MapView.tsx`
   - Plan: give the map error panel its own higher stacking layer so retry/reload controls are visible when first-load map errors occur.
   - Status: done

7. **FIX-C3-008 / FIX-C3-009 - Accent and landing helper contrast**
   - Files: `src/app/globals.css`, `src/components/Controls.tsx`, `src/components/GlobalToolbar.tsx`, `src/components/JourneyCreator.tsx`, `src/components/GoogleGuide.tsx`, `src/components/FileUpload.tsx`
   - Plan: introduce/use a contrast-safe accent foreground token; remove helper opacity and use a stronger guide CTA color.
   - Status: done

8. **FIX-C3-010 - Static e2e fixed-port flake**
   - Files: `package.json`, `playwright.static.config.ts`, `scripts/smoke-static.mjs`, new `scripts/run-static-e2e.mjs`
   - Plan: allocate an available port for static e2e and let smoke-static choose a free default port when not explicitly configured.
   - Status: done

9. **FIX-C3-011 / FIX-C3-012 - Export boundary cleanup**
   - Files: `src/types.ts`, `src/components/ExportPanel.tsx`, `src/lib/useExportController.ts`, `src/components/MapView.tsx`
   - Plan: make the panel-facing export request scene-free and make `resetSize()` clear forced dimensions internally.
   - Status: done

## Completion Criteria

- All scheduled statuses are updated to done.
- Required gates pass: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:e2e`, `npm run test:e2e:static`.
- Changes are committed and pushed with a signed semantic gitmoji commit.

## Verification

- `npm run lint` passed.
- `npm run typecheck` passed after fixing the missing `exportedVideoFilename` destructure in `src/app/page.tsx`.
- `npm run build` passed and hardened CSP across 3 HTML files.
- `npm run test:e2e` passed: 61/61 Chromium tests.
- `npm run test:e2e:static` passed: build, static smoke, and 61/61 Chromium tests.
