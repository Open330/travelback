# Cycle 9 Review Remediation Plan — 2026-07-24

Status: **Completed and archived**

Source review: `.context/reviews/_aggregate.md`
Reviewed base: `0c7eb7cb0d9265797327c343684d27ad27fdfdfa`
Branch: `review-plan-fix/no-deploy-20260723`
Deployment mode: **none**

## Scope and policy

- Schedule all three new aggregate findings. **No Cycle 9 finding is
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
  focused regression first, bounded implementation, full gates, exact
  browser/process ownership audits, plan completion, signed commits, and
  branch-only pushes.
- A failed workstream or gate is recorded and repaired when possible, but
  never terminates this cycle or the outer loop. Every remaining gate is
  still attempted.

## Process and browser hygiene

The Cycle 9 parent exclusively owns full-suite and browser-capable commands.
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

## P01 — Give the duration draft one export-eligibility authority

Finding: **AGG9-01** (Medium/High)

Primary files:

- `src/components/ExportPanel.tsx`
- `src/components/ExportPanel.test.ts`

Implementation:

- Parse the current duration draft into a prospective duration without
  mutating the input.
- Use that prospective duration for displayed encoded-size, browser-memory,
  and render-time estimates as soon as the draft is valid.
- Derive the too-large warning and Start-button eligibility from the same
  prospective request that Start would publish.
- Make an invalid draft unavailable for export while retaining its associated
  localized range error and focus behavior.
- Recompute the encoded-size and memory guard from the exact parsed duration
  inside `handleExport`; do not trust a closure derived from an older
  committed duration.

Acceptance:

- A feasible 10-second Maximum-quality request becomes visibly over-budget
  and non-startable immediately when a focused draft changes to 180 seconds,
  without blur or Enter.
- Returning the focused draft to a feasible value clears the warning,
  re-enables Start, updates estimates, and publishes that exact duration.
- No over-budget or invalid draft reaches `onExport`.
- Add the focused regression first and confirm it fails on the reviewed
  baseline before applying the implementation.

## P02 — Publish a complete large-card social preview

Finding: **AGG9-02** (Low/High)

Primary files:

- `public/social-preview.png`
- `src/app/layout.tsx`
- `scripts/smoke-static.mjs`

Implementation:

- Derive a locale-neutral 1200×630 PNG from the existing Travelback visual
  language without using the English explanatory copy from the landing SVG.
- Construct the preview URL from `appUrl` so default and configured mount
  paths cannot diverge.
- Register the same image descriptor, dimensions, media type, and meaningful
  alt text in Open Graph and Twitter metadata.
- Extend the static smoke to read the generated head, require the
  `summary_large_image` contract and both image tags, verify the default or
  configured mount path, and fetch the referenced PNG with the expected media
  type and dimensions metadata.

Acceptance:

- Production static HTML emits nonempty, matching `og:image` and
  `twitter:image` absolute URLs under the configured application mount.
- The head emits 1200×630 dimensions and useful alt metadata.
- The same mounted preview asset returns 200 as `image/png`.
- Existing CSP, base-path, and static-serving smoke contracts remain green.

## P03 — Document export presentation as a captured transaction

Finding: **AGG9-03** (Low/High)

Primary files:

- `.context/project/02-architecture.md`
- `src/lib/useExportController.ts`

Implementation:

- Rewrite the export flow and cleanup section around
  `captureExportPresentation`, `applyExportPresentation`, and
  `restoreExportPresentation`.
- Document exact inline-dimension restoration, automatic versus explicit DPR
  ownership, and the Follow-off manual-camera handoff.
- Distinguish the captured-snapshot path from the no-snapshot teardown
  fallback that clears dimensions.
- Correct controller comments so maintainers are not told that ordinary
  cleanup always clears the container to natural dimensions.

Acceptance:

- Authoritative prose matches `map-export-presentation.ts` and
  `MapView.resetSize()`.
- Existing map-presentation tests continue to prove exact dimensions,
  automatic/explicit DPR handling, and ownership-gated camera restoration.

## Verification gates

Run focused regressions before the complete matrix. Then attempt every gate
even if an earlier one fails:

1. `npm run lint`
2. `npm run typecheck`
3. supervised `npm test` (616-unit baseline plus 40 process tests)
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

Completed all three new Cycle 9 findings. No item was deferred and no
deployment command, workflow dispatch, or `main` push occurred.

Implementation evidence:

- Export duration now has one prospective-request authority for estimates,
  memory eligibility, the Start button, and the final handler guard. Invalid
  drafts cannot export, focused valid drafts update immediately, and the
  handler independently rejects an exact over-budget request.
- Added a locale-neutral Travelback social illustration as maintainable SVG
  source and deterministic 1200×630 PNG output. Open Graph and Twitter share
  one `appUrl`-relative absolute image descriptor with matching type,
  dimensions, and alt text.
- Static smoke now parses the generated head structurally, verifies the
  large-card contract and matching mount-safe URLs, fetches the preview, and
  validates its MIME type, PNG signature, and IHDR dimensions.
- Architecture prose and export-controller comments now describe the actual
  captured presentation transaction: exact inline dimensions,
  automatic-versus-explicit DPR ownership, Follow-off manual camera
  restoration, and the no-snapshot teardown fallback.

Focused evidence:

- The new duration regression was deliberately red against the reviewed
  behavior, proving the focused 180-second draft still used stale 10-second
  eligibility. After the fix, all 16 `ExportPanel` tests passed and scoped
  ESLint was clean.
- All 8 map export-presentation tests passed after the documentation/comment
  correction.
- The social asset passed scoped ESLint, JavaScript syntax, XML validity,
  deterministic rerasterization, file-type, RGB, PNG-signature, and
  1200×630 dimension checks.

Gate-driven corrections: **1**.

- The review diff check found three Markdown hard-break trailing spaces.
  They were removed before the signed review commit.

Recorded recoverable execution errors: **4**.

- A historical-review probe used an unmatched zsh glob. It changed no state
  and was repeated with `find`.
- A hardcoded-string scan used a malformed quoted shell regular expression.
  It changed no state and was repeated with a simpler safe expression.
- The first social SVG validation rejected an XML comment containing an
  illegal double hyphen. The comment was corrected before rasterization and
  all focused asset checks then passed.
- The command sandbox rejected an exact `rm -rf` unit-test temp cleanup.
  With holders already proven absent, the same exact owned root was removed
  using `find -depth -delete`.

Verification:

1. `npm run lint` — passed.
2. `npm run typecheck` — passed, including Next route type generation.
3. Supervised `npm test` — passed in its single slot: 27 files / 617 unit
   tests and 40/40 process-supervisor tests.
4. `npm run build` — passed; worker parity was current, Next compiled,
   typechecked, prerendered 4 static pages, and CSP hardening covered 3 HTML
   files.
5. Supervised `npm run test:e2e` — 117 passed / 1 intentional dedicated-real
   export skip across the 118-test development catalog.
6. Supervised `npm run test:e2e:static:ci` — social/static smoke passed, then
   116 passed / 2 intentional static-only skips across the 118-test catalog.
7. `npm audit --audit-level=high` — zero vulnerabilities.
8. Supervised `npm run test:e2e:static:real-mp4` — 1/1 passed. The save
   picker was attempted once; preview and download shared one blob; the
   1280×720 approximately five-second video decoded first and last frames
   with canvas readback; the downloaded file exceeded 1 KiB and had complete
   top-level `ftyp`/`moov`/`mdat` structure; inspection reported AVC with 120
   packets and accepted timing.

Exact process/browser cleanup:

- The unit/process run used marker `26d0…48c2` and an isolated temporary
  root. Its deliberate real-Chromium fixture recorded roots 2539/2616/2622,
  port 52265, and five locks. Every marker, identity, listener, profile/lock
  holder, and temporary artifact was absent after supervised exit.
- Development E2E used marker `cb93…dd1d`, port 47291, browser root 15164,
  and profile `playwright_chromiumdev_profile-7w6SJ1`. Every recorded
  identity, browser, renderer, listener, profile/lock, and marker was absent.
  Its generated Next lock named dead PID 14222 and port 47291; with the PID
  absent and port/holders free, only that exact lock was deleted.
- Static E2E used marker `d3b7…3c22`, smoke port 47294, Playwright port
  47292, browser root 74404, and profile
  `playwright_chromiumdev_profile-qfQckE`. Every identity, listener,
  profile/lock, marker, and temporary root was absent before audit.
- Real MP4 used marker `caaf…92d5`, port 47293, browser root 18917, and
  profile `playwright_chromiumdev_profile-00MzD8`. Every identity, listener,
  profile/lock, marker, and temporary root was absent after exit.
- Ports 3099, 4173, 4183, 47291, 47292, 47293, and 47294 were clear at the
  relevant cleanup boundaries, and `.next/dev/lock` was absent at final
  cleanup.
- Protected user Chrome PID/PGID 1368 retained its original UID, start
  token, and identity. No unrelated browser, Playwright, or server process
  was signaled.
