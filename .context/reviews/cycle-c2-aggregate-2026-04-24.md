# Aggregate Review — review-plan-fix cycle 2/100

**Date:** 2026-04-24
**Source reviews:** code-reviewer, security-reviewer, critic, verifier, test-engineer, architect, debugger, designer
**Unavailable reviewer roles in this environment:** perf-reviewer, tracer, document-specialist
**Agent failures:** none. The architect role was read-only, so its returned review was transcribed into `.context/reviews/cycle-c2-architect-2026-04-24.md` by the cycle owner.

## Deduplicated findings

### C2-AGG-001 — Antimeridian overview/scene camera math uses a non-contiguous shifted longitude span
- **Severity:** Medium
- **Confidence:** High
- **Agreement:** critic, verifier, debugger
- **Evidence:** `src/lib/camera.ts:53-94`, `src/lib/camera.ts:102-120`, `src/lib/camera.ts:137-163`, `src/lib/camera.ts:341-435`
- **Problem:** Dateline-crossing routes shift longitudes into the wrong `[0, 360)` domain and interpolate scene cameras without shortest-path longitude deltas.
- **Failure scenario:** Routes crossing ±180° can render route geometry correctly but zoom overview/default cinematic cameras out toward world view or transition through the wrong hemisphere.
- **Suggested fix:** Use the same contiguous antimeridian domain as map fit-bounds, and interpolate camera centers with `shortestLngDelta()` + `normalizeLng()`.

### C2-AGG-002 — Manual-route duplicate suppression is not antimeridian-aware
- **Severity:** Low
- **Confidence:** High
- **Agreement:** critic, verifier, debugger
- **Evidence:** `src/components/JourneyCreator.tsx:27-32`, `src/components/JourneyCreator.tsx:253-259`, `src/components/JourneyCreator.tsx:470-475`; correct helper exists in `src/lib/interpolate.ts:5-15`
- **Problem:** The local equirectangular duplicate guard uses raw longitude subtraction.
- **Failure scenario:** Nearly identical manually entered/clicked waypoints across ±180° are treated as far apart and can create confusing duplicate waypoint counts.
- **Suggested fix:** Reuse `shortestLngDelta()` when computing the duplicate-proximity distance.

### C2-AGG-003 — Scene preset names bypass localization
- **Severity:** Low
- **Confidence:** High
- **Agreement:** critic, verifier, designer
- **Evidence:** `src/lib/camera.ts:210-334`, `src/components/SceneEditor.tsx:371-387`, `src/components/SceneEditor.tsx:439-465`, `src/lib/i18n.ts:1720-1735`
- **Problem:** Preset generators return hard-coded English names, and `SceneEditor` renders those names directly.
- **Failure scenario:** Korean/Japanese/Chinese/Spanish users see English scene names inside an otherwise localized Camera panel.
- **Suggested fix:** Localize generated preset names at the UI boundary when the preset is committed.

### C2-AGG-004 — Persisted explicit map-style choices become implicit after reload
- **Severity:** Low
- **Confidence:** High
- **Agreement:** architect, code-reviewer
- **Evidence:** `src/app/page.tsx:48-59`, `src/app/page.tsx:302-327`, `src/app/layout.tsx:49`
- **Problem:** The selected map-style value is restored from storage, but the metadata saying it was explicitly chosen is not restored.
- **Failure scenario:** A user chooses Liberty/Bright/etc., reloads, then toggles theme; the app treats the restored style as implicit and overwrites it with a theme default.
- **Suggested fix:** Persist explicit map-style intent or reconstruct it from stored state without treating theme-derived defaults as explicit.

### C2-AGG-005 — JourneyCreator search advertises combobox semantics without keyboard option navigation
- **Severity:** Medium
- **Confidence:** High
- **Agreement:** designer
- **Evidence:** `src/components/JourneyCreator.tsx:428-463`, `src/components/JourneyCreator.tsx:568-620`
- **Problem:** The input uses `role="combobox"` and renders a listbox, but it only handles Enter; there is no active option or Arrow/Home/End/Escape behavior.
- **Failure scenario:** Keyboard and assistive-tech users can submit a coordinate query but cannot move through or activate result options using the expected combobox pattern.
- **Suggested fix:** Track an active option, expose `aria-activedescendant`, handle ArrowUp/ArrowDown/Home/End/Escape, and select the active option on Enter.

### C2-AGG-006 — Timeline slider handles lack `aria-valuetext`
- **Severity:** Low
- **Confidence:** High
- **Agreement:** designer
- **Evidence:** `src/components/TimelineSelector.tsx:371-436`
- **Problem:** Start/end handles expose numeric slider values but not a human-readable description.
- **Failure scenario:** Screen readers announce raw percentages without clarifying start vs. end trim semantics.
- **Suggested fix:** Add localized `aria-valuetext` for both handles.

### C2-AGG-007 — Current antimeridian defects need targeted regression coverage
- **Severity:** Medium
- **Confidence:** High
- **Agreement:** test-engineer
- **Evidence:** `e2e/fixtures/`, `e2e/travelback.spec.ts`
- **Problem:** Existing fixtures and E2E flows do not cover dateline-crossing route camera behavior or manual-route duplicate suppression.
- **Failure scenario:** The C2 antimeridian fixes could regress under green generic camera/map tests.
- **Suggested fix:** Add focused antimeridian fixture coverage for scene overview camera zoom/framing and JourneyCreator duplicate suppression.

## Deferred or already-covered findings

### C2-AGG-D01 — Large JSON imports can fall back to main-thread parsing if Worker creation is unavailable
- **Source:** code-reviewer
- **Severity/confidence:** Medium / High
- **Disposition:** Deferred. This is a performance/resilience follow-up already represented by review-plan-fix cycle 1 deferred items `DEF-001` and `DEF-002` in `plan/deferred-cycle1-review-plan-2026-04-24.md`.
- **Reason:** Fixing it requires a broader parser-worker and import-limit strategy rather than a narrow correctness patch.
- **Exit criterion:** Re-open when adding a generated/shared worker bundle or streaming/chunked parser path.

### C2-AGG-D02 — Main and Worker Google parser logic remains duplicated
- **Source:** code-reviewer, architect non-finding
- **Severity/confidence:** Medium / High
- **Disposition:** Deferred. Already captured as `DEF-001` in `plan/deferred-cycle1-review-plan-2026-04-24.md` with original severity preserved.
- **Reason:** Replacing duplicated public worker logic requires build-pipeline design and test-harness decisions.
- **Exit criterion:** Re-open when introducing a worker bundling/generation step.

### C2-AGG-D03 — JourneyCreator can miss initialization if activated before the MapLibre handle exists
- **Source:** code-reviewer
- **Severity/confidence:** Low / Medium
- **Disposition:** Deferred.
- **Reason:** Current user flows expose Journey Creator after the app shell and MapView have mounted; no reproduced failing path in gates. A robust retry/ready signal would touch map lifecycle boundaries and should be paired with a specific reproduction.
- **Exit criterion:** Re-open if Journey Creator is exposed earlier in startup or if a test/user report shows an active panel without journey map layers.

## Gate status during review

Subagents independently ran combinations of these checks successfully during PROMPT 1:

- `npm run lint`
- `npm run typecheck` / `npx tsc --noEmit --incremental false`
- `npm audit --audit-level=low --json`
- `npm run build`
- `npm run smoke:static`
- `npm run test:e2e:static:ci`

## AGENT FAILURES

None.
