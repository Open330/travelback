# Implementation Plan: Address Comprehensive Code Review (2026-04-13)

**Source review:** `.context/reviews/comprehensive-code-review-2026-04-13.md`  
**Goal:** address the findings from the comprehensive repo-wide code review, with explicit cross-references to the ultradeep code-quality and security plans where findings overlap.

---

## Progress update

- [x] A.1 Fix first-load system theme synchronization
- [x] A.2 Make ErrorBoundary honor the active app locale
- [x] B.1 Make same-file re-upload deterministic
- [x] B.2 Add explicit export idle-timeout failure policy
- [x] C.1 Decide and implement visible full-route behavior
- [x] C.2 Fix preview-server caching for non-fingerprinted public assets
- [x] D.1 Update doc drift explicitly called out by the comprehensive review

Completed so far:
- bootstrap theme/map-style now follow the real initial color-scheme instead of hardcoded light mode
- ErrorBoundary now renders using the active app locale
- file inputs are reset so same-file reloads are reliable
- export now fails cleanly after repeated map-idle timeout fallback instead of degrading indefinitely
- the route-line is visible at low opacity to match docs and feature expectations
- the preview server now reserves immutable caching for fingerprinted build assets only
- stale review-facing docs were updated to reflect the current test count and feature counts
- entering “New Route” now clears prior trip map artifacts instead of leaving the old route behind

---

## Triage: unique vs overlapping findings

| Review ID | Finding | Coverage |
|---|---|---|
| F1 | Initial system dark mode is never applied on first load | **Unique to this plan** |
| F2 | Export success state / blob URL persist across sessions | Covered in `.context/plans/address-ultradeep-code-quality-review-2026-04-13.md` |
| F3 | Timeline trim selection leaks into newly loaded tracks | Covered in `.context/plans/address-ultradeep-code-quality-review-2026-04-13.md` |
| F4 | Scene runtime depends on unsorted array order | Covered in `.context/plans/address-ultradeep-code-quality-review-2026-04-13.md` |
| F5 | Scene inputs can write `NaN` state | Covered in `.context/plans/address-ultradeep-code-quality-review-2026-04-13.md` |
| F6 | Playback recomputes total distance every render | Covered in `.context/plans/address-ultradeep-code-quality-review-2026-04-13.md` |
| F7 | GPX/KML segments flattened incorrectly | Covered in `.context/plans/address-ultradeep-code-quality-review-2026-04-13.md` |
| F8 | Untimed Google points reorder incorrectly | Covered in `.context/plans/address-ultradeep-code-quality-review-2026-04-13.md` |
| F9 | JourneyCreator search races | Covered in `.context/plans/address-ultradeep-code-quality-review-2026-04-13.md` |
| F10 | JourneyCreator overlays break after style reload | Covered in `.context/plans/address-ultradeep-code-quality-review-2026-04-13.md` |
| F11 | ErrorBoundary ignores user-selected locale | **Unique to this plan** |
| F12 | Full route line exists but is invisible | **Handled here as a UX/runtime consistency task** |
| F13 | Deploy workflow skips lint/typecheck/tests/smoke | Covered in `.context/plans/address-ultradeep-code-quality-review-2026-04-13.md` |
| F14 | Docs are materially stale | Shared with ultradeep code-quality plan; covered here only for comprehensive-review-specific doc fixes |
| F15 | Same-file re-upload likely does not fire | **Unique to this plan** |
| F16 | Static preview server immutable-caches non-fingerprinted assets | **Unique to this plan** |
| F17 | Export can degrade into repeated idle timeouts | **Unique to this plan** |

---

## Implementation workstreams

### Phase A — Theme and locale correctness

#### A.1 Fix first-load system theme synchronization
**Files:**
- `src/app/layout.tsx`
- `src/components/ThemeToggle.tsx`
- `src/app/page.tsx`
- `e2e/travelback.spec.ts`
- relevant docs: `README.md`, `.context/project/01-overview.md` if they describe theme behavior

**Work:**
- Remove the hardcoded light-mode startup assumption.
- Ensure the initial document mode is derived from the actual current user preference before hydration.
- Ensure initial `mapStyleKey` follows the real initial theme, not the stale DOM default.
- Add a regression test that proves dark OS preference yields the dark map style on first load.

**Acceptance criteria:**
- First paint honors `prefers-color-scheme: dark` without requiring a later media-query change event.
- The existing dark-mode map-style test is strengthened so it catches the real initial-load path.

#### A.2 Make ErrorBoundary honor the active app locale
**Files:**
- `src/components/ErrorBoundary.tsx`
- `src/lib/i18n.ts`
- `src/app/page.tsx` or a small wrapper if needed

**Work:**
- Replace browser-locale fallback behavior with active app-locale behavior.
- Ensure the fallback UI renders in the same language selected by the user via the locale picker.

**Acceptance criteria:**
- A manually selected locale is preserved in the error fallback UI.
- No regression to default locale behavior when no explicit locale is selected.

### Phase B — Export/session reliability follow-ups

#### B.1 Make same-file re-upload deterministic
**Files:**
- `src/components/FileUpload.tsx`
- `e2e/travelback.spec.ts`

**Work:**
- Reset file input state after successful or failed processing so selecting the same file again reliably triggers `change`.
- Add a regression test that uploads the same fixture twice in sequence.

**Acceptance criteria:**
- Re-selecting the same file triggers a new parse attempt.
- Behavior is the same for landing-page upload and “Load New File”.

#### B.2 Add explicit export idle-timeout failure policy
**Files:**
- `src/components/MapView.tsx`
- `src/app/page.tsx`
- `src/lib/videoEncoder.ts` if the error shape needs coordination

**Work:**
- Distinguish a normal render wait from repeated timeout-based non-idle states.
- Decide on a maximum consecutive timeout threshold and fail with a user-visible error once exceeded.
- Keep abort behavior clean when the user cancels export.

**Acceptance criteria:**
- Export no longer silently crawls forever on repeated map-idle timeout fallback.
- Timeout failures produce a clear error path instead of indefinite slow progress.

### Phase C — Map/static-preview consistency

#### C.1 Decide and implement visible full-route behavior
**Files:**
- `src/components/MapView.tsx`
- `README.md`
- `.context/project/01-overview.md`
- `.context/project/02-architecture.md`
- `e2e/travelback.spec.ts` if UI expectation is testable

**Work:**
- Choose one of two outcomes:
  1. make the route-line visibly low-opacity as documented, or
  2. keep it hidden and update all docs/comments/tests to say so.
- Apply one consistent interpretation across runtime and docs.

**Acceptance criteria:**
- Runtime and docs agree on whether the full route is visible.
- If visible, the map actually shows the route outline before playback.

#### C.2 Fix preview-server caching for non-fingerprinted public assets
**Files:**
- `scripts/serve-static.mjs`
- `scripts/smoke-static.mjs`
- `public/sample-trip.gpx`

**Work:**
- Restrict long-lived immutable caching to fingerprinted build assets under `/_next/`.
- Serve `public/` demo/data assets with a normal cache policy.
- Extend the smoke/static checks to assert the intended cache policy on sample-trip data and build assets.

**Acceptance criteria:**
- `/_next/static/...` remains aggressively cacheable.
- `sample-trip.gpx` is not served with an immutable year-long cache header.

### Phase D — Comprehensive-review-specific doc cleanup

#### D.1 Update doc drift explicitly called out by the comprehensive review
**Files:**
- `README.md`
- `.context/project/01-overview.md`
- `.context/agents/non-tech-traveler-reviewer.md`

**Work:**
- Fix stale references called out in the review:
  - test count,
  - deploy workflow filename,
  - camera-mode and map-style counts,
  - any other locally verified factual mismatches.

**Acceptance criteria:**
- Repo docs match the current codebase on verified factual counts/paths.
- No remaining references to `.github/workflows/deploy.yml` when the repo uses `deploy-pages.yml`.

---

## Verification plan

- `npm run lint`
- `npm run typecheck`
- targeted Playwright coverage for:
  - initial dark-theme startup,
  - same-file re-upload,
  - route-line visibility expectation if UI-visible
- `npm run smoke:static` expanded to validate cache-header behavior if the static server logic changes

---

## Recommended execution order

1. A.1 first-load theme sync
2. B.1 same-file re-upload reliability
3. C.1 route-line/runtime-doc consistency
4. C.2 static cache policy fix
5. B.2 export idle-timeout handling
6. A.2 ErrorBoundary locale consistency
7. D.1 doc cleanup
