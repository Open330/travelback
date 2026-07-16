# Cycle 5 Implementation Plan — 2026-07-16

Source: `.context/reviews/_aggregate.md` (5 actionable findings against `bdfb1d7`, 4 authority/legal/evidence-gated carryovers, and 4 measured performance deferrals).

## Objective

Fix all five actionable Cycle 5 findings without deployment. Preserve only work that genuinely requires CI/CD authorization, legal input, representative hardware, or a separately measured performance redesign.

## Rules and constraints

- No deployment command, workflow dispatch, production mutation, CI/CD edit, or process termination.
- Use `apply_patch` for authored edits and preserve unrelated user changes.
- Do not disturb the existing local Playwright report viewer or any unrelated local process.
- Create GPG-signed Conventional Commit + gitmoji commits, one coherent fix per commit. Verify upstream before integration and push each completed fix; no deploy follows a push.
- Run focused regressions for every fix and the complete configured gate matrix: lint, typecheck, unit, high-severity audit, build, static smoke, dev E2E, and static E2E.
- `.github/workflows/deploy-pages.yml` remains read-only until the user explicitly authorizes CI/CD modification.
- Do not invent legal ownership, year, or license terms, and do not substitute browser emulation for representative-device performance evidence.
- The requested Ralph helper is not installed in this environment; execute the approved regression-first plan directly.

## Wave 0 — Style and interaction readiness

### P01 — Hydrate the current pose after every ready style (AG5-01)

- Severity/confidence: Medium / High
- Files: `src/components/MapView.tsx`, `e2e/travelback.spec.ts`
- Work: publish a monotonically changing ready-style revision only after the active map/style owns all route sources and layers. Key the current-pose transaction to that revision, or invoke an equivalent stale-safe idempotent hydrator, so it interpolates from the latest progress, updates the traveled trail plus HTML and GeoJSON markers together, and reapplies follow or authored-scene camera state. Ignore callbacks from replaced maps or superseded style requests.
- Acceptance: at paused nonzero progress, ordinary style replacement and actual Retry Map each retain route/trail state, matching HTML/GeoJSON current positions, and current automatic camera ownership. There is exactly one live canvas/HTML marker, and a stale style callback cannot mutate the current map.
- Focused verification: lint/typecheck plus a deterministic E2E that seeks before style replacement and asserts post-ready pose/camera state for both paths.
- Status: Completed (`06cee37`; regression coverage in `7e419d3`).

### P02 — Expose deterministic Journey Creator map readiness (AG5-04)

- Severity/confidence: Medium / High for test weakness; product defect unconfirmed
- Files: `src/components/JourneyCreator.tsx`, `e2e/travelback.spec.ts`
- Work: derive an observable interaction-ready state from the active map generation only after Journey layers and map listeners bind. Clear or supersede readiness when the generation/style is replaced, without losing waypoints. Update the retry regression to await that condition rather than `networkidle` plus a fixed delay. If interaction is intentionally unavailable while binding, communicate that state instead of accepting a silent early click.
- Acceptance: the active creator retry path waits on a real readiness signal, keeps existing waypoints, accepts the first post-ready map click, and passes at least 10 consecutive retries-disabled focused repetitions. No sleep increase or forced click is used.
- Status: Completed (`818c7c2`; regression coverage in `7e419d3`).

## Wave 1 — Responsive and localized workspace

### P03 — Reserve an unobscured attribution safe area (AG5-02)

- Severity/confidence: Medium / High
- Files: `src/app/globals.css`, `e2e/travelback.spec.ts`
- Work: position MapLibre attribution in a responsive safe area outside the loaded workspace's bottom timeline/elevation/playback surface and away from top toolbars. Keep attribution visible and preserve pointer/keyboard behavior, focus indication, and MapLibre expansion semantics.
- Acceptance: at 390×844 and 1440×1000, attribution intersects none of the playback statistics, time text, timeline, elevation, or control panel geometry; center-point hit testing resolves to attribution; keyboard focus and activation remain available; landing-map controls are unchanged.
- Status: Completed (`3ec8380`, `0904a2b`; regression coverage in `7e419d3`).

### P04 — Derive loaded status from the current locale (AG5-03)

- Severity/confidence: Low / High
- Files: `src/app/page.tsx`, `e2e/travelback.spec.ts`
- Work: store stable semantic announcement data such as the loaded track name, not a translated sentence captured at load time. Render the live status with the current translator so a locale switch updates both language context and content without replaying unrelated stale messages.
- Acceptance: load the sample in English, switch to Korean, and observe `document.lang="ko"`, Korean controls, and Korean `role=status` content containing the unchanged track name. Existing load/error announcements remain correct.
- Status: Completed (`57dfabc`; regression coverage in `7e419d3`).

## Wave 2 — Safe reviewer guidance

### P05 — Replace Mina's destructive/stale E2E runbook (AG5-05)

- Severity/confidence: Medium / High
- Files: `.context/agents/non-tech-traveler-reviewer.md`
- Work: delete the port-owner `kill -9` recommendation. Make `npm run test:e2e` the ordinary command and explain that the repository wrapper safely reuses the owned Next lock or selects an available port. Document a non-HTML focused diagnostic command only for a server/port explicitly owned by the reviewer. Correct conditional `reuseExistingServer` behavior and describe the current broad fixture/suite coverage without a brittle exact count.
- Acceptance: the runbook contains no process-killing command, no instruction to bypass port/lock ownership for the ordinary run, and its runner/fixture statements agree with `package.json`, `scripts/run-dev-e2e.mjs`, and `playwright.config.ts`.
- Status: Completed (`ec00ad6`).

## Carried-forward blocked work

### B01 — Add the unit test gate to Pages CI

- Original severity/confidence: High / High
- Exact file/scope: `.github/workflows/deploy-pages.yml:26-32`
- Block reason: user-level destructive-action policy classifies CI/CD modification as destructive and requires explicit confirmation before the specific edit. “No deployment” does not grant CI modification authority.
- Exit criterion: user explicitly authorizes editing the workflow; add `npm test` to the build job and validate syntax without dispatching or deploying.
- Status: Blocked; no file edit authorized.

### B02 — Narrow Pages workflow permissions

- Original severity/confidence: Medium / High
- Exact file/scope: `.github/workflows/deploy-pages.yml:8-45`
- Block reason: same explicit CI/CD authority boundary as B01.
- Exit criterion: user explicitly authorizes the workflow edit; scope read access to build and grant Pages/OIDC writes only to deploy, without dispatching or deploying.
- Status: Blocked; no file edit authorized.

### B03 — Resolve the README MIT claim without a root grant

- Original severity/confidence: Medium / High
- Exact file/scope: `README.md:225-227`, absent root `LICENSE`
- Block reason: intended license, copyright holder, and year/range are legal facts the repository does not establish.
- Exit criterion: the owner supplies exact license intent and attribution; add the grant or correct the README claim.
- Status: Blocked on owner input.

### B04 — Measure always-on preserved WebGL buffers on representative hardware

- Original severity/confidence: Medium / Medium
- Exact file/scope: `src/components/MapView.tsx:582-595`
- Block reason: browser emulation cannot establish low-end/mobile GPU, memory, battery, or thermal cost.
- Exit criterion: record comparative p50/p95 frame time and memory plus battery/thermal observations on representative hardware; isolate export capture only if impact is material.
- Status: Evidence-gated.

## Carried-forward performance deferrals

### D01 — Move per-frame playback progress off broad root React ownership

- Severity/confidence: High / High
- Exact scope: `src/lib/usePlaybackController.ts:98-155`; `src/app/page.tsx:180-232,577-595`
- Defer reason: requires a profiled ownership redesign, not an unmeasured local optimization.
- Exit criterion: profile representative tracks and implement an imperative/external-store boundary preserving seek, follow camera, scenes, and export.
- Status: Deferred to measured architecture work.

### D02 — Downsample elevation paths with visual guarantees

- Severity/confidence: Medium / High
- Exact scope: `src/components/ElevationProfile.tsx:20-60,91-133`
- Defer reason: no measured Cycle 5 regression; a correct solution needs a route-size target and endpoint/extrema guarantees.
- Exit criterion: profile near the supported point ceiling, implement distance-aware downsampling, and add visual regressions.
- Status: Deferred to measured performance work.

### D03 — Avoid full-route distance scans during waypoint drag previews

- Severity/confidence: Medium / High
- Exact scope: `src/components/JourneyCreator.tsx:194-198,363-373`
- Defer reason: requires an incremental or throttled preview design with exact terminal reconciliation.
- Exit criterion: implement and measure that design at a documented route-size target while preserving exact committed distance.
- Status: Deferred to measured performance work.

### D04 — Measure the second per-frame export idle check

- Severity/confidence: Medium / High
- Exact scope: `src/lib/useExportController.ts:174-239`; `src/lib/videoEncoder.ts:223-247`
- Defer reason: source inspection does not establish that the second wait is redundant for every style/render state, and frame correctness is higher risk than an unmeasured speedup.
- Exit criterion: profile real exports and demonstrate redundant waiting before altering the capture contract.
- Status: Deferred to measured performance work.

## Verification-driven repair record

- The first focused P01 regression exposed an initial style-load marker race; the style-ready transaction now attaches before that event can be missed.
- Five lint warning instances introduced during the readiness work were removed by keying retry/readiness state to the active generation, moving search cleanup into its owning action, declaring complete hook dependencies, and avoiding effect-only state synchronization. No warning suppression was added.
- Focused P01 style-pose coverage passed 1/1 after exercising ordinary replacement, a delayed superseded request, continued progress while a request fails, and the actual Retry Map path.
- Focused P02 readiness coverage passed 10/10 consecutive runs with retries disabled and without fixed sleeps or forced clicks.
- Focused P03 attribution coverage passed at both 390×844 and 1440×1000, including geometry, hit testing, focus, keyboard activation, repeated-key handling, and attribution-link access.
- Focused P04 locale coverage passed after an English load and Korean switch while preserving the track name.

## Required final gate matrix

1. `npm run lint` — passed with zero warnings.
2. `npm run typecheck` — passed.
3. `npm run test` — 366 tests passed across 15 files.
4. `npm audit --audit-level=high` — passed with zero vulnerabilities.
5. `npm run build` — passed with Next.js 16.2.10; generated-worker drift checking, TypeScript, static generation, and CSP hardening passed.
6. `npm run smoke:static` — passed.
7. `npm run test:e2e` — 94 passed, one expected opt-in real-export skip, zero retries or failures.
8. `npm run test:e2e:static:ci` — static smoke passed; 94 passed, one expected opt-in real-export skip, zero retries or failures.

The matrix ran from an isolated source copy of `7e419d3` so the pre-existing local Next process and its artifacts were not disturbed. The additional `TRAVELBACK_REAL_EXPORT=1` production-static WebCodecs/Mediabunny smoke passed 1/1 with retries disabled and produced a valid MP4. P01–P05 are complete; B01–B04 and D01–D04 retain their documented authority, legal-input, representative-evidence, or measured-redesign exit criteria. No deployment command, CI/CD edit, process termination, or production mutation occurred.

## Completion gate

Completed. P01–P05 were implemented, their focused regressions and every configured full gate passed, each coherent fix was GPG-signed and pushed, canonical review/plan artifacts describe the final state, and no deployment or blocked-scope mutation occurred.
