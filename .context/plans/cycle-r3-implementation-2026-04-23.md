# Cycle 3 Implementation Plan (2026-04-23, orchestrator run r3)

Source: `.context/reviews/_aggregate.md` (cycle r3 aggregate).

## Status at plan start
All gates green (lint 0/0, typecheck 0, build OK, audit 0, smoke OK, e2e passed). No regressions since cycle r2. Three schedulable findings; 11 deferred per `.context/plans/deferred-findings-cycle-r3-2026-04-23.md`.

## Scheduled tasks

### R3-T1 — Track `setTimeout` id in `FileUpload.handleDrop` and clear on unmount

Source finding: R3-AGG-1 (= R3-CR-1 / R3-DB-1).

Priority: P2 (code hygiene; avoids redundant setState on re-rendered component).

Files:
- `src/components/FileUpload.tsx:29-32` — add `dragEndTimerRef` (useRef to timer id).
- `src/components/FileUpload.tsx:77-91` — in `handleDrop`, clear any pending timer before scheduling; assign the new timer to the ref.
- `src/components/FileUpload.tsx` — add a `useEffect` cleanup that clears the timer on unmount.

Acceptance:
- `npm run lint`, `typecheck`, `build`, `smoke:static`, `test:e2e:static:ci`, `npm audit --audit-level=high` all still pass.
- Behavior unchanged: drag-leave animation still clears after 200 ms.

Risk / rollback: very low — additive refactor.

### R3-T2 — Log dynamic-import failures in `isCodecSupported`

Source finding: R3-AGG-2 (= R3-CR-3 / R3-DB-5).

Priority: P3 (diagnostics).

Files:
- `src/lib/videoEncoder.ts:205-212` — inside the `catch`, `console.debug('[Travelback] codec probe failed:', err instanceof Error ? err.message : String(err))`. Keep `return false`.

Acceptance:
- All gates still pass.
- No user-visible behavior change; a `console.debug` line appears in dev-tools when module load fails.

Risk / rollback: trivial.

### R3-T3 — Add `role="dialog" aria-modal="true" aria-labelledby` to exporting overlay

Source finding: R3-AGG-3 (= R3-A11Y-4 / R3-UX-1).

Priority: P2 (accessibility).

Files:
- `src/app/page.tsx:329-345` — add `role="dialog"`, `aria-modal="true"`, `aria-labelledby="export-overlay-title"` to the overlay `div`; add `id="export-overlay-title"` to the "Rendering video" `<p>`.

Acceptance:
- All gates still pass.
- Screen readers announce a dialog when export begins; keyboard users can still use Cancel.
- No visual regression (attributes only).

Risk / rollback: trivial.

---

## Deferred tasks (per repo rules)

All other new findings recorded in `.context/plans/deferred-findings-cycle-r3-2026-04-23.md` with severity, file+line citations, reasons, and exit criteria. Severity preserved; no downgrades.

Prior deferred items (DF-C17-*, DF-R2-001..-017, DF-C4-001, DF-C4-002, DF-C2-010) remain active with original exit criteria.

---

## Rationale for scheduling vs. deferring

- R3-T1..T3 are all single-file, single-concept, low-risk additions with direct user or code-quality benefit.
- Architecture/DRY refactors remain deferred to avoid per-cycle churn.
- Nominatim CSP question deferred pending hands-on verification of `harden-static-export.mjs` interaction with the JourneyCreator search fetch.

---

## Gate verification plan

1. Apply the three edits in separate commits.
2. Between each commit, run:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run build`
3. After the last edit, run the full gate suite:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run build`
   - `npm run smoke:static`
   - `npm run test:e2e:static:ci`
   - `npm audit --audit-level=high`
4. Commit fine-grained, GPG-signed, Conventional Commits + gitmoji. `git pull --rebase` before each push. After each commit run the gitminer (`~/flash-shared/gitminer-cuda/mine_commit.sh 7`) per user rules.

Progress tracking below will be updated as each task completes.

## Progress

- R3-T1: **DONE**
- R3-T2: **DONE**
- R3-T3: **DONE**
