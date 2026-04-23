# Aggregate Review — Cycle r7 (2026-04-23)

## Methodology

Cycle r7 ran a source-side multi-agent review on the cycle-r6 tip
`0000000e5`. All six quality gates were green at cycle start.
User-injected queue was empty.

Eleven lanes ran in this cycle: code-reviewer, perf, security, critic,
verifier, test-engineer, tracer, architect, debugger, document-specialist,
designer (UI/UX), accessibility. Per-agent reviews live in
`.context/reviews/cycle-r7-*.md`.

---

## GATE STATUS — all green at the start of cycle r7

- ESLint (`npm run lint`): **PASS**
- TypeScript (`npm run typecheck`): **PASS**
- Next.js build (`npm run build`): **PASS** (harden-static-export ran
  on 3 HTML files)
- `npm run smoke:static`: **PASS**
- `npm run test:e2e:static:ci`: **PASS** (54 passed in 2.7m)
- `npm audit --audit-level=high`: **PASS** (0 vulnerabilities)

---

## NEW FINDINGS — SCHEDULED THIS CYCLE

### R7-AGG-1 (LOW, HIGH) — Export-overlay dialog a11y + defensive posture

- **File + line**: `src/app/page.tsx:329-352`.
- **Agreement**: accessibility (A11Y-1, A11Y-2), tracer (T-1),
  debugger (DBG-1), designer (UX-1, UX-2), document-specialist (DOC-1),
  code-reviewer (CR-1).
- **Evidence**: the rendering-progress overlay at page.tsx:329 is an
  ad-hoc `<div role="dialog" aria-modal="true">` that bypasses
  `ModalDialog`. It has no Escape handler, no focus trap, and its
  cancel button lacks `type="button"` and the Tailwind focus-visible
  triple used elsewhere. A keyboard user cannot dismiss the overlay
  via Escape. This is the single most-cited finding across seven
  agents.
- **Fix**:
  1. Add a `useEffect` that installs a `keydown` listener while
     `isExporting === true`; on Escape call `cancelExport()`.
  2. Add `type="button"` to the cancel `<button>`.
  3. Append `focus-visible:outline-2 focus-visible:outline-offset-2
     focus-visible:outline-[rgb(var(--gl))]` to the button className.
- **Schedule**: YES (single file, ~6-line diff, zero behavior change
  on success path).

---

## NEW FINDINGS — DEFERRED

### R7-AGG-D21 (LOW, MEDIUM) — Full `ModalDialog` migration for export-overlay

- **Source**: architect AR-1, critic CT-1 option B.
- **File + line**: `src/app/page.tsx:329-352`.
- **Original severity / confidence**: LOW / MEDIUM.
- **Reason**: replacing the ad-hoc overlay with `ModalDialog` is the
  cleaner long-term refactor but carries portal-re-order risk during
  active canvas capture. `ModalDialog` uses `createPortal` to
  `document.body`; reordering DOM nodes while MediaRecorder /
  WebCodecs hold the map canvas handle may disturb the capture (e.g.
  if the inert/aria-hidden attribute toggling briefly blocks paint).
  The minimal fix (R7-AGG-1) addresses the user-facing a11y complaint
  without this risk.
- **Exit criterion**: canvas capture is verified invariant under
  `createPortal` re-mount — e.g. a targeted playwright test that
  exports a short clip with `ModalDialog` mounted mid-export and
  compares the output.

### R7-AGG-D22 (INFO, MEDIUM) — E2E regression guard for export-overlay a11y attributes

- **Source**: test-engineer TE-1.
- **File + line**: `e2e/travelback.spec.ts`.
- **Original severity / confidence**: INFO / MEDIUM.
- **Reason**: the export-overlay is only visible during a real video
  export, which is not triggered in CI (virtual-codec path skips the
  overlay). Adding a guard requires either a mock codec that idles
  while the overlay is visible, or refactoring the export flow to
  permit "dry-run" mode. Both are mid-scope.
- **Exit criterion**: export flow becomes mockable in CI, OR the
  overlay is promoted out of `isExporting` state and rendered via
  a test-visible path.

### R6-AGG-D18..D20, R5-AGG-D14..D17, R4-AGG-D1..D13 — carryovers unchanged

All cycle-r4, r5, and r6 deferred items continue to apply unchanged.
No exit criteria have been triggered this cycle.

---

## AGENT FAILURES

None this cycle.
