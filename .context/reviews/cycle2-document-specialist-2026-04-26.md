# Document Specialist — Cycle 2 (2026-04-26)

**Scope:** README.md, `.context/**`, package scripts, CI, source behavior, and review-relevant tests/workers.

## Summary

I found 2 doc/code mismatches. The build, static export, parser limits, and CI gates otherwise line up with the current implementation.

### Inventory checked

- **Docs/context:** `README.md`, `.context/README.md`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`, `.context/development/01-conventions.md`
- **Scripts/config:** `package.json`, `.github/workflows/deploy-pages.yml`, `next.config.ts`, `playwright.config.ts`, `playwright.static.config.ts`, `scripts/fetch-map-styles.mjs`, `scripts/harden-static-export.mjs`, `scripts/run-dev-e2e.mjs`, `scripts/run-static-e2e.mjs`, `scripts/serve-static.mjs`, `scripts/smoke-static.mjs`
- **Source behavior:** `src/app/layout.tsx`, `src/app/page.tsx`, `src/components/*.tsx` (including `GoogleGuide`, `SceneEditor`, `Controls`, `FileUpload`, `TrackWorkspace`, `TimelineSelector`, `ThemeToggle`, `ModalDialog`, `ErrorBoundary`), `src/lib/*.ts` (including `parser`, `camera`, `interpolate`, `usePlaybackController`, `useExportController`, `videoEncoder`, `env`, `i18n`), `public/workers/trackParser.worker.js`
- **Tests/fixtures:** `e2e/travelback.spec.ts`

## Findings

### DS2-1 — LOW — README still describes the import guide as Google Takeout-only

**Location:** `README.md:64`, `README.md:127` vs `src/components/GoogleGuide.tsx:146-220`, `src/lib/i18n.ts:159-206`

**Failure scenario:** A reader assumes the app only ships Google Takeout instructions and misses the broader import guide surface. The current UI has seven tabs: Google Maps phone export, Google Takeout, Strava, Garmin, AllTrails, Komoot, and Other Apps. A maintainer or reviewer following the README can therefore under-test the non-Google import flows.

**Suggested fix:** Rename the README feature bullet and architecture comment to something like “Travel data import guide,” or explicitly list the broader tab set that the component now renders.

**Severity:** LOW  
**Confidence:** HIGH  
**Status:** OPEN

---

### DS2-2 — LOW — Camera mode names in docs do not match the current UI labels

**Location:** `README.md:48`, `.context/project/02-architecture.md:73-80` vs `src/lib/i18n.ts:210-216`, `src/components/SceneEditor.tsx:381-386`

**Failure scenario:** The docs refer to camera modes as “Orbit” and “Ground Follow,” but the current scene-editor labels are “Spin Around” and “Street View.” A support note, test plan, or contributor guide that copies the README wording will spend time translating labels or may think the wrong control is present.

**Suggested fix:** Add a small doc table that maps semantic mode keys to UI labels, or rename the docs to the user-facing labels and note the internal mode names separately.

**Severity:** LOW  
**Confidence:** HIGH  
**Status:** OPEN

## Final sweep

I examined the repo’s current docs, scripts, CI, source files, worker code, and E2E suite listed above. I did not skip any file that appeared relevant to the docs-vs-behavior check.
