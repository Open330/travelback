# Cycle 12 Implementation Plan — 2026-07-17

Source: `.context/reviews/_aggregate.md` at review target
`d62b13ce3f7b89aefe71fbc2ad6bf0b3fbc0d789`.

## Objective

Fix both fresh Cycle 12 Medium/High findings and all four confirmed incomplete
historical edges without deployment. Preserve every manual, authority-, legal-,
representative-evidence-, performance-, and final-cleanup carryover under its
existing exit criterion.

## Rules and constraints

- No deployment command, workflow dispatch, production mutation, CI/CD edit,
  external communication, destructive cleanup, or manual process termination.
- Use `apply_patch` for authored edits and package/build tools only for their
  normal mechanical output. Work only in the primary worktree; create no
  temporary copy, worktree, or replacement dependency tree.
- Preserve unrelated and concurrent changes. Do not reuse, remove, stop, or
  kill any existing path, process, port, browser, or server.
- Create GPG-signed Conventional Commit + gitmoji commits, one coherent fix per
  commit. Run `git pull --rebase` before every push and push each iteration.
- The requested Ralph helper is unavailable in this environment; execute this
  approved regression-first plan directly.
- Browser verification is Prompt 3 only. Before each Playwright command,
  require zero Playwright/Chromium processes and a free dedicated port. Run
  development, static, and isolated real-MP4 commands exactly one at a time,
  with one worker and zero retries, and let each owned lifecycle exit naturally.
  If any process or listener remains, stop and report rather than killing it.
- Do not claim physical-iOS, external-share, representative GPU, legal, or CI
  evidence that this cycle does not obtain.

## P01 — Refresh the paused camera from every committed scene snapshot (AG12-01)

- Severity / confidence: Medium / High
- Files: `src/app/page.tsx`, `src/components/TrackWorkspace.tsx`,
  `src/components/SceneEditor.tsx`, `src/components/SceneEditor.test.ts`,
  `e2e/travelback.spec.ts`
- Work:
  - Give SceneEditor a committed-scene callback that receives the exact
    normalized next snapshot, rather than relying on a later render or stale
    parent closure.
  - At the page camera owner, compute and apply the current-progress camera from
    that exact snapshot. Use the same helper when transition duration changes.
  - Preserve temporary parameter preview ordering: a parameter commit refreshes
    the saved current pose first, then its deliberate midpoint preview remains
    visible until pointer/key/blur cleanup restores the latest committed pose.
  - Cover mode, preset, add/delete, range, and transition commits through the
    same boundary; do not restore scene arrays to the high-frequency MapView
    animation dependency list.
- Acceptance:
  - Component coverage proves normalized commits notify the new camera owner,
    including a mode change, while raw range drag updates remain transient until
    terminal commit.
  - At stationary nonzero progress, changing the active scene mode or preset
    changes the development debug camera without seek/play and produces no map
    error in either development or static execution.
  - Existing parameter-preview and clear-to-live-route behavior remains green.
- Status: Completed in signed commit `058e028`; SceneEditor component coverage
  and the stationary-progress development/static camera regression passed.

## P02 — Keep degenerate fit bounds inside the latitude domain (AG12-02)

- Severity / confidence: Medium / High
- Files: `src/lib/map-geometry.ts`, `src/lib/map-geometry.test.ts`,
  `src/components/MapView.tsx`, optionally one focused E2E fixture/case
- Work:
  - Move the fit-bounds coordinate calculation into a pure geometry helper and
    leave MapView responsible only for constructing the MapLibre bounds object.
  - Clamp degenerate latitude padding to `[-90, 90]`, producing inward,
    asymmetric padding at either pole rather than an invalid coordinate.
  - Preserve current shifted-longitude antimeridian behavior and ordinary
    nondegenerate bounds exactly.
- Acceptance:
  - Pure tests cover identical points at `90`, `-90`, just inside each pole,
    an ordinary coordinate, empty input, and an antimeridian case.
  - Every returned latitude is finite and in range, a degenerate pole result
    retains nonzero latitude span, and MapLibre receives no out-of-domain bound.
  - If a browser case is added, a valid two-point coincident polar GPX reaches a
    loaded workspace with no map error.
- Status: Completed in signed commit `048eb21`; 17 pure geometry regressions
  cover both poles, near-pole inputs, ordinary points, empty input, and the
  antimeridian while preserving valid latitude output.

## P03 — Let a newer drop replace an in-flight parse (R12-03)

- Severity / confidence: Medium / High
- History: Reopened/incomplete Cycle 11 `R11-01/P04`; not a fresh root.
- Files: `src/components/FileUpload.tsx`,
  `src/components/FileUpload.test.ts`
- Work:
  - Remove the loading-time early return from the live drop target and route the
    dropped file through the existing intent owner.
  - Let `onImportStart`, generation invalidation, and AbortController settlement
    cancel parse A before parse B begins; keep the native picker disabled while
    loading and retain unsupported-file preflight.
  - Always settle the drag highlight for a received drop.
- Acceptance:
  - A held parse A followed by drop B aborts A's signal, reports two ordered
    import intents, starts B exactly once, ignores a stale A settlement, and
    publishes only B.
  - Unsupported B also invalidates A and leaves its own localized recovery
    state; existing sample/Journey invalidation coverage remains green.
- Status: Completed in signed commit `60ea9f7`; all 9 FileUpload component
  regressions passed, including held parse A replaced by newer drop B.

## P04 — Establish More as the opener before launching mobile modals (R12-01)

- Severity / confidence: Medium / High
- History: Reopened/incomplete Cycle 7 `P03`; not a fresh root.
- Files: `src/components/TrackToolbar.tsx`,
  `src/components/TrackToolbar.test.ts`, `e2e/travelback.spec.ts`
- Work:
  - For Help and import-guide actions only, close the mobile menu, restore focus
    to More, then invoke the modal-opening callback on the next owned frame.
  - Keep ordinary New/style actions and menu-only Escape behavior unchanged.
  - Let ModalDialog retain its existing generic opener capture/restore contract;
    do not add cross-component global focus state.
- Acceptance:
  - Component coverage observes More as the active element when each modal
    callback fires and confirms the menu is closed.
  - Mobile `More → Help → Escape` and `More → import guide → Close` both restore
    focus to More; desktop Help and scene-editor Escape ownership still pass.
- Status: Completed in signed commit `f71d58c`; all 4 TrackToolbar component
  regressions and both mobile modal focus-return browser paths passed.

## P05 — Hand export cancellation/failure focus back to the idle panel (R12-02)

- Severity / confidence: Medium / High
- History: Reopened/incomplete Cycle 9 `AG9-03/P05`; not a fresh root.
- Files: `src/components/ExportPanel.tsx`,
  `src/components/ExportPanel.test.ts`, `e2e/travelback.spec.ts`
- Work:
  - Track the rendering-to-idle transition and focus the stable Export Video
    heading with `preventScroll` after the idle controls mount.
  - Make the heading programmatically focusable without adding it to sequential
    tab order. Do not steal focus on initial open, successful completion, or an
    ordinary idle rerender.
  - Preserve rendering Cancel focus, success-heading focus, modal containment,
    and final restoration to the toolbar Export opener.
- Acceptance:
  - Component rerender coverage proves idle → rendering focuses Cancel and
    rendering → idle focuses the panel heading, while done keeps its own result
    heading.
  - A controllable cancelled export leaves focus inside the restored idle
    dialog, Tab remains contained, and closing the dialog returns focus to the
    toolbar Export trigger.
- Status: Completed in signed commit `b0fbb76`; all 7 ExportPanel component
  regressions and the controllable browser cancellation/focus path passed.

## P06 — Authorize generated inline error-page styles by hash (R12-04)

- Severity / confidence: Medium / High
- History: Reopened/incomplete Cycle 1 `P05`; not a fresh root.
- Files: `scripts/harden-static-export.mjs`, `scripts/smoke-static.mjs`
- Work:
  - Compute sorted, deduplicated SHA-256 sources for every nonempty inline
    `<style>` block in each generated HTML file.
  - Inject those sources into both `style-src` and `style-src-elem` alongside
    `'self'`; retain `style-src-attr 'unsafe-inline'` as the separately owned
    React/MapLibre attribute policy and never add broad style `unsafe-inline`.
  - Make static smoke independently recompute every inline-style hash and fail
    if either style directive omits it. Continue checking CSP placement and all
    existing security invariants.
- Acceptance:
  - A production build gives the generated 404 pages matching style hashes;
    pages without inline styles retain `'self'` without a synthetic broad
    allowance.
  - Static smoke proves every nonempty inline style is covered by both
    directives and still rejects `unsafe-inline` in `style-src` or
    `style-src-elem`.
- Status: Completed in signed commit `50d1d6d`; production hardening authorized
  each generated inline style in both element-capable directives, and the
  independent static smoke recomputation passed without a broad allowance.

## P07 — Verification and documentation closure

- Update this plan and `.context/plans/README.md` only after the corresponding
  implementation and focused regression actually pass.
- Preserve manual items `M10-01` and `M9-01`; blocked/evidence-gated `B01`-`B04`;
  performance deferrals `D01`-`D04`; and final cleanup
  `U-2026-07-17-01` without silently dropping or widening them.
- Required final gates on the exact implementation head, sequentially:
  1. `npm run lint`
  2. `npm run typecheck` (Next type generation plus TypeScript)
  3. `npm test`
  4. `npm audit --audit-level=high`
  5. `npm run check:worker`
  6. `npm run build`
  7. `npm run smoke:static`
  8. full development Playwright, retries disabled, one worker
  9. full static Playwright, retries disabled, one worker
  10. isolated real static MP4 with `TRAVELBACK_REAL_EXPORT=1`, retries disabled
      and one worker; assert output `> 1 KiB` and bytes 4–7 equal `ftyp`
- Re-run lint, typecheck, unit, audit, and worker parity after documentation
  closure. Record any gate-driven source repair as its own signed/pushed commit
  and count it in `GATE_FIXES`.
- Status: Completed. Final exact-implementation validation passed:
  - lint and Next type generation plus typecheck;
  - 19 unit files / 457 tests;
  - audit with 0 vulnerabilities and current generated worker;
  - Next 16.2.10 production build, 4 static pages, CSP hardening across 3 HTML
    files, and static smoke;
  - development and static Playwright: 110 passed, 0 failed, 1 expected
    real-export skip each, retries disabled and one worker;
  - isolated real static MP4: 1/1 passed, output `> 1 KiB` with bytes 4–7
    equal to `ftyp`;
  - every browser lifecycle ended naturally with zero Playwright/Chromium
    processes and its dedicated port free.
  `GATE_FIXES=0`: no gate-driven source or harness repair was required. No
  deployment or cleanup deletion occurred.

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
