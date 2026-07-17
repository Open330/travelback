# Cycle 9 Implementation Plan — 2026-07-17

Source: `.context/reviews/_aggregate.md` (7 scheduled implementation items: 6 confirmed roots plus 1 explicitly authorized Medium/Medium touch hardening item; 1 formal manual-validation item; 4 authority/legal/evidence-gated carryovers; and 4 measured performance deferrals).

## Objective

Implement every authorized Cycle 9 item without deployment, preserve work that requires new authority or external evidence, and retain the user's final-cleanup instruction for the loop's final stop condition. No recorded run-created path is deleted during this cycle.

## Rules and constraints

- No deployment command, workflow dispatch, CI/CD edit, production mutation, deletion, external communication, or pre-existing process termination.
- Remain on `codex/review-plan-fix-2026-07-16`; never switch to or push `main`.
- Do not contact or interfere with ports 3114, 3106, or 9323, or any process owned outside this cycle. The UX helper on isolated port 48179 belongs to unified exec session 6306 and must exit only through its natural bounded lifecycle; do not reuse, stop, or kill it.
- Use `apply_patch` for authored edits and preserve unrelated user changes.
- Create one coherent GPG-signed Conventional Commit + gitmoji commit per finding. Run `git pull --rebase` before every push, verify signatures, and push only the named review branch.
- Write or strengthen a focused regression before changing each behavior, confirm the failure where mechanically observable, then implement the smallest fix. AG9-07 remains transparent that physical-device failure was not reproduced; its test first pins the missing touch contract.
- Run focused regressions for each fix and the complete configured matrix: lint, typecheck, unit, high-severity audit, build, static smoke, development E2E, and production-static E2E.
- Run the production-static real-WebCodecs export with `TRAVELBACK_REAL_EXPORT=1`, Playwright retries disabled, and one worker; require an MP4 larger than 1 KiB containing an `ftyp` box.
- Run the complete build/browser gate matrix from an isolated exact-HEAD physical mirror with isolated ports. Record every new mirror/helper/artifact path in `.context/plans/user-injected/pending-next-cycle.md` immediately and never delete it during the active loop.
- `.github/workflows/deploy-pages.yml` remains read-only until the user explicitly authorizes that destructive CI/CD edit. Do not infer license facts or substitute emulation for representative hardware/perceptibility evidence.
- The requested Ralph helper is not installed. Execute this approved regression-first plan persistently through the review-plan-fix fallback, recording status and gate-driven repairs here.

## Wave 0 — Exclusive camera timeline ownership

### P01 — Make scene transition and gap intervals monotone (AG9-01)

- Severity/confidence: Medium / High
- Files: `src/lib/camera.ts`, `src/lib/camera.test.ts`
- Work: resolve adjacent scene pairs before ordinary scene lookup. Give a real internal gap exclusive ownership of `[previous.end, next.start]` with its stable elapsed-zero boundary cameras. Give touching scenes one symmetric half-open boundary window using `halfWidth = min(transitionDuration / 2, previousDuration / 2, nextDuration / 2)`, so transitions around a short middle scene can meet but never overlap. Blend moving-mode centers at current global progress while tapering only active rotation elapsed toward stable elapsed-zero anchors at the shared boundary; use explicit right-biased/half-open ordinary scene ownership. Bypass transition math for zero/non-finite duration.
- Acceptance: touching scenes never reach B then reset toward A; a supported gap traverses A→B exactly once with no backward reset at either endpoint; transition-window edges join ordinary scene motion without center freeze; unequal short/long scenes, progress 0/1, and zero transition duration are finite and deterministic.
- Focused verification: table-driven numeric samples at left edge / boundary / right edge ± epsilon, both gap endpoints ± epsilon, unequal scene durations, distinct center/zoom/pitch/bearing, and a rotation mode; camera suite, lint, and typecheck.
- Status: Pending.

## Wave 1 — Responsive scene and timeline interaction geometry

### P02 — Contain Scene Editor camera selectors (AG9-02)

- Severity/confidence: Medium / High
- Files: `src/components/SceneEditor.tsx`, `e2e/travelback.spec.ts`
- Work: make the mode select a `min-w-0 w-full` flex child and constrain its row/card as needed without clipping option text or the native disclosure affordance.
- Acceptance: every camera-mode select's border box remains within the Scene Editor panel content box at 1440x1000 and 390x844, including Korean and the longest shipped option labels; selection behavior remains unchanged.
- Focused verification: retries-disabled Scene Editor E2E geometry/selection case, lint, and typecheck.
- Status: Pending.

### P03 — Keep full timeline endpoint hitboxes inside the interaction surface (AG9-05)

- Severity/confidence: Low / High
- Files: `src/components/TimelineSelector.tsx`, `e2e/travelback.spec.ts`
- Work: clamp each 44px endpoint hitbox inside the timeline container at the 0% and 100% extremes while preserving the represented ratios and drag/keyboard behavior.
- Acceptance: both endpoint boxes retain at least 44x44 nominal geometry and are wholly inside the viewport/container at 390x844; Home/End still represent exactly 0%/100%; mouse, keyboard, and touch trimming remain correct.
- Focused verification: mobile endpoint intersection E2E plus existing timeline component suite, lint, and typecheck.
- Status: Pending.

### P04 — Give selected-region dragging an explicit touch contract (AG9-07)

- Severity/confidence: Medium / Medium
- Files: `src/components/TimelineSelector.tsx`, `src/components/TimelineSelector.test.ts`, `e2e/travelback.spec.ts`
- Work: apply `touchAction: 'none'` to the selected-region gesture owner, matching both endpoint handles. Preserve the passive global listener and cancellation lifecycle; do not claim synthetic CDP proves physical Safari/Android behavior.
- Acceptance: the region computes `touch-action: none`; a trimmed range moves under a CDP touch drag and commits once; taps still seek; handle behavior and cancellation remain intact.
- Focused verification: component DOM contract, retries-disabled mobile timeline touch case, existing timeline suite, lint, and typecheck.
- Status: Pending.

## Wave 2 — Export focus continuity

### P05 — Focus the rendering-state Cancel control (AG9-03)

- Severity/confidence: Medium / High
- Files: `src/components/ExportPanel.tsx`, `src/components/ExportPanel.test.ts`, `e2e/travelback.spec.ts`
- Work: when the idle form changes to rendering, focus the Cancel control with `preventScroll` after it mounts. Keep focus inside the same modal, retain Escape cancellation, focus the success heading on completion, and restore the opener when the dialog closes.
- Acceptance: Start Export → rendering never leaves `document.activeElement` on `body`; Cancel is focused during the actionable interval; success/cancel/opener focus contracts remain valid.
- Focused verification: component rerender regression and held-frame/stub browser transition, lint, and typecheck.
- Status: Pending.

## Wave 3 — Truthful map semantics

### P06 — Hide the decorative playback marker from assistive technology (AG9-04)

- Severity/confidence: Low / High
- Files: `src/components/MapView.tsx`, `e2e/travelback.spec.ts`
- Work: assign decorative/presentation semantics to the custom marker element before MapLibre constructs/attaches it so the dependency does not synthesize a generic button role/name. Keep visual animation and pose updates unchanged.
- Acceptance: no `button "Map marker"` appears in the loaded-route accessibility tree; the HTML marker, GeoJSON marker source, trail head, playback, and export pose remain synchronized.
- Focused verification: loaded-route role assertion plus related map/pose E2E, lint, and typecheck.
- Status: Pending.

## Wave 4 — Natural Korean map-style names

### P07 — Replace Korean attributive fragments with standalone style names (AG9-06)

- Severity/confidence: Low / High
- Files: `src/lib/i18n.ts`, `src/lib/i18n.test.ts`
- Work: change Korean Positron/Dark labels from `밝은` / `어두운` to parallel standalone `라이트` / `다크` names. Use the Korean naturalization guidance to verify the complete composed phrases without altering keys or other locales.
- Acceptance: the toolbar renders `지도: 라이트` and `지도: 다크`; all locale dictionaries remain key-complete; reviewed phrases are pinned.
- Focused verification: i18n suite, lint, and typecheck.
- Status: Pending.

## Formal manual-validation work

### M9-01 — Verify map-canvas focus-ring perceptibility

- Severity/confidence: Low / Medium
- Scope: MapLibre canvas emitted by `src/components/MapView.tsx:1220-1265`; clipping in `src/app/globals.css:19-25`
- Reason: exact geometry and computed style suggest the 1px user-agent outline can be clipped at viewport edges, but the review did not establish perceptibility loss reliably.
- Exit: keyboard-focus the canvas on representative desktop/mobile browsers at 100% and 200% zoom in light, dark, and forced-colors modes; capture and measure visible focus pixels. If any edge lacks a perceptible indicator, add an inset authored focus style and computed-style/geometry regression.
- Status: Deferred pending representative visual evidence; do not substitute synthetic geometry for the exit criterion.

## Carried-forward blocked work

### B01 — Add the unit test gate to Pages CI

- Severity/confidence: High / High
- Scope: `.github/workflows/deploy-pages.yml:26-32`
- Block: CI/CD modification requires explicit user confirmation. Exit: authorize the edit; add `npm test`, validate syntax, and do not dispatch or deploy.

### B02 — Narrow Pages workflow permissions

- Severity/confidence: Medium / High
- Scope: `.github/workflows/deploy-pages.yml:8-45`
- Block: same CI/CD authority boundary. Exit: authorize the edit; scope read access to build and Pages/OIDC writes to deploy only.

### B03 — Resolve the README MIT claim without a root grant

- Severity/confidence: Medium / High
- Scope: `README.md:225-227`, absent root `LICENSE`
- Block: repository does not establish intended license, holder, or year. Exit: owner provides exact legal intent and attribution.

### B04 — Measure preserved WebGL buffers on representative hardware

- Severity/confidence: Medium / Medium
- Scope: `src/components/MapView.tsx:920-930`
- Block: emulation cannot establish GPU, memory, battery, or thermal cost. Exit: representative comparative p50/p95 frame/memory plus battery/thermal evidence.

## Carried-forward performance deferrals

- **D01 — High/High:** profile and isolate broad root playback-progress updates while preserving seek, camera, scenes, and export.
- **D02 — Medium/High:** profile and distance-downsample elevation paths with endpoint/extrema guarantees.
- **D03 — Medium/High:** measure and replace O(n) waypoint-drag preview scans with incremental or throttled work plus exact terminal reconciliation.
- **D04 — Medium/High:** profile the second per-frame export idle wait and change it only after proving redundancy.

## Retained user-injected final-cleanup instruction

### U-2026-07-17-01 — Final cleanup of run-created trees

- User wording (verbatim): “지금 많은 tree 만들어져있는데 모두 잘 정리하고 마무리해 끝날때.”
- Status: Ingested and retained for the loop's final stop condition. It is not current Cycle 9 implementation work and is not complete.
- Required behavior: remove only temporary worktrees, validation mirrors, copied trees, and artifacts proven to have been created by this review-plan-fix run. Preserve primary, pre-existing, and user-owned trees and repository data. Do not stop processes to clean up.
- Inventory authority: `.context/plans/user-injected/pending-next-cycle.md`. The Cycle 9 UX tree/helper is recorded. Append every later Cycle 9 validation path immediately before it is used.
- No listed path is deleted during Cycle 9.

## Required final gate matrix

1. `npm run lint`.
2. `npm run typecheck`.
3. `npm run test`.
4. `npm audit --audit-level=high`.
5. `npm run build`.
6. `npm run smoke:static`.
7. `npm run test:e2e`.
8. `npm run test:e2e:static:ci`.
9. Production-static real-MP4 smoke with `TRAVELBACK_REAL_EXPORT=1`, retries disabled, one worker, output >1 KiB, and `ftyp` asserted.

## Final verification record

Pending implementation.

## Completion gate

Pending. P01-P07 and every focused/full gate must pass. M9-01, B01-B04, D01-D04, and final cleanup retain their exact exit criteria.
