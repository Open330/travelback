# Deferred findings — Cycle r7 (2026-04-23)

New deferred items from cycle r7. Cycle-r4, r5, and r6 carryovers
continue to apply unchanged; see
`.context/plans/deferred-findings-cycle-r4-2026-04-23.md`,
`.context/plans/deferred-findings-cycle-r5-2026-04-23.md`, and
`.context/plans/deferred-findings-cycle-r6-2026-04-23.md`.

## R7-AGG-D21 (LOW, MEDIUM) — Full `ModalDialog` migration for export-overlay

- **File+line**: `src/app/page.tsx:329-352`.
- **Original severity / confidence**: LOW / MEDIUM (from architect
  AR-1, critic CT-1 option B).
- **Reason**: replacing the ad-hoc `<div role="dialog" aria-modal="true">`
  with `<ModalDialog>` is the cleaner long-term structure, but
  `ModalDialog` uses `createPortal` to `document.body` and toggles
  `inert` + `aria-hidden` on the app root. Doing that re-mount while
  MediaRecorder / WebCodecs are actively capturing the map canvas is
  an untested interaction — the minimal cycle-r7 fix (Escape +
  type="button" + focus-visible) addresses the user-facing a11y gap
  without this risk. The deferral lets us preserve export stability
  until we have evidence the re-mount is safe.
- **Exit criterion**: canvas capture is verified invariant under
  `createPortal` re-mount. Concretely, a targeted playwright test
  that exports a short clip with `ModalDialog` mounted mid-export
  and compares the output bytes against a known-good baseline
  under the current ad-hoc overlay.

## R7-AGG-D22 (INFO, MEDIUM) — E2E regression guard for export-overlay a11y attributes

- **File+line**: `e2e/travelback.spec.ts`.
- **Original severity / confidence**: INFO / MEDIUM (from
  test-engineer TE-1).
- **Reason**: the export-overlay is only visible during a real video
  export, which is intentionally avoided in CI (virtual-codec path
  skips the overlay). Adding a regression guard requires either
  a mock codec that pauses long enough for the overlay to be
  asserted, or refactoring the export flow to support a "dry-run"
  mode. Both are mid-scope and outside this cycle.
- **Exit criterion**: export flow becomes mockable in CI (either
  long-pause virtual codec or dry-run mode), OR the overlay is
  promoted out of `isExporting` state and rendered via a test-visible
  path.

## Continuing deferred (summary from cycles r4/r5/r6)

- **R4-AGG-D1** (primary CTA contrast) — design-owner sign-off pending.
- **R4-AGG-D2** (WebGL-fail tab order) — architectural refactor pending.
- **R4-AGG-D3** (320w + ko browser probe) — no probe this cycle.
- **R4-AGG-D4** (real-WebGL LCP/INP/CLS) — no real-WebGL run this cycle.
- **R4-AGG-D5** (forced-colors audit) — no Windows probe.
- **R4-AGG-D7** (`preserveDrawingBuffer`) — carryover; essential for export.
- **R4-AGG-D8** (`videoEncoder.ts` `window as unknown as` casts) — carryover.
- **R4-AGG-D9** (Nominatim CSP) — carryover; search path remains local-only.
- **R4-AGG-D10** (2-letter language codes) — copy-owner review pending.
- **R4-AGG-D11** (Google guide copy) — copy-owner review pending.
- **R4-AGG-D12** (`prefers-reduced-motion` spec) — out of cycle r7 scope.
- **R4-AGG-D13** (Lighthouse/LCP/INP e2e) — out of cycle r7 scope.
- **R5-AGG-D14** (FileUpload prop optionality) — cosmetic refactor pending.
- **R5-AGG-D15** (Toast onDismiss closure reallocation) — negligible cost.
- **R5-AGG-D16** (TimelineSelector buckets recompute) — acceptable at 250k max.
- **R5-AGG-D17** (buildReferenceGridData style reload) — <1 ms pass cost.
- **R6-AGG-D18** (FileUpload iOS tip) — copy-owner sign-off pending.
- **R6-AGG-D19** (TimelineSelector minGap saturation) — no user impact.
- **R6-AGG-D20** (`seekNonce` ref no-follow write) — refactor risk > gain.

None of the exit criteria have triggered this cycle.
