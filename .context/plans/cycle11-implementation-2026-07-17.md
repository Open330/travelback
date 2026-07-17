# Cycle 11 Implementation Plan — 2026-07-17

Source: `.context/reviews/_aggregate.md` at review target
`7273d464fdce24fc06350ce1444c3a2e8d26829d`.

## Objective

Fix all three fresh Cycle 11 findings and the one confirmed incomplete Cycle 2
edge without deployment. Preserve every manual, authority-, legal-input-,
representative-evidence-, performance-, and final-cleanup carryover under its
existing exit criterion.

## Rules and constraints

- No deployment command, workflow dispatch, production mutation, CI/CD edit,
  external communication, or cleanup deletion.
- Use `apply_patch` for authored edits and package/build tools only for
  mechanical generated output.
- Preserve unrelated and concurrent changes. Do not reuse or remove any path,
  process, port, or browser session in the durable pending inventory.
- Create GPG-signed Conventional Commit + gitmoji commits, one coherent fix per
  commit. Run `git pull --rebase` before each push and push every iteration.
- Run focused regressions from an inventoried physical copy, then the complete
  exact-implementation-HEAD gate matrix from a fresh physical copy. Development,
  static, and real-MP4 browser gates must run strictly sequentially.
- Do not claim physical-iOS, real save-picker, external-share, representative
  GPU, or legal evidence that this cycle does not obtain.

## P01 — Preserve a valid Journey confirmation snapshot (AG11-01)

- Severity / confidence: Medium / High
- Files: `src/components/JourneyCreator.tsx`,
  `src/components/JourneyCreator.test.ts`, `e2e/travelback.spec.ts`
- Work:
  - When Done crosses the two-point boundary, settle active drag state and give
    confirmation an owned copy of the valid waypoint draft.
  - Freeze Journey map add/delete/drag mutation while confirmation is visible,
    including pointer interaction on the map canvas; Edit returns ownership to
    the live draft.
  - At Create, defensively require at least two points and pass a fresh copy to
    `onComplete`; never publish the mutable ref directly.
  - Keep the existing localized confirmation/edit affordances. Because the
    chosen design freezes a valid snapshot, no new invalid-state message is
    required.
- Acceptance:
  - Component coverage drives map add/delete/drag callbacks after Done and
    proves the confirmed cardinality and published Track remain valid.
  - Browser coverage proves the map canvas is non-editable during confirmation,
    Edit restores interaction, and Create produces the original two-point route.
  - Zero/one-point `Track` values cannot reach `onComplete` from JourneyCreator.
- Status: Planned.

## P02 — Route Escape before playback-only suppression (AG11-02)

- Severity / confidence: Medium / High
- Files: `src/lib/usePlaybackController.ts`,
  `src/lib/usePlaybackController.test.ts`, `src/components/TrackToolbar.tsx`,
  `e2e/travelback.spec.ts`
- Work:
  - Give nonmodal global Escape dismissal precedence over the interactive-target
    guard while retaining export capture and `ModalDialog` ownership.
  - Make the mobile overflow menu consume its own Escape so one key closes only
    the topmost owner.
  - Restore focus to the Camera trigger when SceneEditor closes from an internal
    control; retain focus naturally when the trigger itself owns focus.
- Acceptance:
  - Hook coverage proves focused button/input/select/range targets reach
    `onClosePanels`, while a dialog-owned Escape and export mode do not.
  - Browser coverage asserts SceneEditor is hidden from the focused Camera
    trigger and an internal control, with focus restored to Camera.
  - The existing KML flow asserts the panel is hidden before Export opens, and
    mobile-menu Escape closes only that menu.
- Status: Planned.

## P03 — Clear rejected-file state when Sample becomes the current intent (AG11-03)

- Severity / confidence: Medium / High
- Files: `src/components/FileUpload.tsx`,
  `src/components/FileUpload.test.ts`, `e2e/travelback.spec.ts`
- Work:
  - Route the Sample CTA through a FileUpload-owned intent wrapper that clears
    the component's prior rejection, invalidates any local parse, and then calls
    the page-owned sample callback.
  - Keep parser errors visible while their own intent remains current; do not
    hide them with a timer.
- Acceptance:
  - A component regression establishes a rejected file, starts Sample, rerenders
    loaded state, and finds no stale `role=alert`.
  - A browser regression performs unsupported input → successful Sample and
    requires the Namsan workspace/live status with no rejected-file alert.
- Status: Planned.

## P04 — Invalidate a held sample before unsupported-drop preflight (R11-01)

- Severity / confidence: Medium / High
- History: Reopened/incomplete Cycle 2 `AG2-02/P04`; not a fresh root.
- Files: `src/components/FileUpload.tsx`,
  `src/components/FileUpload.test.ts`, `e2e/travelback.spec.ts`
- Work:
  - Notify `onImportStart` exactly once for every newer file intent, including
    an unsupported drop that returns before parsing.
  - Preserve the parser as authoritative for accepted files and retain the
    existing localized child preflight message for unsupported drops.
- Acceptance:
  - Component coverage proves both accepted and rejected picker/drop attempts
    notify the page owner once and unsupported files do not invoke the parser.
  - A deterministic browser regression holds `/sample-trip.gpx`, dispatches a
    newer unsupported `.txt` DragEvent, releases the response, and proves the
    sample never installs while the newer recovery state remains.
- Status: Planned.

## P05 — Verification and documentation closure

- Update this plan and `.context/plans/README.md` only after the corresponding
  implementation and focused regression actually pass.
- Preserve manual items `M10-01` and `M9-01`; blocked/evidence-gated `B01`-`B04`;
  performance deferrals `D01`-`D04`; and final cleanup
  `U-2026-07-17-01` without silently dropping or widening them.
- Required final gates, all at exact implementation HEAD:
  1. `npm run lint`
  2. Next type generation plus `npm run typecheck`
  3. `npm test`
  4. `npm audit --audit-level=high`
  5. `npm run check:worker`
  6. `npm run build`
  7. `npm run smoke:static`
  8. full development Playwright, retries disabled, one worker
  9. full static Playwright with CI semantics, retries disabled, one worker
  10. isolated real static MP4 test with the required opt-in environment,
      retries disabled and one worker; assert output `> 1 KiB` and bytes 4–7
      equal `ftyp`
- Re-run lint, typecheck, unit, audit, and worker parity after documentation
  closure. Record every new copy, session, listener PID, port, and artifact in
  the durable inventory before use; leave bounded processes to exit naturally.
- Status: Planned.

## Explicit non-implementation ledger

- `M10-01`: physical iOS Safari safe-area and dynamic browser-chrome evidence.
- `M9-01`: representative zoom/forced-colors canvas-focus evidence.
- `B01`: workflow omits `npm test`; requires explicit CI/CD edit authority.
- `B02`: workflow-wide Pages/OIDC writes; requires explicit CI/CD edit authority.
- `B03`: README MIT claim lacks owner-supplied holder/year/legal intent.
- `B04`: `preserveDrawingBuffer` requires representative GPU/memory/battery/
  thermal evidence.
- `D01`-`D04`: broad playback rerenders, elevation downsampling, Journey drag
  distance cost, and duplicate export idle wait retain their measured exits.
- `U-2026-07-17-01`: final-loop provenance cleanup remains open and is not
  authorized during this cycle.
