# Cycle 5 Recovery Implementation Plan — 2026-04-25

Source review aggregate: `.context/reviews/_aggregate.md`

Repo-policy checks before planning:
- `CLAUDE.md`: absent, and `.context/development/01-conventions.md` says never use it for this project.
- `AGENTS.md`: orchestrator-provided workspace rules apply.
- `.context/**`: read `.context/README.md`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`, `.context/development/01-conventions.md`, and `.context/plans/README.md`.
- `.cursorrules`, `CONTRIBUTING.md`, `docs/`: absent in this repo snapshot.
- Deferred work remains bound by repo policy: Node 24 LTS, strict TypeScript, no new dependencies without explicit request, lint/typecheck/build/e2e gates before commit, semantic gitmoji commit messages, GPG-signed commits, and push after each implementation iteration.

Archived completed plan:
- `plan/cycle5-plan.md` moved to `plan/archive/cycle5-plan-2026-04-21.md`.

## Implementation Tasks

### TASK-1 — Harden XML import availability limits
- **Findings:** F5-03
- **Severity/confidence:** High / High
- **Files:** `src/lib/parser.ts:152-212`, `src/lib/parser.ts:521-523`, `src/lib/parser.ts:626-674`
- **Plan:** Add a smaller XML-specific file-size guard before GPX/KML `readAsText()` and route the error through existing file-size messaging. Add/adjust e2e coverage for oversized XML if practical without large fixtures.
- **Progress:** done — addressed in cycle 5 recovery implementation and verified by lint, typecheck, build, dev e2e, and static e2e gates.

### TASK-2 — Remediate vulnerable PostCSS dependency posture
- **Findings:** F5-14
- **Severity/confidence:** Medium / High
- **Files:** `package.json`, `package-lock.json`
- **Plan:** Add a bounded `postcss >= 8.5.10` override and refresh the lockfile. Verify `npm audit --audit-level=moderate` no longer reports the known advisory.
- **Progress:** done — addressed in cycle 5 recovery implementation and verified by lint, typecheck, build, dev e2e, and static e2e gates.

### TASK-3 — Fail closed if static CSP placeholder survives hardening
- **Findings:** F5-15
- **Severity/confidence:** Low / High
- **Files:** `scripts/harden-static-export.mjs`, `scripts/smoke-static.mjs`
- **Plan:** Strengthen the postbuild hardening script so it throws if an HTML file still contains the placeholder CSP after processing. Keep smoke-static as the emitted-output guard.
- **Progress:** done — addressed in cycle 5 recovery implementation and verified by lint, typecheck, build, dev e2e, and static e2e gates.

### TASK-4 — Ensure exported videos include the moving marker
- **Findings:** F5-07
- **Severity/confidence:** Medium / High
- **Files:** `src/components/MapView.tsx`, `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`
- **Plan:** Render/synchronize an export-captured current-position indicator as a MapLibre source/layer instead of relying only on the DOM marker. Preserve the existing interactive marker if needed.
- **Progress:** done — addressed in cycle 5 recovery implementation and verified by lint, typecheck, build, dev e2e, and static e2e gates.

### TASK-5 — Add bounded export execution coverage
- **Findings:** F5-06
- **Severity/confidence:** Medium / High
- **Files:** `e2e/travelback.spec.ts`, `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`
- **Plan:** Add a deterministic test seam or browser-level stub that still drives the export controller from the UI through exporting/done state. Assert success/download availability without making CI perform expensive real MP4 generation.
- **Progress:** done — addressed in cycle 5 recovery implementation and verified by lint, typecheck, build, dev e2e, and static e2e gates.

### TASK-6 — Fix system-theme drift and first-frame toggle semantics
- **Findings:** F5-08, F5-23, F5-26
- **Severity/confidence:** Medium / High; Medium / High; Low / High
- **Files:** `src/app/page.tsx`, `src/components/ThemeToggle.tsx`, `src/app/layout.tsx`
- **Plan:** Track whether theme/map style were explicitly overridden, subscribe to `prefers-color-scheme` at the app preference owner, and derive accessible toggle labels from the actual effective mode.
- **Progress:** done — addressed in cycle 5 recovery implementation and verified by lint, typecheck, build, dev e2e, and static e2e gates.

### TASK-7 — Reset session-scoped playback/export state on new track
- **Findings:** F5-09
- **Severity/confidence:** Medium / High
- **Files:** `src/app/page.tsx`, `src/lib/usePlaybackController.ts`, `src/components/ExportPanel.tsx`
- **Plan:** Reset speed, duration, follow-camera, and export-panel settings when a new track/session starts while preserving true global preferences such as locale/theme/unit.
- **Progress:** done — addressed in cycle 5 recovery implementation and verified by lint, typecheck, build, dev e2e, and static e2e gates.

### TASK-8 — Correct file-read failure messaging
- **Findings:** F5-17
- **Severity/confidence:** Low / High
- **Files:** `src/components/FileUpload.tsx`, `src/lib/i18n.ts`
- **Plan:** Map `READ_FAILED` to `fileUpload.readFailed` and add/adjust regression coverage for the visible message if feasible.
- **Progress:** done — addressed in cycle 5 recovery implementation and verified by lint, typecheck, build, dev e2e, and static e2e gates.

### TASK-9 — Preserve the main landmark in fatal fallback UI
- **Findings:** F5-16
- **Severity/confidence:** Low / High
- **Files:** `src/components/ErrorBoundary.tsx`, `src/app/page.tsx`
- **Plan:** Render the error boundary fallback inside a main landmark or add `role="main"` with a labeled heading.
- **Progress:** done — addressed in cycle 5 recovery implementation and verified by lint, typecheck, build, dev e2e, and static e2e gates.

### TASK-10 — Reduce test harness false positives and flake sources
- **Findings:** F5-10, F5-18, F5-19
- **Severity/confidence:** Medium / High; Low / High; Medium / High
- **Files:** `e2e/travelback.spec.ts`, `playwright.config.ts`, `playwright.static.config.ts`
- **Plan:** Replace the app readiness helper with an app-root/map-container signal, remove overlay deletion from steady-state readiness if possible, replace easy fixed sleeps with observable waits, and strengthen the highest-risk broad locators touched by this cycle.
- **Progress:** done — addressed in cycle 5 recovery implementation and verified by lint, typecheck, build, dev e2e, and static e2e gates.

### TASK-11 — Wire Journey Creator validation to the combobox
- **Findings:** F5-27
- **Severity/confidence:** Medium / High
- **Files:** `src/components/JourneyCreator.tsx`
- **Plan:** Add `aria-invalid`, stable `aria-describedby`, and live error semantics for search validation.
- **Progress:** done — addressed in cycle 5 recovery implementation and verified by lint, typecheck, build, dev e2e, and static e2e gates.

### TASK-12 — Restore focus after closing the mobile overflow menu
- **Findings:** F5-28
- **Severity/confidence:** Medium / High
- **Files:** `src/components/TrackToolbar.tsx`
- **Plan:** Store the overflow trigger ref and restore focus when the menu closes from Escape or menu action.
- **Progress:** done — addressed in cycle 5 recovery implementation and verified by lint, typecheck, build, dev e2e, and static e2e gates.

### TASK-13 — Expose unit switcher active state
- **Findings:** F5-29
- **Severity/confidence:** Low / High
- **Files:** `src/components/GlobalToolbar.tsx`, `src/components/TrackToolbar.tsx`
- **Plan:** Add `aria-pressed` or radio-style semantics to unit buttons so assistive tech can identify the current unit system.
- **Progress:** done — addressed in cycle 5 recovery implementation and verified by lint, typecheck, build, dev e2e, and static e2e gates.

### TASK-14 — Improve remaining low-risk keyboard/focus affordances
- **Findings:** F5-30, F5-31
- **Severity/confidence:** Low / High; Low / Medium
- **Files:** `src/components/GoogleGuide.tsx`, `src/components/FileUpload.tsx`
- **Plan:** Add tablist arrow-key navigation and a visible keyboard focus style on the upload drop zone.
- **Progress:** done — addressed in cycle 5 recovery implementation and verified by lint, typecheck, build, dev e2e, and static e2e gates.

### TASK-15 — Align Google semantic visit documentation with parser support
- **Findings:** F5-32
- **Severity/confidence:** Medium / High
- **Files:** `.context/project/01-overview.md`, `src/lib/parser.ts`, `e2e/fixtures/*`
- **Plan:** Narrow the project overview to the currently supported `placeLocation.latLng` string shape unless parser support for structured variants is added in this cycle.
- **Progress:** done — addressed in cycle 5 recovery implementation and verified by lint, typecheck, build, dev e2e, and static e2e gates.

### TASK-16 — Align export presets with in-memory encoding limits
- **Findings:** F5-33
- **Severity/confidence:** Medium / High
- **Files:** `src/types.ts`, `src/components/ExportPanel.tsx`, `src/lib/videoEncoder.ts`
- **Plan:** Reduce or qualify advertised export limits for the current `BufferTarget` implementation so the UI no longer presents browser-hostile large outputs as normal.
- **Progress:** done — addressed in cycle 5 recovery implementation and verified by lint, typecheck, build, dev e2e, and static e2e gates.

### TASK-17 — Guard worker constant drift
- **Findings:** F5-34
- **Severity/confidence:** Low / High
- **Files:** `public/workers/trackParser.worker.js`, `src/lib/parser.ts`, `scripts/smoke-static.mjs`
- **Plan:** Add a lightweight repository check, smoke assertion, or build-time script validation for worker/parser constants without introducing new dependencies.
- **Progress:** done — addressed in cycle 5 recovery implementation and verified by lint, typecheck, build, dev e2e, and static e2e gates.

## Deferred Findings

All deferred cycle-5 findings are recorded in `plan/deferred-cycle5-review-recovery-2026-04-25.md`.
