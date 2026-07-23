# Cycle 12 Implementation Plan

Date: 2026-07-24
Base revision: `03df087d9befa3a6570f7eea17f2d4c6ba939a3c`
Branch: `review-plan-fix/no-deploy-20260723`
Deployment mode: none
Status: Active

## Inputs

- `.context/reviews/_aggregate.md`
- `.context/reviews/cycle12-2026-07-24-ux-critic.md`

Cycle 12 contains one genuinely new finding. It is scheduled below; no
finding is deferred or dropped.

## P1 — Expose the Camera disclosure relationship

Finding: `AGG12-01`
Severity: Low
Confidence: High
Status: Pending

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

To be filled after implementation and verification.
