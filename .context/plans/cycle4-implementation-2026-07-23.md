# Cycle 4 Review Remediation Plan — 2026-07-23

Status: **Completed with one recorded gate error**

Source review: `.context/reviews/_aggregate.md`
Reviewed base: `975dded34c849db4eb972221ed9483d3d64fb81d`
Branch: `review-plan-fix/no-deploy-20260723`
Deployment mode: **none**

## Scope and policy

- Schedule all 9 new aggregate findings. **No Cycle 4 finding is deferred.**
- Preserve the three explicit native/host-capability deferrals without
  relabeling or expanding them.
- Retain `.context/plans/user-injected/pending-next-cycle.md`; its final-loop
  cleanup task is not due during Cycle 4.
- Archive the fully completed Cycle 3 implementation record.
- Use Node 24, Next 16, React 19, and strict TypeScript under the current
  `.context/` rules.
- Implement in fine-grained, semantic, gitmoji-prefixed, GPG-signed commits.
  Push only `review-plan-fix/no-deploy-20260723`.
- The Pages workflow triggers only on `main`; verify that fact before every
  push, never push this cycle to `main`, and do not run a deployment command.
- Ralph is unavailable in this environment. Prompt 3 uses a faithful iterative
  fallback: bounded implementation workstreams, focused regressions, complete
  configured gates, plan updates, signed commits, and exact branch pushes.

## Process and browser hygiene

For every browser, Playwright, or server execution:

1. Inventory pre-existing relevant processes and listeners, including exact
   PID, PPID, PGID, UID, start token, command/profile, and ports 3099, 4173,
   and 4183.
2. Give the run a unique marker and record the exact owned root, descendants,
   browser profile, and listener.
3. Run browser gates strictly sequentially.
4. Let each supervised command perform its normal cleanup. If intervention is
   required, target only identities whose PID, UID, start token, ancestry or
   inherited marker, and ownership were validated for that run.
5. Verify every exact owned identity, profile/lock, and listener is absent
   before starting the next browser gate.
6. Never use `agent-browser close`, a global/shared close, `pkill`, `killall`,
   name-only killing, or a broad process match.
7. Leave every pre-existing user Chrome, shared agent-browser, unrelated
   Playwright, and unrelated development server untouched.

A failed browser gate does not terminate the outer review-plan-fix loop:
capture its evidence, complete exact owned cleanup, continue to the next
configured gate, and report any unresolved error for the following cycle.

## Implementation workstreams

### P01 — Publish bounded renderer geometry

Finding: **AGG4-01** (Medium/High)

Primary files:

- `src/lib/map-geometry.ts`
- `src/lib/map-geometry.test.ts`
- `src/components/MapView.tsx` only if the prepared-geometry contract requires it

Implementation:

- Preserve the unbounded wrapped graph as internal traversal chronology.
- Derive renderer segments by splitting at world-copy changes and rebasing each
  part around one bounded anchor domain.
- Preserve seam continuity, disconnected segments, original point ranges, and
  active-head ownership without artificial connectors.
- Use bounded renderer geometry for route, completed trail, active head,
  display bounds, fit, and reference-grid coverage.

Acceptance:

- Every published longitude stays inside the documented MapLibre-safe domain.
- Simple east/west antimeridian routes retain a compact fit.
- Repeated laps and disconnected drift retain late route/trail/head features.
- The installed `@maplibre/geojson-vt` retains every expected early and late
  feature within buffered tile extent.
- Marker and active head remain geographically equivalent at late progress.

### P02 — Serialize track replacement with export settlement

Finding: **AGG4-02** (Medium/High)

Primary files:

- `src/lib/useExportController.ts`
- `src/lib/useExportController.test.ts`
- `src/components/FileUpload.tsx`
- `src/app/page.tsx`

Implementation:

- Add an export lease-settlement promise retained through map/progress cleanup.
- Expose abort-and-wait for session replacement, with replacement-driven
  cancellation remaining silent.
- Await settlement before clearing artifacts or committing a new track.
- Allow `FileUpload.onTrackLoaded` to be asynchronous and keep its busy state
  until the session handoff finishes.

Acceptance:

- A held export aborts and completely settles before track B commits.
- No track-A result, success/cancel toast, progress write, or map cleanup can
  publish after track B becomes current.
- Ordinary user cancellation still announces cancellation.
- Duplicate export calls remain serialized and restart remains possible after
  cleanup.

### P03 — Make XML depth scanning lexical-context aware

Finding: **AGG4-03** (Medium/High)

Primary files:

- `src/lib/parser.ts`
- `src/lib/parser.test.ts`

Implementation:

- Replace raw-text regex counting with a linear scanner.
- Skip comments, CDATA, processing instructions, and declarations.
- Honor quoted delimiters, count real start/end/self-closing tags only, and
  retain existing tag/depth budgets and raw entity/DOCTYPE rejection.
- Bound mismatch bookkeeping so malicious invalid XML cannot allocate an
  unbounded auxiliary stack.

Acceptance:

- More than 128 real nested levels with fake comment closings are rejected.
- Shallow comment/CDATA tag text and quoted `>` values are accepted.
- Self-closing tags do not increase depth.
- Both GPX and KML entry points carry the regression.

### P04 — Preserve forced-survivor cleanup evidence

Finding: **AGG4-04** (Medium/High)

Primary files:

- `scripts/e2e-process-supervisor.mjs`
- `scripts/e2e-process-supervisor.test.mjs`

Implementation:

- Read the optional cleanup diagnostic through a total helper.
- Keep TERM/KILL forced-survivor evidence primary and attach or aggregate a
  throwing accessor failure.
- Preserve existing cleanup-error precedence when no survivor exists.

Acceptance:

- Direct-helper and contained-provider regressions assert TERM then KILL,
  survivor wording, diagnostic cause, tracker stop, and provider disposal.
- A throwing `cleanupError()` accessor cannot replace the cleanup outcome.
- Existing provider and POSIX contracts remain unchanged outside diagnostics.

### P05 — Add a real-Chromium negative cleanup integration

Finding: **AGG4-05** (Medium/High)

Primary files:

- `scripts/e2e-process-supervisor.test.mjs`
- a minimal dedicated fixture under `scripts/fixtures/`

Implementation:

- Add one serialized POSIX-only fixture that launches the installed Playwright
  Chromium and an exact unique listener/profile under the supervisor marker.
- Prove both are live, deliberately return nonzero, and assert exact
  PID/UID/start-token/marker, profile-lock, and listener absence afterward.
- Keep an unrelated sentinel alive throughout and provide exact bounded
  emergency cleanup for the fixture itself.
- Retain the current Windows Job Object refusal without relitigating the three
  native/host deferrals.

Acceptance:

- The intentional child failure is preserved.
- The exact browser/server tree, profile locks, and listener are absent after
  the wrapper finishes.
- The unrelated sentinel retains the same identity until its own exact
  teardown.

### P06 — Restore the manual camera after provisional Journey cancellation

Finding: **AGG4-06** (Low/High)

Primary files:

- `src/components/MapView.tsx`
- `src/app/page.tsx`
- `e2e/travelback.spec.ts`

Implementation:

- Add narrow handle methods to capture the live camera and queue a one-shot
  restore through track hydration.
- Snapshot only a manual, Follow-disabled pose before New Route.
- Apply the snapshot on Cancel after the retained track hydrates.
- Clear it when a replacement commits or the session resets.

Acceptance:

- New Route → Cancel restores center, zoom, pitch, and bearing within MapLibre
  tolerances when Follow is off.
- The prior route, progress, scenes, layers, and marker still restore.
- Confirmed replacement and landing/reset flows never inherit the old pose.

### P07 — Correct Closeup documentation

Finding: **AGG4-07** (Low/High)

Primary files:

- `README.md`
- `.context/project/02-architecture.md`

Implementation and acceptance:

- Replace “Street-level view” with an accurate tight route closeup and shallow
  pitch description in both tables.
- Keep the wording consistent with the abstract local-map privacy boundary and
  current in-app description.

### P08 — Name Download MP4 exactly in save recovery

Finding: **AGG4-08** (Low/High)

Primary files:

- `src/lib/i18n.ts`
- a focused translation/controller test

Implementation:

- Update all five save-failure translations to name the exact localized
  Download MP4 action.
- Add a state-specific assertion tying recovery copy to the action label.

Acceptance:

- English, Korean, Japanese, Chinese, and Spanish messages use their exact
  Download MP4 action text.
- Other export success, failure, and cancellation copy is unchanged.

### P09 — Stabilize the mobile Journey geometry regression

Finding: **AGG4-09** (Low/Medium-high)

Primary file:

- `e2e/travelback.spec.ts`

Implementation:

- After each responsive resize, prove the Draw Route target is stable and
  owns its center hit point.
- Use a normal semantic click rather than `force`.
- Assert that Import Guide remains absent before measuring Journey controls.

Acceptance:

- The 320, 390, and 430 px width loop consistently opens Journey Creator.
- The test still verifies all required 44×44 targets and panel containment.
- The fix does not hide a product failure through retries or conditional skip.

## Verification gates

Focused regressions run immediately after each workstream. Before completion,
run every configured gate:

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`
5. `npm run test:e2e`
6. `npm run test:e2e:static:ci`
7. `npm audit --audit-level=high`
8. `npm run test:e2e:static:real-mp4`

The focused real-MP4 gate must retain its structural box, AVC track, packet and
duration, metadata, first/last decode, canvas-read, and download assertions.
An expected real-export skip in either matrix does not replace this gate.

The development matrix, static matrix, and isolated real-MP4 gate run
sequentially with an ownership inventory before each and an exact
survivor/profile/listener scan after each. A failed gate is repaired when
possible, recorded either way, and never used as a reason to stop the outer
cycle sequence.

## Completion log

All nine findings were implemented:

- Renderer-facing route, bounds, trail, and active-head geometry now stay in a
  bounded world-copy domain while the internal wrapped traversal remains
  unbounded. The installed `@maplibre/geojson-vt` regressions retain early and
  late repeated-lap features.
- Track replacement now silently aborts and awaits the complete export lease,
  including map/progress cleanup, before committing the next session.
- XML depth enforcement now scans lexical elements and ignores comments,
  CDATA, processing instructions, declarations, quoted delimiters, and
  self-closing tags correctly.
- A throwing cleanup diagnostic can no longer mask forced-survivor evidence.
  A dedicated real-Chromium fixture exercises an intentional nonzero child,
  unique listener/profile, exact identities, and an unrelated sentinel.
- Cancelling a provisional New Route restores a captured Follow-off camera;
  confirmed replacements still discard the old pose.
- Closeup documentation and save-recovery copy now match the implemented
  camera and exact Download MP4 action.
- The mobile Journey regression verifies center hit ownership and uses a
  normal semantic click, eliminating the adjacent Import Guide false action.

Focused evidence:

- Geometry: 35/35 passed.
- Parser: 158/158 passed.
- Export/FileUpload: 23/23 passed.
- i18n: 27/27 passed.
- Post-implementation application audit: 231 focused tests, ESLint, TypeScript,
  and `git diff --check` passed with no actionable finding.
- Cleanup diagnostic direct and contained-provider regressions: 2/2 passed.

Configured gates:

1. `npm run lint` — passed.
2. `npm run typecheck` — passed.
3. `npm test` — **recorded failure**: all 565 unit tests passed and 39/40
   process tests passed. The new Chromium test reached its real browser,
   listener, profile, and exact cleanup, then its safety `finally` rejected
   persistent LevelDB `LOCK` filenames after every owning identity was already
   absent. The fixture-owned finalizer was corrected to remove and verify its
   exact profile directory, but was not retried again after the explicit retry
   bound; the outer cycle continued as required.
4. `npm run build` — passed, including worker parity and hardened static output.
5. `npm run test:e2e` — 115 passed, 1 intentional real-export skip.
6. `npm run test:e2e:static:ci` — static smoke passed; 115 passed, 1
   intentional real-export skip.
7. `npm audit --audit-level=high` — 0 vulnerabilities.
8. `npm run test:e2e:static:real-mp4` — 1/1 passed with structural boxes, AVC
   track, packet/duration, metadata, first/last decode, canvas-read, and
   download assertions retained.

Browser/process evidence:

- Development owner
  `da1eedb77622a78fa3d6d48af2a1eb9bb4a7c1fcb491050b`: exact wrapper,
  Playwright, Next, worker, and Chromium identities absent; profile
  `playwright_chromiumdev_profile-fvGDxG` absent; port 3099 clear.
- Static owner
  `a177cde327812d814089a50def2e9247e8f403c6c92db383`: exact wrapper,
  Playwright, server, worker, and Chromium identities absent; profile
  `playwright_chromiumdev_profile-MNy8An` absent; port 4173 clear.
- Real-MP4 owner
  `a27fe4ba79892be695a57ffe16d3e98e0b7b54d2f16e3b96`: exact wrapper,
  Playwright, server, worker, and Chromium identities absent; profile
  `playwright_chromiumdev_profile-dxaOSG` absent; port 4173 clear.
- Every failed focused Chromium-fixture attempt also completed its exact
  `finally` cleanup. Final scans found no Cycle 4 fixture/browser process,
  profile, lock, or listener on ports 3099, 4173, or 4183. Pre-existing user
  Chrome rooted at PID 1368 was never signalled or otherwise modified.

Eight fine-grained implementation commits plus this review-record commit were
signed and pushed only to `review-plan-fix/no-deploy-20260723`. The Pages
workflow remained main-only, `main` was never pushed, and no deployment command
ran.
