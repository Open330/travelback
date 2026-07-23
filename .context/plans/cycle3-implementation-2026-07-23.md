# Cycle 3 Review Remediation Plan — 2026-07-23

Status: **In progress**

Source review: `.context/reviews/_aggregate.md`
Reviewed base: `7f013a207e64ca54c0864edc5aaf061ebfb36bdf`
Branch: `review-plan-fix/no-deploy-20260723`
Deployment mode: **none**

## Scope and policy

- Schedule all 7 new aggregate findings. **No Cycle 3 finding is deferred.**
- Preserve prior explicit deferrals without relabeling or expanding them.
- Retain `.context/plans/user-injected/pending-next-cycle.md`; its final-loop
  cleanup task is not due during Cycle 3.
- Use Node 24, Next 16, React 19, and strict TypeScript under the current
  `.context/` rules.
- Implement in fine-grained, semantic, gitmoji-prefixed, GPG-signed commits.
  Push only `review-plan-fix/no-deploy-20260723`.
- The Pages workflow triggers only on `main`; verify that fact before every
  push, never push this cycle to `main`, and do not run a deployment command.
- Ralph is not installed in this environment. Prompt 3 uses a faithful
  iterative fallback: bounded implementation workstreams, focused regressions,
  complete configured gates, plan updates, signed commits, and exact branch
  pushes.

## Process and browser hygiene

For every browser/E2E execution:

1. Inventory pre-existing relevant processes and listeners, including exact
   PID, PPID, PGID, start token, command/profile, and ports 3099, 4173, 4183.
2. Give the run a unique marker and record the exact owned root and descendants.
3. Run browser gates strictly sequentially.
4. Let each supervised command perform its normal cleanup; if intervention is
   required, target only identities whose PID, UID, start token, ancestry or
   inherited run marker, and ownership were validated for this run.
5. Verify every exact owned identity, profile, and listener is absent before
   starting the next browser gate.
6. Never use `agent-browser close`, a global/shared close, `pkill`, `killall`,
   name-only killing, or a broad process match.
7. Leave every pre-existing user Chrome, shared agent-browser, unrelated
   Playwright, and xylolabs process untouched.

A failed browser gate does not terminate the outer review-plan-fix loop:
capture its evidence, complete exact owned cleanup, attempt the next configured
gate, and report the error for the following cycle.

## Implementation workstreams

### P01 — Make longitude wrapping constant-time

Finding: **AGG3-01** (High/High)

Primary files:

- `src/lib/interpolate.ts`
- `src/lib/map-geometry.test.ts` or a focused interpolation test

Implementation:

- Replace repeated 360-degree stepping with constant-time arithmetic.
- Preserve the current inclusive `±180` tie behavior and non-finite fallback.
- Keep route-ordered world-copy selection identical for ordinary routes.

Acceptance:

- Exact positive/negative 180-degree ties are unchanged.
- Distant finite references produce the nearest permitted world copy without
  an input-distance-dependent loop.
- Large canonical multi-wrap routes, disconnected segments, and late active
  trails remain finite and correctly ordered.

### P02 — Bound reference-grid construction

Finding: **AGG3-02** (High/High)

Primary files:

- `src/components/MapView.tsx`
- `src/lib/map-geometry.ts`
- `src/lib/map-geometry.test.ts`

Implementation:

- Extract reference-grid construction into a pure geometry helper.
- Retain the current useful spacing for ordinary bounds.
- Adapt through finite “nice” steps for extreme expanded bounds.
- Enforce a documented per-axis and total feature budget before allocating
  coordinate arrays or GeoJSON features.

Acceptance:

- Ordinary and dateline routes retain readable finite grids.
- 480-degree and approximately 35-million-degree bounds remain within the hard
  feature cap.
- No loop or allocation count scales with the number of crossed world copies.

### P03 — Make the More popup viewport-owned and scrollable

Finding: **AGG3-03** (Medium/High)

Primary files:

- `src/components/TrackToolbar.tsx`
- component tests
- `e2e/travelback.spec.ts`

Implementation:

- Cap the popup against `100dvh`, its top offset, and the safe-area inset.
- Give the popup vertical scrolling and overscroll containment without
  weakening its dialog semantics or outside-click ownership.

Acceptance:

- At 320×480 and 844×390, terminal More controls can be reached, focused, and
  activated without scrolling the page.
- Pointer targets remain owned by the popup and the existing escape/outside
  close behavior remains intact.

### P04 — Reset Share errors at export-session boundaries

Finding: **AGG3-04** (Low/High)

Primary files:

- `src/components/ExportPanel.tsx`
- `src/components/ExportPanel.test.tsx`

Implementation:

- Clear local Share failure state when Export Again starts a new session.
- Render the alert below, rather than inside, the non-wrapping action row.

Acceptance:

- Failed Share → Export Again → second completion shows no stale alert.
- A failure produced by a new Share attempt is still announced and laid out
  full width.

### P05 — Reconcile More state with responsive rendering mode

Finding: **AGG3-05** (Medium/Medium-high)

Primary files:

- `src/components/TrackToolbar.tsx`
- component tests
- `e2e/travelback.spec.ts`

Implementation:

- Observe the overflow toolbar's actual visibility across live viewport
  changes.
- If CSS hides an open More dialog, close it and move focus to an always-visible
  stable control.
- Remove the focus-trap listener through the normal state transition.

Acceptance:

- A dynamic viewport transition cannot leave `menuOpen`, the dialog, or its
  listener alive in CSS-hidden content.
- Browser coverage establishes the exact focus endpoint rather than assuming
  user-agent behavior.

### P06 — Align the process-tracker contract and cleanup diagnostics

Finding: **AGG3-06** (Medium/High, mandatory supervisor P01)

Primary files:

- `scripts/e2e-process-supervisor.mjs`
- `scripts/e2e-process-supervisor.test.mjs`

Required sequence:

1. Add a focused accepted-tracker regression for a missing `describe()` method
   and run it against the pre-fix source, preserving the expected failure
   evidence.
2. Align provider contract validation with every method cleanup uses and make
   cleanup diagnostic rendering total.
3. Preserve the original survivor/cleanup cause and TERM/KILL evidence.
4. Run focused and complete process tests beside a unique unrelated sentinel.
5. Have a fresh independent reviewer inspect the patch, run both test scopes,
   and perform an exact marker/PID/UID/start-token survivor scan before P06 is
   accepted.

Acceptance:

- An incomplete atomic provider fails at the contract boundary before target
  launch.
- Direct cleanup helper use cannot replace a survivor or cleanup error with a
  formatting `TypeError`.
- All existing 34 process regressions plus the new cases pass.
- The exact run marker has no surviving process or listener and the unrelated
  sentinel remains alive.

### P07 — Document the supervised E2E platform contract

Finding: **AGG3-07** (Low/High)

Primary files:

- `README.md`
- `.context/project/01-overview.md`

Implementation:

- State that cleanup-safe supervised E2E commands currently require POSIX.
- Explain that Windows refuses before target launch until an atomic Job Object
  provider is supplied.
- Do not describe the unsupervised development entry point as cleanup-safe.

Acceptance:

- Both contributor-facing command inventories expose the same platform
  requirement and safe refusal behavior.

## Verification gates

Focused regressions run immediately after each workstream. Before completion,
run every configured gate:

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`
5. `npm run test:e2e`
6. `npm run test:e2e:static:ci`

The two browser matrices run sequentially with an ownership inventory before
each and an exact survivor/listener scan after each. A failed gate is repaired
when possible, recorded either way, and never used as a reason to stop the
outer cycle sequence.

## Completion log

- P06 pre-fix regression proof: on the unmodified supervisor source,
  `node --test --test-name-pattern='cleanup survivor evidence is not masked' scripts/e2e-process-supervisor.test.mjs`
  failed exactly because the observed error name was `TypeError` instead of
  the expected survivor `Error` (`scripts/e2e-process-supervisor.test.mjs:1159`).
  The regression remains in the suite for the production fix and independent
  post-fix audit.
- P06 independent post-fix audit passed: 3 focused and all 37 supervisor tests
  passed; its exact run marker had zero survivors/listeners, its unrelated
  sentinel retained the same PID/PPID/PGID/UID/start token through the tests,
  and exact TERM cleanup removed only that sentinel without KILL. Evidence:
  `.context/reviews/cycle3-2026-07-23-p01-independent-audit.md`.
