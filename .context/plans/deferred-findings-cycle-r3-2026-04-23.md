# Deferred Findings — Cycle 3 (2026-04-23, orchestrator run r3)

Findings from `_aggregate.md` that are NOT scheduled in `cycle-r3-implementation-2026-04-23.md`.

All deferrals respect the repo's strict deferred-fix rules:
- Original severity preserved; not downgraded to justify deferral.
- Each item records file+line, concrete reason, and re-open exit criterion.
- No security/correctness/data-loss findings are deferred outright unless a repo rule permits. R3-SEC-2 is deferred only pending verification work, not because the repo condones silent CSP violations.
- Repo policies (GPG-sign, Conventional Commits + gitmoji, fine-grained commits, no `--no-verify`, no `Co-Authored-By`, Node 24 / Next 16 / React 19 / TypeScript 5.9+) apply whenever these are picked up.

---

## DF-R3-001 — `videoEncoder.ts` casts `window`/handle around `showSaveFilePicker`
- **Source finding**: R3-AGG-4 (R3-CR-2).
- **Severity / Confidence**: LOW / MEDIUM.
- **File**: `src/lib/videoEncoder.ts:173-183`.
- **Reason for deferral**: typing cleanup. TypeScript 5.9+ lib.dom has proper `ShowSaveFilePicker` types; removing the unknown-cast shim is purely cosmetic and does not change behavior. Out of scope for a single-attribute cycle.
- **Exit criterion**: Re-open when the videoEncoder module is next touched for any other reason (e.g., new codec, bitrate clamp changes, abort-cleanup enhancement).

## DF-R3-002 — Nominatim search vs. production CSP `connect-src 'self'`
- **Source finding**: R3-AGG-5 (R3-SEC-2 + T-3).
- **Severity / Confidence**: LOW / MEDIUM.
- **Files**: `src/components/JourneyCreator.tsx` (search fetch) vs. `src/app/layout.tsx:62` + `scripts/harden-static-export.mjs` (hardened prod CSP).
- **Reason for deferral**: Behavior under the hardened production CSP needs a hands-on verification — either the JourneyCreator's "Enable search" toggle is intentionally gated to fail in prod, or `harden-static-export.mjs` includes a relaxed `connect-src` directive. Needs a production-build run with the search toggle + network monitoring.
- **Repo-rule permission**: this is not "silently accepting" a CSP bypass — it is flagging that we need to verify whether the existing behavior is already correct. The fetch is user-gated and has no auth credentials attached. No data-loss.
- **Exit criterion**: Re-open by (a) running `npm run build` then serving `out/` locally, (b) enabling the JourneyCreator search, (c) observing whether the Nominatim request is blocked (CSP violation) or succeeds (and if so, verifying the allow-list in the hardened CSP).

## DF-R3-003 — `ElevationProfile` double-iterates elevations
- **Source finding**: R3-AGG-6 (R3-PERF-2).
- **Severity / Confidence**: LOW / MEDIUM.
- **File**: `src/components/ElevationProfile.tsx:20-60`.
- **Reason for deferral**: cosmetic; negligible runtime for typical tracks (<10k points).
- **Exit criterion**: Re-open when ElevationProfile gets any other performance-driven change.

## DF-R3-004 — `computeCameraForScene` rebuilds bbox every frame in overview mode
- **Source finding**: R3-AGG-7 (R3-PERF-3).
- **Severity / Confidence**: LOW / MEDIUM.
- **File**: `src/lib/camera.ts:154`.
- **Reason for deferral**: overview scenes are short by default (8% of timeline). A 100k-point bbox rebuild at 30 fps is <1% of export time today. Optimizing requires threading a bbox cache through the public API.
- **Exit criterion**: Re-open when a user reports export slowness on very-long tracks OR when `computeCameraForScene` gets any other change.

## DF-R3-005 — `SceneEditor` `role="slider"` lacks `aria-orientation`
- **Source finding**: R3-AGG-8 (R3-A11Y-3).
- **Severity / Confidence**: LOW / MEDIUM.
- **File**: `src/components/SceneEditor.tsx:170-184`.
- **Reason for deferral**: informational only — ARIA 1.2 defaults to horizontal; screen readers behave correctly without the attribute.
- **Exit criterion**: Re-open during the next accessibility pass (alongside DF-R2-008 for ElevationProfile slider upgrade).

## DF-R3-006 — `FileUpload` parsing-state `aria-label` doesn't swap
- **Source finding**: R3-AGG-9 (R3-UX-3).
- **Severity / Confidence**: LOW / MEDIUM.
- **File**: `src/components/FileUpload.tsx:206-210`.
- **Reason for deferral**: polish; spinner + disabled state already convey intent visually. A parsing-announcement would need a new i18n key.
- **Exit criterion**: Re-open during any i18n catalog extension or next a11y pass.

## DF-R3-007 — No antimeridian unit-test coverage
- **Source finding**: R3-AGG-10 (R3-TE-1).
- **Severity / Confidence**: LOW / MEDIUM.
- **Reason for deferral**: project uses Playwright-only testing; adding a dateline-crossing GPX fixture + test is a larger scope than this cycle's per-fix budget.
- **Exit criterion**: Re-open when a parser-reliability or geo-helper pass is scheduled (same trigger as DF-R2-001).

## DF-R3-008 — `videoEncoder.exportVideo` fallback recomputes cumulative distances
- **Source finding**: R3-AGG-11 (R3-DB-2).
- **Severity / Confidence**: LOW / MEDIUM.
- **File**: `src/lib/videoEncoder.ts:66`.
- **Reason for deferral**: no current-caller bug; every in-tree caller passes the arg.
- **Exit criterion**: Re-open when a new caller is added, OR when tightening the `videoEncoder` API.

## DF-R3-009 — Export clamp warning is console-only
- **Source finding**: R3-AGG-12 (R3-CR-C-3).
- **Severity / Confidence**: LOW / MEDIUM.
- **File**: `src/lib/videoEncoder.ts:60-62`.
- **Reason for deferral**: requires a new i18n key + toast integration; clamp paths are already bounded by UI inputs in the normal flow.
- **Exit criterion**: Re-open during the next i18n catalog extension.

## DF-R3-010 — Frame-break fallback sends user to `about:blank`
- **Source finding**: R3-AGG-13 (R3-CR-C-1).
- **Severity / Confidence**: LOW / MEDIUM.
- **File**: `src/app/layout.tsx:49`.
- **Reason for deferral**: edge case — only hits if both `window.top.location` assignment fails AND the page was framed. Behavior is conservative-safe (no data leak).
- **Exit criterion**: Re-open if a user reports the blank-page outcome and wants a "redirect to canonical origin" fallback.

## DF-R3-011 — `.context/reviews/` directory growth
- **Source finding**: R3-AGG-14 (R3-CR-C-5).
- **Severity / Confidence**: INFO.
- **Reason for deferral**: meta-process concern; per-cycle files are artifacts of the review-plan-fix loop and are auditable. An archival policy could compress older cycles. Not code.
- **Exit criterion**: Re-open when the review-artifact count becomes a discoverability blocker.

---

## Carry-over deferrals (from prior cycles) — re-validated as active

- DF-R2-001..DF-R2-017 (all from `.context/plans/deferred-findings-cycle-r2-2026-04-23.md`) — all items still apply to the current tree.
- DF-C17-001..DF-C17-019 minus -007 and -012 — active.
- DF-C4-001, DF-C4-002 — active.
- DF-C2-010 — active.
