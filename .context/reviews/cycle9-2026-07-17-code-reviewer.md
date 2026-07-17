# Cycle 9 code review — 2026-07-17

## Result

**New actionable findings: 1.** CR9-01 is a Medium-severity, High-confidence, confirmed camera-continuity defect. The five Cycle 8 repairs remain present and their focused regressions pass. No additional correctness, dependency-security, or delivery root cause survived the final missed sweep.

## Scope and provenance

- Reviewed exact HEAD `342b8c13f005c3abd072dddb27f002722c3fb1e8` against the pre-Cycle-8 implementation baseline `81342b7fab1cc2577909b63025bb2452dcb5446b`, including commits `44ddbba`, `3e39ed7`, `6dda59f`, `0aa9760`, and `df1955b`.
- Enumerated all 913 tracked files: 55 under `src` (37 textual production files, 17 Vitest suites, and the favicon), 20 E2E files (the full 2,793-line specification plus 19 fixtures), 19 public assets, 7 scripts, 11 root/delivery configuration files including the Pages workflow, README, 39 legacy `plan/` documents, and 761 `.context/` files.
- Semantically reviewed every current production source, test, E2E fixture/specification, public text asset, script, configuration, workflow, README section, and active project/development/review/plan document. Historical plans/reviews were catalogued and searched for provenance and duplicate suppression. Binary WOFF2/ICO payloads were not decoded; their references and delivery paths were checked. The generated worker was reviewed for source parity and checked mechanically.
- The older `.context/reviews/comprehensive-deep-code-review-2026-04-18.md:193-197` raised a generalized transition-discontinuity concern, but it did not establish the current paired-branch reset or internal-gap behavior and it was absent from the Cycle 8 active ledger. CR9-01 re-confirms the exact current failure with deterministic one-sided values.

## CR9-01 — Scene transitions restart at a shared boundary and at both ends of an internal gap

- **Location:** `src/lib/camera.ts:540-547,549-576,604-631`; reachable presets at `src/lib/camera.ts:394-445,475-519`; editable gaps at `src/components/SceneEditor.tsx:356-405,444-490`; preview/playback/export consumers at `src/app/page.tsx:500-517`, `src/components/MapView.tsx:803-817`, and `src/lib/videoEncoder.ts:228-237`; ineffective coverage at `src/lib/camera.test.ts:255-265,285-295` and `e2e/travelback.spec.ts:1856-1884`.
- **Problem:** scene lookup assigns an exactly shared endpoint to the earlier scene because both ends are inclusive and the loop takes the first match. The outgoing branch then finishes A→B at the boundary, but immediately after it the incoming branch begins again from A-end. For non-contiguous A/B, the same outgoing/incoming branches run even though the dedicated gap branch already owns a complete A-end→B-start interpolation, so that interpolation is reset at both gap endpoints and replayed.
- **Confirmed contiguous failure:** on the straight eastbound test track, let A `[0,.5]` have zoom/pitch/offset `10/20/0` and B `[.5,1]` have `18/70/90`. With the default `0.03` transition, progress `.5` returns B-start (`18/70/180°`), while `.500001` returns approximately A-end (`10.0000001/20.0000007/90.0000012°`) before blending toward B a second time. The one-sided limits therefore differ by about 8 zoom levels, 50° pitch, and 90° bearing.
- **Confirmed gap failure:** for A `[0,.4]` and B `[.6,1]`, just before/.at `.4` the outgoing branch is already at B-start (track center about `.6`); just after `.4` the gap branch resets to A-end (center about `.4`) and traverses forward. Just before `.6` it reaches B-start, while at/just after `.6` B's incoming branch resets to A-end and traverses forward yet again. On the test track each reset is about `0.2°` longitude, roughly 22 km, in addition to the parameter snap.
- **Failure scenario:** select the default Cinematic or Dynamic preset, whose adjacent scenes use different modes/parameters, and play or export across any boundary. A camera snap is baked into both live playback and encoded frames. Deleting or resizing a scene to leave an internal gap can add two large backward resets around that gap.
- **Fix:** give each transition interval one owner. For touching scenes, resolve one boundary-centered interval `[boundary - halfTransition, boundary + halfTransition]` and perform one monotone A-end→B-start blend independent of inclusive scene selection. For a real internal gap, let the gap interpolation exclusively own `[A.end, B.start]` and skip adjacent per-scene transition branches at those endpoints. Preserve stable `elapsedSec=0` endpoint cameras for rotation-dependent modes.
- **Regression:** use deliberately different centers, zoom, pitch, and bearing. Assert continuity and monotonic movement immediately before/at/after a touching boundary and both endpoints of a non-contiguous gap; retain a rotation-mode case. The current unit boundary case gives A and B identical parameters and only checks that fields exist, while the scene E2E selects the one-scene Simple preset, so neither can detect this defect.
- **Severity:** Medium.
- **Confidence:** High.
- **Status:** Confirmed by deterministic source evaluation and cross-consumer trace.

## Cycle 8 comparison

The implemented Cycle 8 contracts remain intact: same-segment untimed Google revisits are preserved through direct/worker/upload paths; post-drag click suppression expires and is shared by both handler orders; locale hydration starts from deterministic English and resolves preference after mount; the two Spanish phrases are corrected and pinned; and current-style track hydration retries until a revision-owned readiness event succeeds. Their new tests are included in the 400-test passing suite.

## Dependency and library risk

- `npm audit --json` reports 0 vulnerabilities across 579 installed dependency entries. Lockfile v3 contains 580 package records including the root; all 579 resolved tarballs use `registry.npmjs.org` and have integrity metadata. Five locked transitive packages declare install scripts (`esbuild`, two `fsevents` versions, `sharp`, and `unrs-resolver`); no unpinned alternate host or missing integrity was found.
- Current registry lookup found `tailwindcss` and `@tailwindcss/postcss` 4.3.3, released 2026-07-16, while the lock retains 4.3.2. The declared `^4.3.2` ranges already admit the patch, no advisory or current failure was found, and this is recorded as a non-counted freshness observation for the next intentional lock refresh.
- Registry `latest` is also ahead by a major for `@types/node`, ESLint, and TypeScript. Node typings intentionally match the configured Node 24 LTS, and the locked `typescript-eslint` peer range is `<6.1.0`, so those are compatibility migrations rather than safe blind bumps. `npm ls --depth=0` resolved the declared graph but reported five untracked extraneous WASM-helper directories in this working install; none is represented in the reproducible lock, and no cleanup was performed.

## Existing ledger, not re-counted

B01 (High/High: CI omits `npm test`), B02 (Medium/High: build inherits Pages/OIDC writes), B03 (Medium/High: README says MIT without a root `LICENSE`), B04 (Medium/Medium: `preserveDrawingBuffer` hardware evidence), and performance deferrals D01-D04 remain exactly as recorded in `.context/reviews/_aggregate.md:31-43`. They require authority, legal input, or representative measurement and are not new Cycle 9 findings.

## Validation and final missed sweep

- `npm run lint` — passed.
- `npx tsc --noEmit --incremental false` — passed.
- `npm test -- --run` — 17/17 suites, 400/400 tests passed.
- `npm run check:worker` — generated worker current.
- `npm audit --json` — 0 vulnerabilities.

No server, build, browser, deployment, or external mutation was started. The final sweep rejected a cross-segment interpolation hypothesis after following plateau binary-search and segment-local endpoint behavior; retained export-finalization resources are already documented as a library limitation; and the new MapView retry removes its listeners synchronously on success/staleness. Those are not additional findings. Coverage was exhaustive for current review-relevant files and cross-file interactions, with historical documents used for provenance rather than re-reviewing obsolete implementation snapshots.
