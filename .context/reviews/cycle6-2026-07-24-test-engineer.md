# Cycle 6 test-engineer review — 2026-07-24

Reviewed revision: `099e85d8860456dea5e59cfa293a12defb27bd99`

## Outcome

Two new test gaps map to two concrete current defects. They are the same
canonical roots as `CR6-01`/`ARCH6-01` and `CR6-02`/`ARCH6-02`; they must not
be counted again in the aggregate.

## Inventory

- All 67 tracked `src/` paths were inventoried: 40 production modules/styles,
  one app icon, and 26 Vitest suites.
- All 12 scripts were inventoried, including the supervisor and its process
  fixtures, static server/hardening/smoke, generated-worker build, and both
  E2E launchers.
- The complete 118-case Playwright catalog, its MP4 helper, and all 19 route
  fixtures were mapped to behavior.
- All 19 public assets, root build/test/lint configuration, Pages workflow,
  README, and active project/review records were checked.

## TE6-01 — Preview tests omit no-op and lifecycle exits

- Severity: **Medium**
- Confidence: **High**
- Status: **Confirmed coverage gap tied to CR6-01**
- Regions:
  - `src/components/SceneEditor.test.ts:241-311`
  - `src/lib/usePlaybackController.test.ts:190-205`
  - `e2e/travelback.spec.ts:2175-2225,2713-2785`
  - production root at `src/components/SceneEditor.tsx:492-650`

Current tests cover a changed pointer commit, pointer cancellation, keyboard
publication, ordinary keyboard clear, and Escape closing from focused
controls. They do not compose the terminal paths:

- move a camera slider away and exactly back, publish at least one preview,
  then pointerup;
- publish a keyboard preview, then unmount/close with Escape before the
  originating key's keyup/blur.

The first path calls `endPreview(false)` but has no commit to restore the
camera. The second cancels only pending animation work. Add component tests
that require a final `onPreviewScene(null)` and no scene publication for the
net-zero case, plus an unmount test that restores an already-applied preview
once. Add one dev-map assertion at non-midpoint playback progress. Static E2E
can verify state and absence of error, but cannot replace the live-camera
comparison because the production debug API is intentionally absent there.

## TE6-02 — Scene/export tests omit a net-zero SceneEditor transaction

- Severity: **Medium**
- Confidence: **High**
- Status: **Confirmed coverage gap tied to CR6-02**
- Regions:
  - `src/components/SceneEditor.test.ts:313-365`
  - `e2e/travelback.spec.ts:3648-3696`
  - production root at `src/components/SceneEditor.tsx:222-267`

The component suite asserts that a changed range drag publishes once. The E2E
suite asserts that a Timeline no-op preserves a completed export. No test
drags a scene boundary away and back to its origin.

Add:

1. A component test whose final pointer position equals the origin and that
   expects zero `onChange`/`onScenesCommitted` calls.
2. A session/E2E regression that retains the same completed export URL/result
   after that gesture.
3. A semantic-equality unit around the session invalidation boundary so a
   future new-array/same-values publication cannot revoke the artifact.

## Verification and execution limits

`npx vitest run src/components/SceneEditor.test.ts src/lib/usePlaybackController.test.ts --reporter=dot`
passed **2 files / 30 tests**. Their green result is useful baseline evidence
but does not exercise either missing composition above.

Per the cycle directive, I did not run the full unit suite, E2E, Playwright,
the supervisor, a server, Chromium, or any browser-capable command. No Chrome
process was launched by this workstream, so no browser process required
termination.
