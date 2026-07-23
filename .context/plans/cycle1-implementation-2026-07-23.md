# Cycle 1 Review Remediation Plan — 2026-07-23

Status: **Completed — 2026-07-23**

Source review: `.context/reviews/_aggregate.md`
Reviewed base: `994820a71b0b87de78fdfd2a1fd2c17e7ad3b516`
Deployment mode: **none**

## Completion record

- Completed all 20 planned implementation workstreams covering 33 of the 36
  aggregate findings.
- Preserved D01-D03 with their original severity/confidence and explicit
  evidence, architecture, licensing, and product-decision exit criteria.
- Published the completed cycle only on
  `review-plan-fix/no-deploy-20260723`; no later cycle commit was pushed to
  `main`.
- No deployment occurred. Fourteen early signed commits reached `main` before
  the existing push-triggered Pages workflow was noticed: 13 workflow runs
  failed at the required production audit before build/artifact/deploy, and
  one run was cancelled before those stages. Deployment API inspection found
  no deployment for any cycle SHA.

## Implemented results

- **P01-P05:** upgraded Next/ESLint/Sharp to patched releases; added an exact
  cross-platform E2E process supervisor and Travelback endpoint validation;
  made Playwright/CI gates retries-free, non-interactive, diagnostic, and
  real-MP4 complete; minimized workflow permissions and pinned actions; and
  hardened loopback static serving, file validation, and literal CSP hashing.
- **P06-P09:** made export DPR/error/save behavior deterministic, preserved
  existing sessions across provisional route creation, kept Export Again in
  its dialog, and synchronously cancelled queued playback work.
- **P10-P13:** bounded elevation geometry, coalesced Journey Creator and Scene
  Editor gesture work, and reused prepared wrapped map geometry.
- **P14-P15:** corrected architecture/offline/test-stub documentation, locale
  detection, accepted-format copy, and ground-camera naming.
- **P16-P20:** measured responsive map-control reservations; made short Journey
  flows completeable; uniquely labelled scene camera fields; split light-mode
  contrast/focus tokens; and removed short-landing/loaded-header collisions.
- Added unit, process-tree, component, static-smoke, and browser regressions
  for the repaired behaviors. A full development gate found one remaining
  844×390 attribution/navigation collision; the responsive toolbar/map-control
  repair was then focused-tested and passed both full browser modes.

## Final gate evidence

1. `npm run lint` — passed.
2. `npm run typecheck` — passed.
3. `npm test` — passed: 24 Vitest files / 520 tests plus 7 process-supervisor
   regressions.
4. `npm audit --omit=dev` — passed with zero vulnerabilities.
5. `npm run build` — passed on Next 16.2.11; worker parity, TypeScript, static
   export, and CSP hardening across three HTML files passed. Repeated after the
   final responsive fix.
6. `npm run test:e2e` — final full run passed: 113 passed, 1 skipped, 0 failed.
7. Exact development root/group exited; port 3099 and generated profile were
   clear. A dead-PID Next-generated lock was removed only after verifying its
   recorded PID absent and port 3099 free.
8. `npm run test:e2e:static:ci` — static smoke passed, then 113 passed,
   1 skipped, 0 failed.
9. Exact static root/group exited; ports 4173/4183 and the generated profile
   were clear.
10. `npm run test:e2e:static:real-mp4` — passed: 1 passed, 0 failed.
11. Final exact cleanup found no cycle-owned browser, Playwright, Chrome/
    Chromium, server, ffmpeg, worker, profile, or listening port. Concurrent
    headless shells were traced by parent ancestry to the unrelated
    `xylolabs-panel-demo` Playwright run and deliberately left untouched.
    Pre-existing user Chrome PID/PGID 1368/1368 remained unchanged.

## Recoverable execution notes

- A reviewer used a named `agent-browser close`; it also stopped the
  pre-existing shared agent-browser daemon PID 45037 and its Chrome PID 45069.
  The user's independent Chrome PID 1368 survived. No shared/global browser
  close was used afterward.
- The first Journey drag regression used an overly exact normalized-longitude
  assertion and was corrected to a tolerance assertion.
- The first short-Journey CSS fixture used jsdom-unsupported `max()` and was
  simplified; an unsupported Playwright locator helper in the first E2E
  typecheck was replaced.
- The first hardened static smoke attempt had no built `out/sample-trip.gpx`
  and spawned no server; the completed production build supplied the fixture
  and the authoritative smoke passed.
- The first full development E2E run exposed the landscape map-control
  collision. Its first focused repair still placed navigation under Load New
  File; the second repair passed focused, full development, and full static
  gates.
- Normal and force-cancel requests for the final accidentally triggered Pages
  run initially returned HTTP 500; the run subsequently reached
  `completed/cancelled`. No cycle deployment was created.

## Rules applied

- Repository rules come from `.context/`; the repository explicitly says not
  to create/use `CLAUDE.md`.
- Commits must be fine-grained, semantic, gitmoji-prefixed, and GPG-signed.
- Every aggregate finding is mapped below. No finding is silently dropped.
- Security, correctness, and data-loss findings are scheduled, not deferred.
- Browser gates must run strictly sequentially. Before each gate, inventory
  pre-existing relevant processes; after it, close contexts/drivers and
  terminate/wait for only exact owned PIDs/process groups. Never use `pkill`,
  `killall`, broad name matching, or a global/shared agent-browser close.
- Do not deploy.

## Implementation work

### P01 — Repair vulnerable production dependencies

Findings: **AGG-06**

- Upgrade Next and `eslint-config-next` together to the current patched stable
  compatible release.
- Ensure the installed Sharp tree is at a patched release.
- Keep the high-severity audit gate; do not suppress advisories.
- Verify lockfile integrity, `npm audit --omit=dev`, all configured gates, and
  production static output.

Acceptance:

- `npm audit --omit=dev` reports zero high/critical findings.
- Next/ESLint/Sharp remain compatible with static export and Node 24.

### P02 — Give E2E wrappers exact, bidirectional process ownership

Findings: **AGG-01**, **AGG-16**

- Extract a shared Playwright subprocess supervisor used by development and
  static wrappers.
- Track exact owned descendants, relay wrapper signals, wait for graceful
  teardown, and escalate only exact survivors after a bounded deadline.
- Preserve normal exit/signal status and handle spawn errors/repeated signals
  idempotently.
- Verify a live `.next/dev/lock` endpoint is actually Travelback through a
  stable app marker before reusing it.
- Add browser-free fake-child/grandchild regressions for normal/nonzero exit,
  SIGINT/SIGTERM, forced escalation, and unrelated-process preservation.

Acceptance:

- Interrupting either wrapper leaves no owned child/grandchild.
- Unrelated/pre-existing sentinels survive.
- An invalid live lock is never reused.

### P03 — Make browser gates deterministic and CI-complete

Findings: **AGG-02**, **AGG-03**, **AGG-04**, **AGG-05**

- Set both HTML reporters to `open: 'never'`.
- Make authoritative Playwright gates retries-free and retain useful
  first-failure artifacts.
- Add `npm test` to the Pages build before artifact creation.
- Add a focused required static H.264 real-MP4 gate with
  `TRAVELBACK_REAL_EXPORT=1`.
- Upload Playwright report/test-result diagnostics with `if: always()` and
  bounded retention.

Acceptance:

- A failing TTY invocation exits nonzero without a report server.
- No automatic retry can hide a failure.
- CI runs 472+ unit/component tests and a real MP4 case.

### P04 — Minimize Pages workflow authority and pin actions

Findings: **AGG-07**

- Scope build permissions to `contents: read`.
- Scope `pages: write` and `id-token: write` to the deploy job only.
- Pin checkout, setup-node, Pages artifact, and Pages deployment actions to
  immutable full commit SHAs with readable version comments.

Acceptance:

- Build has no Pages/OIDC authority.
- Every external action reference is immutable.

### P05 — Harden local static serving and CSP hashing

Findings: **AGG-08**, **AGG-09**

- Bind the preview server to `127.0.0.1` by default; require explicit host
  opt-in for LAN use.
- Validate candidate files against the real output root and stream only a
  validated file descriptor without following a final symlink where supported.
- Hash exact literal inline-script bodies; remove script entity decoding.
- Extend smoke/regression coverage with an out-of-tree symlink and
  entity-shaped raw script text.

Acceptance:

- Symlink escape returns a denial and cannot read the target.
- Literal script hashes match browser CSP semantics.

### P06 — Make export resolution, errors, and saving deterministic

Findings: **AGG-10**, **AGG-11**, **AGG-12**

- Force MapLibre pixel ratio 1 during export and restore the prior ratio in
  every cleanup path.
- Reserve `AbortError` for a signaled export controller.
- Convert missing-map, render-timeout, and capture-canvas failures to typed,
  localized export errors.
- Separate save-picker acquisition from writable creation/write/close.
  Best-effort abort a failed writable, retain the completed in-memory video,
  and show a localized save error instead of silently starting a duplicate.
- Add DPR restoration, timeout/map-loss/capture, and writable failure tests.

Acceptance:

- A 1080×1920 export uses a 1080×1920 source canvas at DPR 1/2/3 and restores
  the interactive ratio.
- Each failure produces accurate recovery copy and no unexpected download.

### P07 — Preserve the current journey until replacement is committed

Findings: **AGG-13**

- Treat Journey Creator as a provisional replacement while a track session is
  loaded.
- Do not clear track, trim, scenes, playback, or export result until Done
  accepts a new route.
- Cancel returns naturally to the untouched workspace.
- Retain the existing empty-session creation behavior.

Acceptance:

- Imported and manually created sessions survive New → Cancel exactly.
- Done replaces the session and resets prior artifacts once.

### P08 — Keep “Export Again” inside the export flow

Findings: **AGG-14**

- Reset export result/state without closing the panel.
- Restore focus to the idle heading or first setting.
- Add component and browser coverage.

Acceptance:

- Export Again returns to usable settings in the same open dialog.

### P09 — Cancel queued playback work synchronously

Findings: **AGG-15**

- Clear playing/first-frame refs and cancel RAF/hidden-tab timer work in
  pause/reset/session-reset before updating React state.
- Add a fake-scheduler race regression.

Acceptance:

- A previously queued callback cannot overwrite a reset or schedule a
  successor.

### P10 — Bound elevation geometry at supported input scale

Findings: **AGG-18**

- Downsample in distance/index space to a fixed chart budget before string
  construction.
- Preserve segment gaps, first/last points, and bucket extrema.
- Reuse one coordinate representation and avoid duplicate area parsing where
  possible.
- Add a 250,000-point regression that asserts bounded path complexity and
  extrema/gap retention without brittle wall-clock thresholds.

Acceptance:

- SVG coordinate count is bounded independently of input ceiling.
- Visible endpoints, extrema, progress, and gap semantics remain correct.

### P11 — Coalesce Journey Creator drag work

Findings: **AGG-19**

- Coalesce visual drag previews to at most one animation frame.
- Maintain total distance from the moved point’s adjacent segments during
  preview and publish exact full geometry/state on terminal events.
- Cancel queued work on blur/cancel/unmount.

Acceptance:

- Pointer bursts produce bounded map/state publications.
- Terminal geometry and distance equal a full recomputation.

### P12 — Reuse one prepared wrapped-geometry graph

Findings: **AGG-20**

- Prepare wrapped segments, route geometry, and trail chunks once per track
  identity/generation.
- Reuse the prepared object for style hydration/retry and release it on track
  replacement.
- Add antimeridian/segmentation and wrapping-pass-count regressions.

Acceptance:

- One track preparation performs one wrapping pass.
- Route/trail geometry remains byte-equivalent in covered cases.

### P13 — Coalesce Scene Editor gesture publication

Findings: **AGG-21**

- Keep transient pointer/range values local or in a narrow draft boundary.
- Coalesce camera preview to one animation frame.
- Commit normalized root scenes/export invalidation once per terminal gesture,
  while preserving immediate keyboard semantics and rollback.
- Add pointer-burst/keyboard regressions.

Acceptance:

- Pointer bursts cause bounded parent publications and one terminal commit.
- Undo, keyboard editing, focus, and exact scene values remain correct.

### P14 — Correct current architecture/developer documentation

Findings: **AGG-23**, **AGG-24**, **AGG-25**, **AGG-26**

- Replace the unsupported offline-after-first-paint promise with accurate
  same-origin/local-processing language.
- Document empty-scene follow behavior and the opt-in Cinematic preset.
- Document ErrorBoundary as the class-component exception.
- Centralize or derive the 22-byte export test payload description.

Acceptance:

- Documentation and diagnostics match executable behavior without duplicated
  false invariants.

### P15 — Correct locale detection and traveler-facing format/camera copy

Findings: **AGG-27**, **AGG-28**, **AGG-29**

- Normalize Korean locale matching for `ko` and `ko-*`.
- Show `.json`, `.gpx`, and `.kml` on the landing screen in every locale and
  say named apps must export one of them.
- Rename the ground camera mode from misleading “Street View” wording to a
  truthful localized “Ground-level follow” equivalent.
- Add locale-tag and copy parity tests.

Acceptance:

- Korean regional tags select Korean.
- All locales expose exact formats and truthful camera semantics.

### P16 — Keep map controls/attribution above a measured bottom stack

Findings: **AGG-31**

- Observe the loaded bottom stack height and expose it through a scoped CSS
  custom property.
- Position MapLibre controls/attribution from the measured value, including
  safe-area and short/landscape constraints.
- Add 320×480, 320×568, and 844×390 bounding/hit-ownership tests.

Acceptance:

- Attribution and all navigation controls remain visible and pointer-owned.

### P17 — Make Journey Creator completeable at short heights

Findings: **AGG-32**

- Bound the panel to available `100dvh` space with safe-area insets.
- Give content an internal scroll region and keep terminal actions reachable
  with sticky layout.
- Test complete two-point → Done flows at 320×480 and 844×390.

Acceptance:

- Done/Clear/Cancel stay visible, focusable, and hittable without document
  overflow.

### P18 — Name every scene camera-mode combobox

Findings: **AGG-33**

- Add localized scene-specific visible or programmatic labels.
- Query fields by role and accessible name in component/E2E tests.

Acceptance:

- Each combobox exposes a unique, useful accessible name.

### P19 — Split light-mode accent, text, and focus colors

Findings: **AGG-34**

- Keep bright cyan for decorative/fill use where foreground contrast passes.
- Add darker light-mode semantic-text and focus-indicator tokens.
- Update affected microcopy/actions/focus styles.
- Extend contrast tests across canvas and glass surfaces.

Acceptance:

- Normal text reaches 4.5:1 and focus appearance reaches 3:1 in light mode.

### P20 — Remove short landing and desktop header collisions

Findings: **AGG-35**, **AGG-36**

- Reserve toolbar space or move landing settings into flow at short heights.
- Place loaded title and primary actions in a shared layout or reserve actual
  toolbar width instead of a fixed 224px.
- Add short-height landing and long-title desktop tests at 768/1024/1440.

Acceptance:

- Hit testing and bounding boxes show no overlap at covered sizes.

## Explicit deferred findings

These are existing review findings only. Their severity/confidence is
preserved. None is a security, correctness, or data-loss finding.

### D01 — Root playback publication architecture

Aggregate finding: **AGG-17**
Original severity/confidence: **High / High**
Citation: `src/lib/usePlaybackController.ts:51-54,110-167`;
`src/app/page.tsx:176-194,592-610,651-696`

Reason: the confirmed 60 Hz root update is an architecture/performance cost,
but changing its ownership without representative frame data risks lowering
map animation fidelity, seek exactness, screen-reader updates, hidden-tab
fallback, and export suspension simultaneously. A blind throttle would mask
the cost by degrading behavior.

Exit criterion: reopen when a repeatable production-build profile captures
React commits plus p50/p95 frame time on one representative low-power mobile
device and desktop, and a proposed narrow external/imperative progress
boundary has tests for seek, end, visibility, export, and accessibility.

### D02 — Session-wide `preserveDrawingBuffer`

Aggregate finding: **AGG-22**
Original severity/confidence: **Medium / Medium**
Citation: `src/components/MapView.tsx:892-903`

Reason: policy presence is confirmed, but material device impact is explicitly
unmeasured. WebGL context attributes cannot be toggled after creation, so
changing it requires a second-map/export-context design and could break frame
capture.

Exit criterion: reopen when production-build on/off measurements on a
representative low-end/mobile GPU show a material frame-time, memory, thermal,
or battery delta, or when an export-context design proves equivalent output
and cleanup.

### D03 — Offline geographic context

Aggregate finding: **AGG-30**
Original severity/confidence: **Critical / High**
Citation: `public/map-styles/*.json:4,16-28`;
`src/components/MapView.tsx:291-320`

Reason: implementing the finding requires a product choice and a legally
approved geographic dataset. The repository provides no approved source,
license/attribution decision, target asset budget, simplification policy,
locale/label scope, or decision between a geography layer and an explicit
Private Grid product mode. Inventing or downloading a dataset would create
unreviewed licensing, bundle-size, attribution, and privacy commitments.
Severity is not downgraded.

Exit criterion: reopen immediately when the owner approves either:

1. a named dataset/source with compatible license, attribution, target
   compressed size, simplification/detail, city-label/localization policy, and
   offline update strategy; or
2. an explicit product decision that Travelback is Private Grid only, with
   approved naming/copy and acceptance that geographic context is out of
   scope.

## User-injected process and cleanup requirements

- Deployment remains prohibited.
- The prior durable final-loop cleanup item
  `.context/plans/user-injected/pending-next-cycle.md#U-2026-07-17-01`
  remains open. Do not delete its listed run-created trees during this cycle;
  the outer loop owns final-stop cleanup after provenance is revalidated.
- This cycle must nevertheless finish with zero cycle-owned browser,
  Playwright, Chrome/Chromium, driver, Next/static server, ffmpeg, or worker
  processes.
- The review incident in which a named `agent-browser close` also stopped the
  pre-existing shared daemon is recorded in the aggregate and cycle error.
  Do not use any shared/global browser close during implementation.

## Required final gates

Run against the whole repository, in order:

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. `npm audit --omit=dev`
5. `npm run build`
6. `npm run test:e2e`
7. verify exact development browser/server ownership is gone
8. `npm run test:e2e:static:ci`
9. verify exact static browser/server ownership is gone
10. the focused real-MP4 static gate added by P03
11. verify every exact cycle-owned process/profile/port is gone

No browser gate starts before the preceding gate and cleanup verification
finish.

## Finding disposition matrix

| Finding | Disposition |
|---|---|
| AGG-01 | P02 |
| AGG-02 | P03 |
| AGG-03 | P03 |
| AGG-04 | P03 |
| AGG-05 | P03 |
| AGG-06 | P01 |
| AGG-07 | P04 |
| AGG-08 | P05 |
| AGG-09 | P05 |
| AGG-10 | P06 |
| AGG-11 | P06 |
| AGG-12 | P06 |
| AGG-13 | P07 |
| AGG-14 | P08 |
| AGG-15 | P09 |
| AGG-16 | P02 |
| AGG-17 | D01 |
| AGG-18 | P10 |
| AGG-19 | P11 |
| AGG-20 | P12 |
| AGG-21 | P13 |
| AGG-22 | D02 |
| AGG-23 | P14 |
| AGG-24 | P14 |
| AGG-25 | P14 |
| AGG-26 | P14 |
| AGG-27 | P15 |
| AGG-28 | P15 |
| AGG-29 | P15 |
| AGG-30 | D03 |
| AGG-31 | P16 |
| AGG-32 | P17 |
| AGG-33 | P18 |
| AGG-34 | P19 |
| AGG-35 | P20 |
| AGG-36 | P20 |
