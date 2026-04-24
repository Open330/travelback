# Cycle 1 current implementation plan — 2026-04-24

Source review aggregate: `.context/reviews/_aggregate.md`.

## Repository rules consulted

- User-provided `AGENTS.md`: execute autonomously, keep diffs small/reversible, run configured gates, preserve deferred-fix records, and use GPG-signed semantic gitmoji commits.
- `.context/development/01-conventions.md`: TypeScript strict mode, no semicolons, single quotes, 2-space indentation, `npm run build` and `npm run lint` must pass, GPG-signed semantic gitmoji commits, and minimal dependencies.
- `.context/README.md`, `.context/plans/README.md`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`: `.context/` is authoritative project context and active/deferred plan records must stay accurate.
- Repo scan found no root `CLAUDE.md`, `.cursorrules`, `CONTRIBUTING.md`, or `docs/` policy files. `.context/development/01-conventions.md` explicitly says this project must not use `CLAUDE.md`.

## Scheduled implementation tasks

### TASK-1 — Consolidate export ownership and preserve completed videos

Findings: AGG-001, AGG-002, AGG-003, AGG-004, AGG-017, AGG-053 partial.
Severity/confidence: High/High to Low-Medium/Medium.

Plan:
1. Remove the separate `page.tsx` export overlay and make `ExportPanel` the sole export progress/cancel surface.
2. Pass `cancelExport` into `ExportPanel` so the visible progress UI can cancel the active export.
3. Make closing a completed export panel non-destructive; keep blob reset only on "Export Again".
4. Treat fallback anchor downloads as unconfirmed readiness, not confirmed saves.
5. Always show an explicit download link/button when a blob URL exists.
6. Surface a toast if export is requested without a usable map/canvas/track.

### TASK-2 — Add export preflight budget and safer defaults

Findings: AGG-015, AGG-018, AGG-053 partial.
Severity/confidence: High/High to Medium/High.

Plan:
1. Default the export preset to TikTok / Shorts / Reels portrait.
2. Estimate encoded output size from duration and bitrate before export.
3. Disable export and show localized copy when the estimated in-memory MP4 exceeds the configured budget.

### TASK-3 — Repair scene camera/range correctness and keyboard isolation

Findings: AGG-005, AGG-006, AGG-010, AGG-013.
Severity/confidence: High/High to Medium/High.

Plan:
1. Fall back to normal follow-camera behavior after the final custom scene instead of pinning at local progress 1.
2. Clamp typed scene range edits so an invalid intermediate value cannot delete a scene.
3. Stop handled scene-range key events from bubbling to global playback hotkeys.
4. Give scene-name inputs stable accessible names.
5. Add global hotkey guards for ARIA sliders/spinbuttons and mark elevation keyboard seeking as consumed.

### TASK-4 — Fix Journey Creator interaction and accessible focus

Findings: AGG-009, AGG-012, AGG-014, AGG-048, AGG-052.
Severity/confidence: High/High to Low/Medium.

Plan:
1. Allow `MapView` interaction while Journey Creator is active even with no loaded track.
2. Move focus into the Journey Creator panel on open.
3. Give the coordinate combobox a localized accessible name.
4. Use the selected travel icon in created track metadata so the picker has a persisted effect.
5. Wrap manual-route preview line coordinates around the antimeridian.

### TASK-5 — Improve import recovery UX and mobile toolbar focus

Findings: AGG-011, AGG-016, AGG-047.
Severity/confidence: Medium/High to Medium/Medium.

Plan:
1. Use a dedicated mobile overflow-panel ref so opening the toolbar moves focus into the popup.
2. Pair upload parse/format errors with a direct import-guide action when the guide is available.
3. Expose the import guide from the mobile loaded-track menu so help remains reachable after upload.

### TASK-6 — Fix bounded parser robustness

Findings: AGG-007, AGG-008.
Severity/confidence: Medium/Medium-High and Medium/High.

Plan:
1. Recursively extract `GeometryCollection` / MultiGeometry KML geometries, including nested point/line geometries.
2. Reject large Google JSON files when worker creation is unavailable instead of decoding the whole file on the main thread.

### TASK-7 — Align scripts/docs/plans with current behavior

Findings: AGG-034, AGG-038, AGG-039, AGG-040, AGG-041, AGG-042, AGG-043, AGG-044, AGG-049, AGG-051.
Severity/confidence: Medium/High to Low/High.

Plan:
1. Chain `npm run smoke:static` into the CI-oriented static E2E command.
2. Update `.context` project docs for actual quality gates, import-guide scope, map-style labels, parser compatibility, and current map layers.
3. Refresh `.context/plans/README.md` so active/deferred records include the current plan files.
4. Correct `plan/cycle10-plan.md` wording so it does not imply deferred severity downgrades.
5. Correct non-tech reviewer guidance so it does not overstate export E2E coverage.
6. Cancel the toast enter-animation frame on unmount.

## Findings explicitly deferred

Deferred items are recorded in `plan/deferred-cycle1-current-2026-04-24.md`: AGG-019, AGG-020, AGG-021, AGG-022, AGG-023, AGG-024, AGG-025, AGG-026, AGG-027, AGG-028, AGG-029, AGG-030, AGG-031, AGG-032, AGG-033, AGG-035, AGG-036, AGG-037, AGG-045, AGG-046, AGG-050, AGG-053 remainder, and AGG-054.

## Implementation progress

Status: implementation complete; all configured gates passed.

- [x] TASK-1 — Export ownership/download/result preservation fixed in `src/app/page.tsx`, `src/components/ExportPanel.tsx`, `src/lib/useExportController.ts`, and `src/lib/videoEncoder.ts`.
- [x] TASK-2 — Export budget guard and portrait default fixed in `src/components/ExportPanel.tsx` and `src/lib/i18n.ts`.
- [x] TASK-3 — Scene camera/range/hotkey/accessibility fixes completed in `src/lib/camera.ts`, `src/components/SceneEditor.tsx`, `src/lib/usePlaybackController.ts`, and `src/components/ElevationProfile.tsx`.
- [x] TASK-4 — Journey Creator interaction/focus/icon/antimeridian fixes completed in `src/app/page.tsx`, `src/components/MapView.tsx`, and `src/components/JourneyCreator.tsx`.
- [x] TASK-5 — Import recovery UX and mobile toolbar focus completed in `src/components/FileUpload.tsx`, `src/components/TrackToolbar.tsx`, and `src/components/TrackWorkspace.tsx`.
- [x] TASK-6 — Parser robustness fixes completed in `src/lib/parser.ts`.
- [x] TASK-7 — Script/docs/plans/toast fixes completed in `package.json`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`, `.context/plans/README.md`, `.context/agents/non-tech-traveler-reviewer.md`, `plan/cycle10-plan.md`, and `src/components/Toast.tsx`.

## Gate plan

Run the cycle gates against the whole repo after implementation:

- [x] `npm run lint` — passed after implementation and after final playback/map patches.
- [x] `npm run typecheck` — passed after one KML times-narrowing fix and after final playback/map patches.
- [x] `npm run build` — passed; `postbuild` hardened CSP across 3 static HTML files.
- [x] `npm run test:e2e` — passed, 59 tests in 16.8m.
- [x] `npm run test:e2e:static` — passed, static build + smoke + 59 tests in 16.1m.

## Final verification notes

- Architect/Ralph verification: read-only architect verification returned `APPROVED`; no blockers before commit.
- Deslop pass: scoped pass over changed files after tests found no dead code/dependency additions requiring another cleanup edit. The only cleanup-oriented edits made in this cycle were bounded fixes already covered by TASK-7 and the final gate fixes.
- Gate warnings preserved in `plan/deferred-cycle1-current-2026-04-24.md`: React development-mode CSP `eval()` warning under the dev server and Node `NO_COLOR`/`FORCE_COLOR` runner warning. Static export gates do not emit the React dev warning.
