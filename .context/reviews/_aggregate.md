# Aggregate Review — Travelback (2026-07-16, Cycle 1)

## Outcome

Twelve role reviews completed against `df8f08a` and were independently read and deduplicated. The role reports contain 69 entries, but most describe the same lifecycle, release-gate, or parser boundaries. This aggregate contains **31 distinct current findings**: 8 High, 19 Medium, and 4 Low. No deployment was attempted.

Current evidence is mixed rather than release-ready:

- `npm run lint`, `npm run typecheck`, `npm test` (219/219), and `npm run build` passed.
- `npm audit` reports six vulnerable packages, including three High-severity packages.
- `npm run smoke:static` fails because its parser parity checks follow obsolete source locations.
- A direct static Playwright run reproduced loaded-desktop settings failures and exposed additional cases for targeted isolation.
- Targeted format, mobile, dialog, theme, error, and stub-export journeys passed.
- The opt-in real-MP4 test failed twice before reaching the encoder because it selects a nonexistent duration.

## Deduplicated findings

### Release, security, and verification

| ID | Severity / confidence | Evidence | Finding and required outcome |
| --- | --- | --- | --- |
| AG-01 | High / High | `package.json:20-44`, `package-lock.json` | **Known vulnerable dependency tree.** `next`, `vite`, and `undici` are High, with three additional Moderate/Low packages. Update to current patched releases and require a clean `npm audit --audit-level=high`. |
| AG-02 | High / High | `scripts/smoke-static.mjs:223-259`, `src/lib/parse-utils.ts:7`, `src/lib/googleJsonParser.ts:138-158` | **The static smoke gate is broken.** It still searches `parser.ts` for symbols moved to `parse-utils.ts` and `googleJsonParser.ts`. Make the parity check follow actual source ownership and restore a passing release gate. |
| AG-03 | High / High | `e2e/travelback.spec.ts:1311-1333`, `src/components/Controls.tsx:23-24` | **The real-MP4 test is dormant and cannot reach encoding when enabled.** Repair its invalid duration, validate a nontrivial MP4, and run a local supported-browser smoke. Adding it to CI is separately authority-gated. |
| AG-04 | High / High | `.github/workflows/deploy-pages.yml:26-32`, `package.json:10-18` | **CI omits all 219 unit tests.** Add the unit gate before build/static E2E once explicit CI/CD modification authorization is granted. |
| AG-05 | Medium / High | `.github/workflows/deploy-pages.yml:8-35` | **Build/test steps inherit Pages and OIDC write authority.** Narrow build to read-only and grant deployment permissions only to the deploy job once explicit CI/CD modification authorization is granted. |
| AG-06 | Low / High | `src/app/layout.tsx:59-66` plus reproduced dev-console CSP violations | **The development CSP blocks Next's inline style elements despite claiming dev compatibility.** Permit only the dev style behavior needed by Next while preserving the postbuild hash-based production CSP and its smoke assertions. |

### Runtime correctness and lifecycle safety

| ID | Severity / confidence | Evidence | Finding and required outcome |
| --- | --- | --- | --- |
| AG-07 | High / High | `src/components/MapView.tsx:568-578,1069-1080` | **Trail geometry freezes between route vertices.** The cache key ignores the changing interpolated endpoint. Keep immutable completed geometry cached but update the active endpoint for every playback/export frame. |
| AG-08 | High / High | `src/components/MapView.tsx:544-648`, `src/lib/videoEncoder.ts:148-164` | **An unchanged export camera can capture the previous source frame.** Register the render barrier before mutation and resolve only after marker/trail source changes have painted. |
| AG-09 | Medium / High | `src/components/MapView.tsx:102-116,232-264`, `src/lib/googleJsonParser.ts:150-190` | **Completed one-point Google visit segments produce invalid line members.** Normalize singletons to a valid two-coordinate line (or represent them separately) in trail geometry. |
| AG-10 | Medium / High | `src/components/TimelineSelector.tsx:96-105,274-322`, `src/app/page.tsx:319-355` | **Cancelling a scene-invalidating trim leaves selector handles on the rejected range.** Restore the last accepted ratios when cancellation occurs. |
| AG-11 | Medium / High | `src/components/TrackWorkspace.tsx:138-146`, `src/components/TimelineSelector.tsx:323-329` | **Click-to-seek uses full-track coordinates against the filtered active track.** Convert the selected full-track ratio to local active-track progress. |
| AG-12 | Medium / High | `src/components/JourneyCreator.tsx:80-89,197-207,481-493` | **Undo/delete/clear can leave a ghost journey line.** Always publish `buildLineGeoJSON`, including its empty geometry for fewer than two waypoints. |
| AG-13 | Medium / High | `src/components/SceneEditor.tsx:281-285,368-378` | **Scene delete undo discards newer edits.** Store the deleted scene plus index and reinsert into current state instead of restoring a whole stale snapshot. |
| AG-14 | Medium / High | `src/components/SceneEditor.tsx:153-164,221-264,643-650` | **Keyboard range changes bypass committed normalization.** Route keyboard actions through the same normalized commit boundary as pointer actions. |
| AG-15 | Medium / High | `src/components/FileUpload.tsx:53-95,263-286`, `src/app/page.tsx:297-317` | **A slow import can overwrite a newer manual journey session.** Invalidate async completion on unmount/session replacement and test with a deferred parse. |
| AG-16 | Medium / High | `src/lib/videoEncoder.ts:115-173` | **Failed or cancelled encoding does not release Mediabunny resources.** Call `Output.cancel()` on every started-but-incomplete path while preserving the original error. |
| AG-17 | Medium / High | `src/types.ts:96-104`, `src/lib/videoEncoder.ts:50-65`, `src/components/ExportPanel.tsx:90-108` | **Both advertised 4K presets are impossible under the 256 MiB estimator.** Align the preset catalog with the enforced envelope or redesign the memory path; every advertised preset must have a feasible configuration. |
| AG-18 | Medium / High | `src/lib/parser.ts:338-390` | **Known unsupported extensions are read before rejection.** Reject missing/unsupported extensions before `FileReader`/`arrayBuffer` work and prove the reader is not invoked. |

### Parser, performance, and architecture

| ID | Severity / confidence | Evidence | Finding and required outcome |
| --- | --- | --- | --- |
| AG-19 | Medium / High | `src/lib/googleJsonParser.ts:74-117,150-192,229-270`, worker equivalents | **The point cap does not bound intermediate segmented allocations.** Enforce one parse-wide point budget during ingestion in both main and worker paths. |
| AG-20 | Medium / Medium | `src/lib/googleJsonParser.ts:273-304`, `public/workers/trackParser.worker.js:277-321`, `src/lib/parser.ts:239-335` | **Depth preflight leaves a large suffix unchecked and worker parsing has no deadline.** Validate the complete input in the worker and provide bounded cancellation/recovery. |
| AG-21 | Medium / Medium | `src/components/MapView.tsx:745-762` | **Interactive rendering permanently pays `preserveDrawingBuffer` cost without a measured budget.** Profile representative mobile/low-end devices; if material, isolate export capture from the interactive map. |
| AG-22 | High / High | `src/lib/googleJsonParser.ts:7-13,285-304`, `public/workers/trackParser.worker.js:1-356,303-321`, `scripts/build-worker.mjs:3-8` | **Production Google parsing is manually duplicated and already drifted.** Establish one generated source of truth or deterministic behavioral parity; the build step must no longer report success without checking/generating anything. |
| AG-23 | Low / Medium | `src/components/MapView.tsx:66-1200` | **MapView combines pure geometry, MapLibre lifecycle, playback, and export orchestration.** Extract pure geometry/source helpers behind the existing handle boundary after correctness regressions are covered. |

### User experience, accessibility, and documentation

| ID | Severity / confidence | Evidence | Finding and required outcome |
| --- | --- | --- | --- |
| AG-24 | Medium / High | `src/components/GlobalToolbar.tsx:23-26`, `src/components/TrackToolbar.tsx:162-280`; reproduced static E2E | **Loaded desktop sessions lose language, unit, and theme controls.** Restore exactly one visible, accessible desktop settings surface without regressing mobile. |
| AG-25 | High / High | `src/lib/i18n.ts:20,180-189,537-546`, `README.md:42,64,72`, `.context/project/01-overview.md:38-45,80` | **Google import guidance presents legacy Takeout as a current equal path.** Make current iOS/Android device export primary, clearly label Takeout conditional/legacy, and avoid claiming support for unbounded “all variants.” |
| AG-26 | Medium / High | `src/components/JourneyCreator.tsx:607-614,737-765,795-815`, `src/lib/i18n.ts:270` | **Manual journeys cannot be named despite a naming-oriented label.** Add an optional prefilled route name and use it for the created `Track`; relabel the emoji group as a travel icon. |
| AG-27 | Medium / High | `README.md:226-228`; no root license file | **The repository claims MIT without shipping a license grant.** Resolve the intended license and copyright holder/year with the user; do not invent legal attribution. |
| AG-28 | Low / High | `README.md:145`; Playwright list output | **The README says 74 E2E tests while the suite lists 75.** Remove the brittle count or update it. |
| AG-29 | Medium / High | `src/components/JourneyCreator.tsx:741-764`; measured at 393×852 | **Journey emoji targets are approximately 33×44 px on iPhone width.** Enforce at least 44×44 px and verify wrapping at 320/390/430 px. |
| AG-30 | Low / High | `src/lib/i18n.ts:474`, `src/components/ExportPanel.tsx:408-411` | **Korean advanced export leaks the English connector “at.”** Localize the summary pattern or use a locale-neutral separator. |
| AG-31 | Medium / High | `src/components/ExportPanel.tsx:331-401`; reproduced accessibility snapshot | **All six export form controls have visible but unassociated labels.** Associate labels through `htmlFor`/`id` and assert named combobox/spinbutton roles. |

## Preserved diagnostic evidence

The direct static suite also reported a three-point timeline trimming count failure and additional failures later in the run. The available artifact does not yet prove a distinct root cause beyond AG-10/AG-11 and the deterministic AG-24 family, so it is preserved for targeted isolation rather than inflated into another finding.

## Authority and deferral boundaries

- AG-04 and AG-05 require explicit user confirmation because the user-level safety rule classifies any CI/CD pipeline modification as confirmation-gated. No workflow edit is authorized yet.
- AG-27 needs the user's intended license/copyright attribution. Adding guessed legal text or silently removing the stated grant would be inappropriate.
- AG-21 is a measurement task, not a confirmed regression. Its exit criterion is representative mobile/low-end frame-time and memory evidence.
- AG-23 is a maintenance-risk refactor. Its exit criterion is green source-data regressions for AG-07 through AG-09 before extraction begins.
- No correctness, security, or data-loss defect is deferred for convenience; only explicit authority gaps and evidence-gathering risks are separated.

## Cross-agent agreement

The strongest agreement was on five release blockers: trail rendering, export frame synchronization, the broken static smoke gate, vulnerable dependencies, and missing desktop settings. Parser duplication, async stale-completion, encoder cleanup, trim coordinate/state boundaries, impossible 4K choices, and the nonfunctional real-export check were each independently corroborated by multiple roles or direct browser/control-flow evidence.

## Agent failures

None. All twelve required role artifacts were produced at their exact paths and passed `git diff --check`.
