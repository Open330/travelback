# Cycle 9 Review Remediation Plan — 2026-07-24

Status: **Planned**

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
