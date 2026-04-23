# Deferred findings — Cycle r6 (2026-04-23)

New deferred items from cycle r6. Cycle-r4 and cycle-r5 carryovers continue to apply unchanged; see `.context/plans/deferred-findings-cycle-r4-2026-04-23.md` and `.context/plans/deferred-findings-cycle-r5-2026-04-23.md`.

## R6-AGG-D18 (INFO, MEDIUM) — FileUpload iOS tip appears for any touch device

- **File+line**: `src/components/FileUpload.tsx:242-246`.
- **Original severity / confidence**: INFO / MEDIUM (from critic CT-4).
- **Reason**: `isTouchDevice` is a pure feature detect; the displayed copy (`fileUpload.iosTip`) is iOS-specific. Fix requires either copy rewrite (translate strings) or UA gating, both mid-scope and not cycle-r6 material.
- **Exit criterion**: copy owner approves either (a) rewording the tip to be OS-agnostic across all five locales, or (b) restricting display via `navigator.userAgent` + `platform` detection with tested fallback.

## R6-AGG-D19 (INFO, MEDIUM) — TimelineSelector minGap saturates at 250k points

- **File+line**: `src/components/TimelineSelector.tsx:153-161`.
- **Original severity / confidence**: INFO / MEDIUM (from critic CT-3).
- **Reason**: `minGap = 1 / points.length` rounds to 0 below floating-point representable ratios at 250k points, effectively making the clamp a no-op. Downstream `endIdx <= startIdx` correction at L135-137 means no user-visible bug. Refactor to a distance-based minGap would complicate a hot rAF-throttled path.
- **Exit criterion**: a 0-point slice is ever observed on a 250k-point track trim, OR a profiler shows unexpected work in `clampRatios`.

## R6-AGG-D20 (INFO, MEDIUM) — `seekNonce` ref updates on the no-follow path

- **File+line**: `src/components/MapView.tsx:927-930`.
- **Original severity / confidence**: INFO / MEDIUM (from critic CT-2, tracer T-4).
- **Reason**: `lastSeekNonceRef.current = seekNonce` runs every frame in the no-follow branch, which is a redundant write but does not corrupt state. A refactor requires rethinking the follow-toggle path and has risk of unseating camera-smoothing assumptions.
- **Exit criterion**: a new design introduces a camera reset via follow-toggle instead of an explicit seek nonce.

## Continuing deferred (summary from cycles r4/r5)

- **R4-AGG-D1** (primary CTA contrast) — design-owner sign-off pending.
- **R4-AGG-D2** (WebGL-fail tab order) — architectural refactor pending.
- **R4-AGG-D3** (320w + ko browser probe) — no probe this cycle.
- **R4-AGG-D4** (real-WebGL LCP/INP/CLS) — no real-WebGL run this cycle.
- **R4-AGG-D5** (forced-colors audit) — no Windows probe.
- **R4-AGG-D7** (`preserveDrawingBuffer`) — carryover; essential for export path.
- **R4-AGG-D8** (`videoEncoder.ts` `window as unknown as` casts) — carryover.
- **R4-AGG-D9** (Nominatim CSP) — carryover; search path remains local-only.
- **R4-AGG-D10** (2-letter language codes) — copy-owner review pending.
- **R4-AGG-D11** (Google guide copy) — copy-owner review pending.
- **R4-AGG-D12** (`prefers-reduced-motion` spec) — out of cycle r6 scope.
- **R4-AGG-D13** (Lighthouse/LCP/INP e2e) — out of cycle r6 scope.
- **R5-AGG-D14** (FileUpload prop optionality) — cosmetic refactor pending.
- **R5-AGG-D15** (Toast onDismiss closure reallocation) — negligible cost.
- **R5-AGG-D16** (TimelineSelector buckets recompute) — acceptable at 250k-point max.
- **R5-AGG-D17** (buildReferenceGridData style reload) — <1 ms pass cost.

None of the exit criteria have triggered this cycle.
