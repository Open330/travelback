# Cycle 8 Review Remediation Plan — 2026-07-24

Status: **Completed and archived**

Source review: `.context/reviews/_aggregate.md`
Reviewed base: `9b3343cd0c01fabb84dc47f4f34c28238d98a99e`
Branch: `review-plan-fix/no-deploy-20260723`
Deployment mode: **none**

## Scope and policy

- Schedule the single new aggregate finding. **No Cycle 8 finding is
  deferred.**
- Preserve the three explicit native/host-capability deferrals without
  relabeling, expanding, or attempting to solve them.
- Retain `.context/plans/user-injected/pending-next-cycle.md`; its cleanup
  task is due only when the outer loop reaches its final stop condition.
- Implement in fine-grained semantic, gitmoji-prefixed, GPG-signed commits.
  Push only `review-plan-fix/no-deploy-20260723`.
- Never push `main`, run a deployment command, dispatch a workflow, or change
  deployment/access state.
- Ralph is unavailable. Prompt 3 uses the established iterative fallback:
  bounded implementation, focused regressions, complete gates, exact
  browser/process ownership audits, plan completion, signed commits, and
  branch-only pushes.
- A failed workstream or gate is recorded and repaired when possible, but
  never terminates this cycle or the outer loop. Every remaining gate is
  still attempted.

## Process and browser hygiene

The Cycle 8 parent exclusively owns full-suite and browser-capable commands.
Descendants may run only explicit file-scoped Vitest, lint, typecheck,
syntax, worker-parity, and diff checks.

For every supervised full-suite, browser, Playwright, or server execution:

1. Inventory pre-existing relevant processes and listeners, recording exact
   PID, PPID, PGID, UID, start token, command/profile, and ports 3099, 4173,
   and 4183. Inspect `.next/dev/lock`.
2. Give the run a cryptographically unique marker, temporary root/profile,
   and explicit unique port. Record the exact run root, descendants, browser
   identities, listener, profile, and locks.
3. Run the unit/process suite, development E2E, static E2E, and real-MP4 gate
   strictly sequentially. Run `npm test` once unless a gate-driven correction
   requires one supervised rerun.
4. Let supervised cleanup finish. If intervention is required, revalidate
   exact PID, UID, start token, ancestry/marker, and ownership; signal only
   those identities with TERM, bounded wait, then KILL only if necessary.
5. Prove the exact marker, identities, profile holders/locks, listener,
   temporary root, and any generated Next lock are absent before the next
   browser-capable command.
6. Never use `agent-browser close`, `pkill`, `killall`, name-only signaling,
   broad process matching/deletion, or shared browser control.
7. Preserve protected user Chrome PID/PGID 1368 and every unrelated browser,
   Playwright, agent-browser, and server process. Never signal an unrelated
   default-port owner.

Prompt 1 launched no browser or server. Its pre-review audit found ports
3099, 4173, and 4183 free, `.next/dev/lock` absent, and protected Chrome PID
1368 unchanged.

## P01 — Localize MapLibre UI without rebuilding the map

Finding: **AGG8-01** (Medium/High)

Primary files:

- `src/lib/i18n.ts`
- `src/lib/map-locale.ts`
- `src/lib/map-locale.test.ts`
- `src/components/MapView.tsx`
- `e2e/travelback.spec.ts`

Implementation:

- Add app-owned translations in all five shipped locales for MapLibre's map
  canvas, zoom in, zoom out, reset-bearing, and attribution-toggle strings.
- Build a typed MapLibre locale patch from the active translation function
  and supply it during initial map construction.
- Synchronize the existing canvas and control `title`/accessible-name
  attributes whenever locale changes after construction.
- Keep the map instance, route layers, camera, playback, Journey draft, and
  export lifecycle intact; locale changes must not recreate the map.
- Extend an existing loaded-track E2E case rather than increasing the
  118-test catalogue.

Acceptance:

- English, Korean, Japanese, Chinese, and Spanish expose complete mapping
  entries with translation-key parity.
- Switching `en → ko → ja` after loading a trip changes the map canvas, zoom,
  compass, and attribution accessible names/tooltips.
- The same canvas element remains connected, there is exactly one map canvas,
  and the loaded trip/workspace remains present across both switches.
- Focused mapping/synchronization tests pass without browser or server work.

## Verification gates

Run focused regressions before the complete matrix. Then attempt every gate
even if an earlier one fails:

1. `npm run lint`
2. `npm run typecheck`
3. supervised `npm test` (614 unit baseline plus 40 process tests)
4. `npm run build`
5. supervised `npm run test:e2e` (118-test catalogue)
6. supervised `npm run test:e2e:static:ci` (118-test catalogue)
7. `npm audit --audit-level=high`
8. supervised `npm run test:e2e:static:real-mp4`

The focused real-MP4 gate must retain picker-once behavior, preview/download
identity, 1280×720 metadata, approximately five-second duration, first/last
frame decode, canvas readback, a downloaded file larger than 1 KiB,
full-file `ftyp`/`moov`/`mdat` structure, AVC, and 120 packets with timing.

Browser-capable gates run sequentially, each with a fresh pre-run ownership
inventory and an exact survivor/profile/listener audit before the next gate.
Use explicit alternative ports and do not touch any unrelated owner.

## Completion log

Completed the single new Cycle 8 finding. No item was deferred and no
deployment command, workflow dispatch, or `main` push occurred.

Implementation evidence:

- Added MapLibre canvas, zoom-in, zoom-out, reset-bearing, and
  attribution-toggle translations for all five shipped locales.
- Added a typed locale-patch builder and a DOM synchronizer for MapLibre's
  existing canvas and controls.
- Initial map construction receives the active locale patch. Later locale
  changes update accessible names and tooltips without reconstructing the
  map, route, camera, playback, Journey draft, or export lifecycle.
- The existing loaded-track E2E case now verifies `en → ko → ja` canvas and
  control labels while retaining the same connected canvas, exactly one map
  canvas, and the loaded workspace. The catalog remains at 118 tests.

Focused evidence:

- `src/lib/map-locale.test.ts` and `src/lib/i18n.test.ts` passed 30/30,
  covering all locale mappings and node-preserving Korean-to-Japanese
  synchronization.
- File-scoped ESLint passed for the implementation and regression files.

Gate-driven corrections: **2**.

- The review diff check found three Markdown hard-break trailing spaces.
  They were removed and the signed review commit was amended before push.
- The first typecheck identified that `MapLibreLocalePatch` needed the
  `Record<string, string>` index contract expected by MapLibre. The helper
  received the correct string index signature; typecheck and focused tests
  then passed.

Recorded recoverable execution errors: **3**.

- An early review-artifact probe used an unmatched zsh glob and exited
  nonzero without changing state. The inventory was repeated with guarded
  matching.
- The first unit-run ledger passed a newline-separated PID set to `lsof` as
  one process identifier. The malformed read-only audit changed no state;
  the identities, listeners, locks, profiles, and temporary root were
  rechecked safely.
- Development E2E exited green but left its own `.next/dev/lock`. The lock
  named exact dead PID 17418 and port 63264; the PID was absent, the port was
  free, and `lsof` found no holder. Only that generated lock was deleted with
  `apply_patch`.

Verification:

1. `npm run lint` — passed.
2. `npm run typecheck` — the initial MapLibre contract error was corrected;
   the required rerun passed.
3. Supervised `npm test` — passed in its single slot: 27 files / 616 unit
   tests and 40/40 process-supervisor tests.
4. `npm run build` — passed; worker parity was current, Next compiled,
   typechecked, and prerendered 4 static pages, and CSP hardening covered 3
   HTML files.
5. Supervised `npm run test:e2e` — 117 passed / 1 intentional dedicated-real
   export skip across the 118-test development catalog.
6. Supervised `npm run test:e2e:static:ci` — static smoke passed, then 116
   passed / 2 intentional static-only skips across the 118-test catalog.
7. `npm audit --audit-level=high` — zero vulnerabilities.
8. Supervised `npm run test:e2e:static:real-mp4` — 1/1 passed. The save
   picker was attempted once; preview and download shared one blob; the
   1280×720 five-second video decoded first and last frames with canvas
   readback; the downloaded file exceeded 1 KiB and had complete
   `ftyp`/`moov`/`mdat` structure; and inspection reported AVC with 120
   packets and accepted timing.

Exact process/browser cleanup:

- The unit/process run used marker `e017…9155` and an isolated temporary
  root. Its 616-unit phase and 40-test supervisor phase included a deliberate
  real-Chromium fixture with roots 2877/2941/2942, port 63184, and five
  locks. Every marker, recorded identity, listener, profile/lock holder, and
  temporary artifact was absent after supervised exit.
- Development E2E used port 63264 and profile
  `playwright_chromiumdev_profile-HEdlOh`. Every recorded identity, browser,
  renderer, listener, profile/lock, marker, exact stale Next lock, and
  temporary root was absent before static E2E.
- Static E2E used port 64481 and profile
  `playwright_chromiumdev_profile-yy5kxm`; its preliminary smoke server on
  4183 also exited cleanly. Every recorded identity, listener, profile/lock,
  marker, and temporary root was absent before audit and real-MP4.
- Real MP4 used port 50395 and profile
  `playwright_chromiumdev_profile-jPd4BI`. Every recorded identity, listener,
  profile/lock, marker, and temporary root was absent after exit.
- Ports 3099, 4173, 4183, 50395, 63264, and 64481 were clear at final
  cleanup, and `.next/dev/lock` was absent.
- Protected user Chrome PID/PGID 1368 remained unchanged. No unrelated
  browser, Playwright, or server process was signaled.
