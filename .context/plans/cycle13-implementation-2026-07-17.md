# Cycle 13 Implementation Plan — 2026-07-17

Source: `.context/reviews/_aggregate.md` at review target
`86e35c56ef2c5e8231a7a4009e19f7a94b3ceb84`.

## Objective

Fix all four new Cycle 13 roots and the one confirmed incomplete base-path
hardening edge without deployment or workflow changes. Preserve every manual,
authority-, legal-, evidence-, performance-, and final-cleanup carryover under
its existing exit criterion.

## Rules and constraints

- No deployment command, workflow dispatch/edit, production mutation, external
  communication, destructive cleanup, or manual process termination.
- Use `apply_patch` for authored edits and package/build tools only for normal
  mechanical output. Work only in the primary worktree; create no temporary
  copy, worktree, replacement dependency tree, or install.
- Preserve unrelated and concurrent changes. Do not reuse, remove, stop, or
  kill an existing path, process, port, browser, or server.
- Create GPG-signed Conventional Commit + gitmoji commits, one coherent fix per
  commit. Run `git pull --rebase` before every push and push every iteration.
- Browser verification is Prompt 3 only. Before and after every browser command,
  require zero Playwright/Chromium/agent-browser processes and a free dedicated
  port. Run development, static, and real-MP4 commands sequentially with one
  worker and zero retries, allowing each owned lifecycle to exit naturally.
- Do not claim physical-iOS, representative GPU, legal, CI, external share, or
  production evidence that this cycle does not obtain.

## P01 — Fill the first available scene coverage gap (AG13-01)

- Severity / confidence: Medium / High
- Files: `src/components/SceneEditor.tsx`,
  `src/components/SceneEditor.test.ts`
- Work:
  - Derive ordered free ranges across `[0, 1]` from normalized scene coverage.
  - Select the first gap that can hold `MIN_SCENE_SPAN`, create a flyover scene
    of at most 15%, and commit it with the existing normalization owner.
  - Disable Add only when no usable range exists. Keep the control's visible
    and accessible disabled state truthful rather than silently returning.
- Acceptance:
  - Full coverage disables Add and produces no commit.
  - Deleting an interior scene then choosing Add inserts inside that exact gap
    without shifting either surviving scene.
  - Leading, interior, trailing, and empty coverage use the same helper and all
    generated ranges meet the minimum span.

## P02 — Share one strict base-path grammar (R13-01)

- Severity / confidence: Medium / High
- History: reopened/incomplete Cycle 2 `N07/N28`; not a fresh root.
- Files: a pure shared base-path module, `src/lib/env.ts`, `next.config.ts`,
  `scripts/serve-static.mjs`, `scripts/smoke-static.mjs`,
  `playwright.static.config.ts`, `src/lib/env.test.ts`
- Work:
  - Establish a single normalization function consumed by build, browser,
    static server, smoke, and static Playwright configuration.
  - Normalize root/leading/trailing slashes, accept literal-dot names such as
    `release..candidate`, reject actual `.`/`..` segments, and throw a clear
    configuration error instead of silently converting an invalid mount to
    root.
  - Preserve each caller's existing external root representation (`''` for
    Next/client URL prefixes and `'/'` only at the server CLI boundary).
- Acceptance:
  - One table covers undefined/empty/root, `/travelback`, nested paths,
    repeated edge slashes, `/release..candidate`, and real dot segments.
  - No configuration surface retains a local normalizer.
  - The default `/travelback` build/static contracts and root-host override
    continue to use identical client and server prefixes.

## P03 — Keep global notifications outside the inert app subtree (AG13-02)

- Severity / confidence: Medium / High
- Files: `src/components/Toast.tsx`, `src/app/page.tsx`,
  `src/styles/vitro-base.css`, new focused Toast/modal component coverage,
  optionally existing export component/E2E assertions
- Work:
  - Portal the stable Toast live region to `document.body`, outside the app root
    that ModalDialog marks inert and `aria-hidden`.
  - Preserve server-safe rendering, timer/dismiss ownership, visual stacking,
    and track-aware bottom positioning without querying hidden UI state.
  - Keep notifications nonmodal and do not weaken ModalDialog's inert/focus
    contract or solve the issue with z-index alone.
- Acceptance:
  - With a composed app root and open ModalDialog, a newly added Toast has no
    inert or `aria-hidden` ancestor and the live region remains mounted.
  - Track-loaded and landing positions retain their current offsets.
  - Export cancellation/failure still returns focus to the idle heading while
    exposing the localized reason and preserving opener restoration.

## P04 — Retain semantic message data across locale changes (AG13-03)

- Severity / confidence: Low / High
- Files: `src/components/FileUpload.tsx`, `FileUpload.test.ts`,
  `src/components/JourneyCreator.tsx`, `JourneyCreator.test.ts`,
  `src/components/SceneEditor.tsx`, `SceneEditor.test.ts`
- Work:
  - Store FileUpload error keys or safe dynamic payloads, not complete rendered
    recovery sentences; translate the key and recovery hint during render.
  - Store Journey Creator's invalid-coordinate key instead of translated text.
  - Replace SceneEditor warning strings with structured warning records for
    removal, boundary adjustment, generic normalization, and undo conflict;
    render them through the current locale and preserve names/range values.
- Acceptance:
  - Trigger each retained message in English, rerender with Korean, and assert
    visible/alert/live-region text changes without clearing its semantic state.
  - Dynamic file-size details remain safe and format-specific while the
    recovery hint follows the current locale.
  - Existing placeholder-like scene-name formatting remains literal and all
    current async invalidation/normalization behavior stays green.

## P05 — Separate semantic accent and text foreground tokens (AG13-04)

- Severity / confidence: Medium / High
- Files: `src/styles/vitro-base.css`, FileUpload, JourneyCreator, SceneEditor,
  ExportPanel, GoogleGuide, and a deterministic semantic-token contract test
- Work:
  - Add `--warn-fg` and `--err-fg` with light-theme values that meet at least
    4.5:1 against the lightest and darkest declared light surfaces.
  - Add bright dark-theme foreground overrides that retain equivalent contrast.
  - Use foreground tokens only for normal text; retain `--warn`/`--err` for
    borders, icons, fills, and other non-text accents.
- Acceptance:
  - A pure contrast test evaluates declared foreground/background pairs for
    default/light and dark modes at 4.5:1 or better.
  - Every 10–14px warning/error text consumer uses the foreground token; accent
    borders and Toast status indicators remain on the original accent token.
  - Both themes retain readable recovery, warning, and guide copy.

## P06 — Verification, documentation, and exact-head closure

- Update this plan and `.context/plans/README.md` only after corresponding
  implementation and focused regressions pass.
- Preserve `M10-01`, `M9-01`, `B01`–`B04`, `D01`–`D04`, and
  `U-2026-07-17-01` without silently dropping or widening them.
- Required exact-head gates, sequentially:
  1. `npm run lint`
  2. `npm run typecheck`
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
  closure. Record any gate-driven repair as its own signed/pushed commit and
  count it in `GATE_FIXES`.

## Completion — 2026-07-18

- P01–P05 are complete. Scene creation now fills the first usable coverage
  gap, every build/runtime/static consumer shares the same strict base-path
  grammar, Toast announcements remain outside a modal's inert subtree,
  retained recovery state follows the current locale, and semantic warning/
  error text uses contrast-safe foreground tokens.
- Two E2E-only gate repairs are complete: export completion waits for the
  save-picker callback handshake, and map-style cycling waits for each
  requested style revision before advancing. Both previously flaky cases
  passed in the final full static matrix.
- Exact-head non-browser gates passed: lint, typecheck, 21 Vitest files / 472
  tests, audit with 0 vulnerabilities, generated-worker parity, Next 16.2.10
  production build, and static smoke.
- Development Playwright passed 110 tests with the one opt-in real-export case
  expectedly skipped; the final static Playwright rerun passed the same 110 +
  1 expected skip in 5.8 minutes. Both used one worker and zero retries.
- The isolated production-static WebCodecs export passed 1/1 in 49.2 seconds
  with one worker and zero retries. Its assertion verified output larger than
  1 KiB and `ftyp` at bytes 4–7.
- Every browser command ran sequentially and ended naturally with its dedicated
  port free and zero Playwright/Chromium/agent-browser processes. No deployment,
  workflow edit/dispatch, production mutation, destructive cleanup, or manual
  process termination occurred.
- All five findings, P01–P06, and both gate-driven repairs are complete. The
  explicit non-implementation ledger below retains its existing exit criteria.

## Explicit non-implementation ledger

- `M10-01`: physical iOS Safari safe-area and dynamic browser-chrome evidence.
- `M9-01`: representative zoom/forced-colors canvas-focus evidence.
- `B01`: workflow omits `npm test`; requires explicit CI/CD edit authority.
- `B02`: workflow-wide Pages/OIDC writes; requires explicit CI/CD edit authority.
- `B03`: README MIT claim lacks owner-supplied holder/year/legal intent.
- `B04`: `preserveDrawingBuffer` requires representative GPU/memory/battery/
  thermal evidence.
- `D01`–`D04`: broad playback rerenders, elevation downsampling, Journey drag
  distance cost, and duplicate export idle wait retain their measured exits.
- `U-2026-07-17-01`: final-loop provenance cleanup remains open and is not
  authorized during this cycle.
