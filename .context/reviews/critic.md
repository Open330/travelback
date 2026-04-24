# Critic Review — Review-Plan-Fix Cycle 3 (2026-04-24)

**Reviewer:** critic lane
**Scope:** current repo runtime, parsing, export, UX, build, and test surfaces. This pass is grounded in the live repository state, with prior critic output used only to avoid re-reporting already-documented concerns unless they changed materially.

## Inventory Reviewed First

### Runtime and UX surface
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- `src/components/*.tsx`
- `src/lib/*.ts`
- `src/styles/vitro-base.css`
- `src/types.ts`
- `public/workers/trackParser.worker.js`
- `public/map-styles/*.json`

### Build, deployment, and verification surface
- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `eslint.config.mjs`
- `postcss.config.mjs`
- `playwright.config.ts`
- `playwright.static.config.ts`
- `scripts/*.mjs`
- `e2e/travelback.spec.ts`
- relevant `.context/` overview/architecture/convention docs plus the current `critic.md`

### Fixtures and other inputs checked
- `e2e/fixtures/*` inventoried as test inputs
- static SVG/font/binary assets inventoried but not treated as primary logic-bearing review targets

## Verification Run

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm run build` — passed
- `npm run smoke:static` — passed

## Findings

### CRITIC-C3-001 — Replacement uploads fail silently after a track is already loaded

- **Status:** Confirmed issue
- **Severity:** Medium
- **Confidence:** High
- **Evidence:** `src/components/FileUpload.tsx:52-92`, `src/components/FileUpload.tsx:130-152`, `e2e/travelback.spec.ts:1247-1257`
- **Why this is a problem:** `handleFile()` still records parse errors in local component state, but once `hasTrack` is true the component returns only the compact "Load New File" button and never renders `error` or `loading`. That means the already-loaded state has a different and weaker error path than the landing uploader.
- **Concrete failure scenario:** A user successfully loads one trip, then clicks `Load New File` and picks an unsupported or malformed file. Parsing fails, the current track stays on screen, and no inline error or toast appears. From the user's perspective the button simply does nothing.
- **Suggested fix:** Surface parse/read failures in the `hasTrack` branch too, ideally through the shared toast system or a compact inline error near the button. Also add a regression test for invalid replacement uploads after a track is loaded.

### CRITIC-C3-002 — Fallback downloads are misreported as merely “ready”, making the started-download success path unreachable

- **Status:** Confirmed issue
- **Severity:** Medium
- **Confidence:** High
- **Evidence:** `src/lib/videoEncoder.ts:161-167`, `src/lib/videoEncoder.ts:191-211`, `src/lib/useExportController.ts:165-172`, `src/components/ExportPanel.tsx:215-222`, `src/lib/i18n.ts:127`, `src/lib/i18n.ts:474`, `src/lib/i18n.ts:821`, `src/lib/i18n.ts:1168`, `src/lib/i18n.ts:1515`
- **Why this is a problem:** `downloadVideo()` explicitly distinguishes `picker` and `fallback`, but `useExportController` maps every non-confirmed download to `ready`. That makes the `downloadMethod === 'fallback'` branch in `ExportPanel` effectively dead, even though the anchor-click fallback did already start a browser download.
- **Concrete failure scenario:** On a browser without File System Access API support, export completes and the fallback `<a download>` path fires. The browser starts downloading the MP4, but the success UI tells the user only that the video is "ready" and encourages another manual download, which can easily create duplicate downloads and confused recovery steps.
- **Suggested fix:** Preserve `downloadResult.method` exactly. Treat `fallback` as a distinct successful state with the existing `savedToDownloads` copy, and reserve `ready` only for cases where no download was initiated or the picker was cancelled.

### CRITIC-C3-003 — Post-export download/share actions discard the track-specific filename and always use `travelback.mp4`

- **Status:** Confirmed issue
- **Severity:** Medium
- **Confidence:** High
- **Evidence:** `src/lib/videoEncoder.ts:147-157`, `src/lib/useExportController.ts:165-173`, `src/components/ExportPanel.tsx:146-152`, `src/components/ExportPanel.tsx:237-240`
- **Why this is a problem:** The encoder carefully sanitizes the track name into a user-facing filename, but that filename is not preserved in controller state. The follow-up download link and share flow both hardcode `travelback.mp4` instead.
- **Concrete failure scenario:** A user exports multiple trips and relies on the panel's `Download MP4` or `Share` action afterward. Every file gets the same generic name instead of `Travelback - <trip>.mp4`, which increases overwrite risk and makes saved exports harder to identify.
- **Suggested fix:** Store the generated filename alongside the blob/url in `useExportController`, then use that value for the post-export download anchor and `new File(...)` in the share path.

### CRITIC-C3-004 — The Journey Creator “travel icon” picker does not affect map rendering; it only changes the eventual track name

- **Status:** Confirmed issue
- **Severity:** Low
- **Confidence:** High
- **Evidence:** `src/components/JourneyCreator.tsx:52-60`, `src/components/JourneyCreator.tsx:170-179`, `src/components/JourneyCreator.tsx:205-227`, `src/components/JourneyCreator.tsx:567-574`, `src/components/JourneyCreator.tsx:695-719`
- **Why this is a problem:** The UI presents multiple travel-icon choices as though they affect the route being authored, and the GeoJSON even includes `icon`/`label` properties, but the map renders waypoints with a plain circle layer only. The selected icon is ultimately used just as a name prefix when the track is finalized.
- **Concrete failure scenario:** A user selects `Plane` while sketching a flight path and expects the route markers or preview to reflect that choice. Nothing visual changes during authoring or playback; only the saved track title gains an emoji prefix.
- **Suggested fix:** Either make the selection visible in the authored route (for example with a symbol/text layer or marker decoration), or relabel the control so it is clearly a title/emoji choice rather than a route-style choice.

## Residual Risks

- The E2E suite still does not exercise the real export completion path (`Start Export` through download/save-state verification), so the export-state bugs above can survive while UI-only export tests still pass.
- The E2E suite covers unsupported uploads on the landing screen, but not invalid replacement uploads after a track is already loaded, which is why `CRITIC-C3-001` slipped through.
- I did not restate older already-documented critic findings here unless they changed materially; this file is focused on additional issues confirmed in the current pass.

## Final Sweep

- Reviewed current code/config/test surface: all files under `src/app`, `src/components`, `src/lib`, `src/styles`, `src/types.ts`, top-level config files, `scripts/*.mjs`, `public/workers/trackParser.worker.js`, `public/map-styles/*.json`, and `e2e/travelback.spec.ts`.
- Context docs read for grounding: `.context/README.md`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`, `.context/development/01-conventions.md`, relevant cycle plan/review artifacts, and the previous `critic.md`.
- Static assets were inventoried; logic-bearing code/config/test files were examined directly.
- No application source files were modified in this review pass.
