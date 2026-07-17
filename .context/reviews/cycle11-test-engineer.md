# Cycle 11 test-engineer review

Target: `7273d464fdce24fc06350ce1444c3a2e8d26829d`.

## Outcome

Four behavior gaps remain behind green-path tests: Journey tests never mutate
the route between Done and Create; hotkey/E2E tests never assert SceneEditor is
closed by Escape from a focused control; sample tests never require a prior
local error to clear on success; and Cycle 2's held-sample regression covers a
manual Journey but not an unsupported drop. The first three are fresh coverage
roots tied to confirmed product failures; the fourth reopens `AG2-02/P04`.

## Test and repository inventory

- Mapped all 18 Vitest files / 431 recorded target-code tests, the complete
  3,034-line Playwright specification, 19 GPX/KML/Google/geometry fixtures,
  both Playwright configurations, Vitest/TypeScript/ESLint/Next/PostCSS config,
  worker generation/parity, static hardening/serve/smoke scripts, package scripts,
  workflow, and lock metadata.
- Coverage tracing included parser bounds and every supported Google shape,
  worker settlement, sample/import ordering, map readiness and style recovery,
  playback/seek, trim/elevation/segments, Journey pointer lifecycle, scenes,
  localization/hydration, dialogs/focus, export ready/fallback/picker/cancel,
  responsive geometry, CSP/base path, and opt-in real export.
- Read current context, Cycle 10 aggregate/plan, pending/blocked/deferred ledgers,
  and historical tests/plans for deduplication. All 113 review-relevant product
  paths were inventoried; binary/generated artifacts were handled by provenance.
- Fresh primary-worktree lint/type/unit/worker commands could not launch because
  the pre-existing install lacks ESLint, Next, Vitest, and esbuild executables.
  No install/server mutation was made. Audit found zero vulnerabilities. The
  accepted Cycle 10 exact-code matrix is historical evidence only.

## Findings

### TE11-01 — Journey tests validate phases separately, not mutation between them

- Severity / confidence: Medium / High
- History: Fresh
- Product evidence: `src/components/JourneyCreator.tsx:336-369,705-721,925-962`
- Missing coverage: `src/components/JourneyCreator.test.ts:127-334`;
  `e2e/travelback.spec.ts:1046-1091`

Current units test source clearing, readiness, and drag terminals. The E2E adds
two coordinates, presses Done, names, and immediately creates. None deletes a
point while confirmation is open. Live exact-HEAD behavior accepted both one
and zero points; zero became a non-hydrated `0 / 0` workspace, not an immediate
crash.

Regression: expose or drive the registered point-click handler after Done,
assert Create disables below two, and assert `onComplete` is never called with
zero/one points. Add a browser case for 2 -> Done -> delete -> Create, checking
both UI feedback and absence of loaded invalid track state.

### TE11-02 — The E2E comment says Escape closes SceneEditor but never checks it

- Severity / confidence: Medium / High
- History: Fresh
- Product evidence: `src/lib/usePlaybackController.ts:199-249`
- Masking coverage: `e2e/travelback.spec.ts:2994-3010`; no hotkey unit coverage
  exists in `src/lib/usePlaybackController.test.ts:81-126`

The KML journey presses Escape, then clicks Export and only asserts the Export
dialog. Both panels can remain true, so the test passes while its comment is
false. Live, Camera retained focus and the scene panel stayed visible after
Escape.

Regression: render the page/hotkey router with focus on the Camera trigger and
representative SceneEditor button/input/select/range, press Escape, and assert
the panel hidden plus focus policy. Keep ModalDialog/export Escape cases separate
so fixing global dispatch does not double-close a modal.

### TE11-03 — Sample success tests begin from a clean FileUpload state

- Severity / confidence: Medium / High
- History: Fresh
- Product evidence: `src/components/FileUpload.tsx:23-27,161-190,219-244`
- Missing coverage: `src/components/FileUpload.test.ts:38-155`;
  `e2e/travelback.spec.ts:907-915,2960-2974`

The unsupported-file E2E stops after confirming the landing error. The sample
test starts clean. Their composition is broken: unsupported input -> Sample
loads the route but retains the rejection alert indefinitely over the map.

Regression: in a FileUpload component test, establish local error then invoke
the sample CTA and rerender `hasTrack=true`; require no alert. Mirror it in one
browser test so the loaded overlay cannot preserve contradictory error copy.

### TE11-04 — Held-sample coverage omits locally rejected drop intent

- Severity / confidence: Medium / High
- History: Reopened/incomplete Cycle 2 `AG2-02/P04`
- Product evidence: `src/components/FileUpload.tsx:64-66,126-140`;
  `src/app/page.tsx:414-447,603-610`
- Partial coverage: `e2e/travelback.spec.ts:917-937` and
  `src/components/FileUpload.test.ts:80-116`

The existing delayed-sample case proves Draw Route wins. Callback-order coverage
proves accepted picker files announce import. Neither exercises the unsupported
drop preflight that returns before `onImportStart`. The live held-fetch test
showed the old sample replacing the newer error intent.

Regression: hold `/sample-trip.gpx`, click Sample, dispatch a DataTransfer `.txt`
drop, require the sample request to abort/become stale, release it, and assert
landing recovery remains with no loaded title. Also assert accepted and rejected
picker/drop paths notify the intent owner exactly once.

## Matrix evidence and limitations

| Area | This review | Result |
| --- | --- | --- |
| Landing/sample/accessibility | Exact-HEAD agent-browser | Pass, except stale composed error |
| Playback + active seek | Exact-HEAD mobile session | `0 -> .049`; seek `.083 -> .13` pass |
| Journey confirmation mutation | Exact-HEAD desktop session | One/zero-point failure confirmed |
| Focused Escape | Exact-HEAD desktop session | SceneEditor remained open |
| Mobile export states | Localhost developer stub | Truthful focused `Video ready`; UI only |
| All formats / real MP4 | Accepted Cycle 10 identical-code matrix | Historical, not rerun |
| Fresh lint/type/unit/worker | Primary install incomplete | Unavailable, not passed |

## Final test sweep

The last pass reviewed retries/skips, force clicks, assertion destinations,
fixture cleanup, stale routes, worker parity, host locale/time zone, RAF/focus,
pointer terminal events, mobile geometry, export/save state, and static/dev
parity. The immediate zero-point crash hypothesis was rejected by live evidence;
tests should assert the actual invalid/non-hydrated workspace. No fifth missing
right-reason regression mapped to a new product root.
