# Deferred findings — Cycle r8 (2026-04-23)

No new deferred items were created this cycle. All cycle-r4, r5, r6,
and r7 carryovers continue to apply unchanged.

## Carryover snapshot

Source files:

- `.context/plans/deferred-findings-cycle-r4-2026-04-23.md` (R4-AGG-D1..D13)
- `.context/plans/deferred-findings-cycle-r5-2026-04-23.md` (R5-AGG-D14..D17)
- `.context/plans/deferred-findings-cycle-r6-2026-04-23.md` (R6-AGG-D18..D20)
- `.context/plans/deferred-findings-cycle-r7-2026-04-23.md` (R7-AGG-D21..D22)

Quick summary:

- **R7-AGG-D21** (LOW, MEDIUM) — Full `ModalDialog` migration for
  export-overlay. Exit: canvas-capture invariance proof under
  `createPortal` re-mount.
- **R7-AGG-D22** (INFO, MEDIUM) — E2E regression guard for
  export-overlay a11y attributes. Exit: export flow mockable in CI
  OR overlay rendered via a test-visible path.
- **R6-AGG-D18** (FileUpload iOS tip) — copy-owner sign-off pending.
- **R6-AGG-D19** (TimelineSelector minGap saturation) — no user impact.
- **R6-AGG-D20** (`seekNonce` ref no-follow write) — refactor risk > gain.
- **R5-AGG-D14** (FileUpload prop optionality) — cosmetic.
- **R5-AGG-D15** (Toast onDismiss closure reallocation) — negligible.
- **R5-AGG-D16** (TimelineSelector buckets recompute) — acceptable at 250k max.
- **R5-AGG-D17** (buildReferenceGridData style reload) — <1 ms pass cost.
- **R4-AGG-D1** (primary CTA contrast) — design-owner sign-off pending.
- **R4-AGG-D2** (WebGL-fail tab order) — architectural refactor pending.
- **R4-AGG-D3** (320w + ko browser probe) — no probe this cycle.
- **R4-AGG-D4** (real-WebGL LCP/INP/CLS) — no real-WebGL run this cycle.
- **R4-AGG-D5** (forced-colors audit) — no Windows probe.
- **R4-AGG-D7** (`preserveDrawingBuffer`) — essential for export.
- **R4-AGG-D8** (`videoEncoder.ts` `window as unknown as` casts) — carryover.
- **R4-AGG-D9** (Nominatim CSP) — search path remains local-only.
- **R4-AGG-D10** (2-letter language codes) — copy-owner review pending.
- **R4-AGG-D11** (Google guide copy) — copy-owner review pending.
- **R4-AGG-D12** (`prefers-reduced-motion` spec) — out of cycle scope.
- **R4-AGG-D13** (Lighthouse/LCP/INP e2e) — out of cycle scope.

None of the exit criteria have triggered this cycle.
