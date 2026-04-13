# Implementation Plan: Address Ultradeep Code Quality Review (2026-04-13)

**Source review:** `.context/reviews/ultradeep-code-quality-review-2026-04-13.md`  
**Goal:** fix the deep code-quality issues around track-session isolation, scene correctness, parser fidelity, playback performance, release verification, and maintenance risk.

---

## Progress update

- [x] Phase A — isolate track-scoped session state
- [ ] Phase B — scene runtime correctness
- [ ] Phase C — parser and route-model fidelity
- [ ] Phase D — performance and async reliability
- [ ] Phase E — release hygiene and docs consistency

Completed so far:
- new track sessions now reset scene/editor/export UI state instead of leaking configuration across trips
- timeline trimming now remounts per track session so trim state does not bleed into newly loaded trips
- same-file upload retries are deterministic because the file input is reset after use

Still open in this plan:
- scene normalization / invalid-scene-state guards
- segmented GPX/KML fidelity and untimed Google ordering
- hot-path distance recomputation removal
- JourneyCreator race/style-reload resilience
- CI/docs cleanup tasks that belong to the deeper quality lane

---

## Workstream summary

| Review ID | Theme |
|---|---|
| CQ1-CQ3 | Track/session state isolation |
| CQ4-CQ5 | Scene normalization and validation |
| CQ6 | Hot-path playback performance |
| CQ7-CQ8 | Parser/data-model correctness |
| CQ9-CQ10 | Async and style-reload lifecycle reliability |
| CQ11-CQ14 | Runtime/docs/CI consistency |
| CQ15 | Architectural follow-up / future-proofing |

---

## Implementation phases

### Phase A — Isolate track-scoped session state

#### A.1 Reset track-scoped state on every new session
**Files:**
- `src/app/page.tsx`
- `src/components/ExportPanel.tsx`
- `src/components/TimelineSelector.tsx`

**Work:**
- Define the canonical set of track-scoped state:
  - `track`, `fullTrack`, `progress`, `isPlaying`
  - `scenes`, `transitionDuration`, `showSceneEditor`
  - timeline trim state
  - export session state / exported blob preview
- Reset that state consistently when:
  - a new file is loaded,
  - a manual journey is completed,
  - a “start new track” flow begins.
- Eliminate the current leakage paths called out in CQ1-CQ3.

**Acceptance criteria:**
- Loading a new trip starts from a clean editing/export/trim state.
- No scene/timeline/export state leaks from one trip into another.

#### A.2 Introduce a clearer track-session state boundary
**Files:**
- `src/app/page.tsx`
- optional new hook/reducer file under `src/lib/` or `src/app/`

**Work:**
- Refactor the current monolithic state hub into a clearer track-session abstraction (reducer or custom hook).
- Keep implementation scope bounded: do not redesign the whole app, just isolate the state that currently leaks.

**Acceptance criteria:**
- Track-scoped reset logic is centralized instead of duplicated across many handlers.
- New session behavior is explainable from one state boundary.

### Phase B — Scene runtime correctness

#### B.1 Normalize scene ordering before runtime/export use
**Files:**
- `src/components/SceneEditor.tsx`
- `src/lib/camera.ts`
- `src/types.ts` if helper typing is needed

**Work:**
- Create a shared scene normalization utility that:
  - sorts by `startPercent`,
  - clamps values into `[0, 1]`,
  - preserves stable IDs/names,
  - optionally reports overlaps/gaps.
- Ensure playback/export use normalized scene order, not raw editor array order.

**Acceptance criteria:**
- Scene order in runtime behavior is deterministic and independent of edit history.
- Previous/next scene blending always refers to chronological neighbors.

#### B.2 Prevent invalid numeric scene state from entering runtime logic
**Files:**
- `src/components/SceneEditor.tsx`
- `src/lib/camera.ts`

**Work:**
- Separate temporary text entry from committed numeric scene values.
- Reject/clamp `NaN`, empty, and out-of-range percentages before mutating the canonical scene model.

**Acceptance criteria:**
- Clearing or partially editing a scene percentage field never stores `NaN` into app state.
- Coverage bar and scene warnings remain valid during editing.

### Phase C — Parser and route-model fidelity

#### C.1 Preserve GPX/KML segment discontinuities
**Files:**
- `src/lib/parser.ts`
- `src/types.ts`
- `src/lib/interpolate.ts`
- `src/components/MapView.tsx`
- `src/lib/videoEncoder.ts`
- `e2e/fixtures/` (new segmented fixtures)
- `e2e/travelback.spec.ts`

**Work:**
- Extend the track model so segment boundaries survive parsing.
- Make route interpolation and rendering discontinuity-aware.
- Ensure exports do not animate fake straight lines across segment gaps.

**Acceptance criteria:**
- A segmented input does not create invented travel between segments.
- Playback, trail rendering, and export all respect the same segment model.

#### C.2 Preserve insertion order for untimed Google points
**Files:**
- `src/lib/parser.ts`
- `e2e/fixtures/` (new untimed Google fixture)
- `e2e/travelback.spec.ts`

**Work:**
- Replace the current `0`-fallback global sort with a stable ordering strategy that keeps untimed points in their original relative order.

**Acceptance criteria:**
- Untimed fallback points no longer jump to the front of the track.
- Parser output order is deterministic and matches source intent.

### Phase D — Performance and async reliability

#### D.1 Remove avoidable hot-path distance recomputation
**Files:**
- `src/components/Controls.tsx`
- `src/app/page.tsx`
- `src/lib/interpolate.ts`

**Work:**
- Compute total distance once per track (or reuse cumulative-distance tail value) instead of on every render.

**Acceptance criteria:**
- Playback no longer performs an `O(n)` full-track scan on every UI update.

#### D.2 Make JourneyCreator search race-safe
**Files:**
- `src/components/JourneyCreator.tsx`

**Work:**
- Cancel stale requests or ignore stale responses using request ids / `AbortController`.

**Acceptance criteria:**
- Newer queries cannot be overwritten by older delayed responses.

#### D.3 Rebuild JourneyCreator overlays after style reloads
**Files:**
- `src/components/JourneyCreator.tsx`
- `src/components/MapView.tsx`
- `src/components/ThemeToggle.tsx`

**Work:**
- Re-add creator sources/layers when MapLibre style changes while creator mode is active.
- Verify layer existence after reload, not only a boolean ref.

**Acceptance criteria:**
- Active journey creation survives theme/map-style reloads without disappearing overlays.

### Phase E — Release hygiene and docs consistency

#### E.1 Decide and align full-route-line behavior
**Files:**
- `src/components/MapView.tsx`
- `README.md`
- `.context/project/01-overview.md`
- `.context/project/02-architecture.md`

**Work:**
- Either render the route-line visibly at low opacity or remove the visible-route claim from docs.
- Keep one consistent interpretation.

**Acceptance criteria:**
- Runtime behavior and documentation match exactly.

#### E.2 Strengthen CI/deploy verification
**Files:**
- `.github/workflows/deploy-pages.yml`
- `package.json`
- `scripts/smoke-static.mjs`

**Work:**
- Gate deploy on at least:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run smoke:static`
- Optionally define a smaller targeted Playwright subset for critical regressions.

**Acceptance criteria:**
- Pages deploy cannot succeed without passing the project’s lightweight verification suite.

#### E.3 Update stale factual docs
**Files:**
- `README.md`
- `.context/project/01-overview.md`
- `.context/agents/non-tech-traveler-reviewer.md`
- any plan docs whose cross-references become stale during cleanup

**Work:**
- Fix verified stale counts, paths, and feature descriptions.

**Acceptance criteria:**
- Docs match current code/test/workflow reality.

---

## Verification plan

- `npm run lint`
- `npm run typecheck`
- `npm run smoke:static`
- targeted regression tests for:
  - session reset across track loads,
  - scene ordering/validation,
  - segmented GPX/KML handling,
  - untimed Google parser ordering,
  - search race handling,
  - style reload during active journey creation

---

## Recommended execution order

1. Phase A (session isolation)
2. Phase B (scene correctness)
3. Phase C (parser fidelity)
4. Phase D.1 / D.2 / D.3 (performance + async reliability)
5. Phase E (CI/docs/runtime consistency)
