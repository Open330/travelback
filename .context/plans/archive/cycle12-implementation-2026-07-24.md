# Cycle 12 Implementation Plan

Date: 2026-07-24
Base revision: `03df087d9befa3a6570f7eea17f2d4c6ba939a3c`
Branch: `review-plan-fix/no-deploy-20260723`
Deployment mode: none
Status: Completed

## Inputs

- `.context/reviews/_aggregate.md`
- `.context/reviews/cycle12-2026-07-24-ux-critic.md`

Cycle 12 contains one genuinely new finding. It is scheduled below; no
finding is deferred or dropped.

## P1 — Expose the Camera disclosure relationship

Finding: `AGG12-01`
Severity: Low
Confidence: High
Status: Completed

Evidence:

- `src/components/TrackToolbar.tsx:166-178`
- `src/components/SceneEditor.tsx:836-863`

Implementation:

1. Give the Scene Editor region a stable ID.
2. Expose `aria-expanded` and `aria-controls` from the Camera trigger, using
   the same stable ID.
3. Make the trigger's advisory title describe the next action in both open
   and closed states without changing its concise visible accessible name.
4. Extend the existing Camera open/close browser regression to assert the
   trigger's state and controlled-region relationship.

Acceptance:

- The closed trigger reports `aria-expanded="false"` and the stable target.
- Opening the editor reports `aria-expanded="true"` and mounts the identified
  region.
- Closing it reports `aria-expanded="false"` again.
- The title is truthful in both states.
- Focused regression, lint, typecheck, supervised unit/process tests, build,
  development E2E, static E2E, audit, and isolated real-MP4/WebCodecs gate all
  pass.
- Every browser-capable run uses an isolated marker, temporary/profile root,
  and port and proves exact cleanup.
- No deployment is attempted.

## Required quality gates

Run every gate even if an earlier one fails:

1. `npm run lint`
2. `npm run typecheck`
3. supervised `npm test`
4. `npm run build`
5. supervised `npm run test:e2e`
6. supervised `npm run test:e2e:static:ci`
7. `npm audit --audit-level=high`
8. isolated production real-MP4/WebCodecs gate

## Completion record

- Added a stable `scene-editor-panel` region ID and exposed the Camera
  trigger's `aria-controls` and `aria-expanded` state.
- Reused the existing localized open/close strings so the trigger title
  describes its next action without changing its visible name.
- Extended the existing Camera ownership E2E case to verify the closed, open,
  and post-Escape disclosure contract in development and static output.
- Gate fixes: 0. No gate exposed an error or warning requiring source repair.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- supervised `npm test`: 623 unit tests and 40 process-supervisor tests
  passed.
- `npm run build`: passed; generated worker parity and static hardening passed.
- supervised development E2E: 118 passed, 1 expected skip.
- supervised static smoke/E2E: smoke passed; 117 passed, 2 expected skips.
- `npm audit --audit-level=high`: 0 vulnerabilities.
- isolated production real-MP4/WebCodecs: passed the single-picker,
  shared-blob, 1280×720, approximately five-second, first/last decode, canvas
  read, complete MP4 box, AVC, 120-packet, timing, and downloaded-size checks.
- Every owned browser/server PID, marker, listener, profile, temporary root,
  and lock was proved absent after its run. The user Chrome identity remained
  unchanged; the foreign cherrypicker process was never signaled or removed.
- Recoverable execution errors: the first exact temp cleanup guard rejected
  macOS's `/tmp` to `/private/tmp` canonicalization and was corrected before
  deletion; an early process inventory included environment text in tool
  output and may have exposed a credential. Subsequent inventories emitted
  PID-only sanitized matches. No credential was added to the repository or
  worktree; any credential visible in the tool output should be rotated. The
  first final audit reused zsh's special `path` variable, invalidating that
  audit's command lookup; a fresh-shell rerun used non-reserved names and
  absolute binaries and passed every parity and cleanup check.
- Deployment: none.
