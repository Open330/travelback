# Code Reviewer Lane Report

## Scope

- Repository: `/Users/hletrd/flash-shared/Travelback`
- Review type: comprehensive code quality, logic, SOLID, maintainability
- Context docs examined:
  - `.context/README.md`
  - `.context/project/01-overview.md`
  - `.context/project/02-architecture.md`
  - `.context/development/01-conventions.md`
  - `plan/cycle1-review-plan-2026-04-24.md`
  - `.context/reviews/_aggregate.md`

## Review-Relevant Inventory

- App shell and state orchestration:
  - `src/app/layout.tsx`
  - `src/app/page.tsx`
- Core logic:
  - `src/types.ts`
  - `src/lib/interpolate.ts`
  - `src/lib/camera.ts`
  - `src/lib/parser.ts`
  - `src/lib/usePlaybackController.ts`
  - `src/lib/useExportController.ts`
  - `src/lib/videoEncoder.ts`
  - `src/lib/i18n.ts`
  - `src/lib/env.ts`
- UI components:
  - `src/components/*.tsx`
- Worker / support scripts:
  - `public/workers/trackParser.worker.js`
  - `scripts/*.mjs`
  - `package.json`
  - `tsconfig.json`
  - `next.config.ts`
  - `eslint.config.mjs`
- Test surface:
  - `e2e/travelback.spec.ts`

## Diagnostics

- `npm run typecheck`: passed
- `npm run lint`: passed
- Targeted pattern scan: completed for console usage, empty catches, storage/event-heavy code paths, and duplicated parser surfaces
- Note: OMX code-intel MCP transport died during the review, so I used CLI/source inspection instead of `lsp_diagnostics`

## Summary

- Files reviewed: all review-relevant source/config/test files listed above
- Confirmed issues: 4
- Likely risks: 1
- Highest severity: Medium
- Recommendation: REQUEST CHANGES

## Confirmed Issues

### [MEDIUM][High confidence] Large Google JSON imports still fall back to full main-thread parsing when Worker creation fails

- **File:** `src/lib/parser.ts:498-515`
- **Why this is a problem:** The worker path is explicitly trying to keep large JSON imports off the main thread, but the `new Worker(...)` failure branch immediately decodes the original `buffer` on the main thread without the `MAIN_THREAD_JSON_FALLBACK_SIZE` guard used elsewhere in the same function.
- **Concrete failure scenario:** On a browser/runtime where workers are blocked or unavailable, importing an 80-100MB Google Takeout file freezes the UI or spikes memory, even though the code comments and surrounding logic say large files should remain worker-only.
- **Suggested fix:** In the constructor-failure branch, apply the same bounded-fallback policy as the later `onmessage`/`onerror` branches: only decode on the main thread when the file is within the small fallback size, otherwise reject with a clear parse/import-capability error.

### [MEDIUM][High confidence] Scene range keyboard editing leaks into global playback hotkeys

- **Files:**
  - `src/components/SceneEditor.tsx:173-225`
  - `src/lib/usePlaybackController.ts:156-185`
- **Why this is a problem:** The custom `role="slider"` handles in `SceneRangeEditor` call `preventDefault()` for arrow-key edits, but they do not stop propagation. The global playback hotkey handler does not treat `role="slider"` as an interactive target, so the same arrow key also triggers `onStepSeek`.
- **Concrete failure scenario:** A user adjusts a scene boundary with keyboard arrows and the playback position jumps at the same time, moving the map/camera and producing confusing editor behavior that looks like the scene controls are corrupting playback state.
- **Suggested fix:** Either stop propagation in the scene-range handle key handlers, or expand the global hotkey guard to ignore focused sliders / scene-editor controls, ideally via a dedicated `data-disable-playback-hotkeys` boundary on the editor.

### [LOW][High confidence] Mobile toolbar “focus first item” logic actually focuses the trigger button

- **Files:**
  - `src/components/TrackToolbar.tsx:10-17`
  - `src/components/TrackToolbar.tsx:52-53`
  - `src/components/TrackToolbar.tsx:134-159`
- **Why this is a problem:** `useFocusFirstOnOpen()` queries the first `button` inside `menuRef`, but `menuRef` is attached to the wrapper that contains the trigger button before the popup content. When the menu opens, the first button is still the trigger, not the first action inside the popup.
- **Concrete failure scenario:** On mobile/narrow layouts, opening the overflow menu via keyboard leaves focus on the toggle instead of moving into the newly opened control group, so the intended focus-management behavior does not occur and keyboard traversal becomes less predictable.
- **Suggested fix:** Put a separate ref on the popup panel itself and focus within that element, or scope the query to the popup subtree instead of the outer wrapper.

### [LOW][High confidence] E2E coverage is coupled to English copy and localized title formatting

- **Files:**
  - `e2e/travelback.spec.ts:137-143`
  - `e2e/travelback.spec.ts:150-155`
  - `e2e/travelback.spec.ts:174`
  - `e2e/travelback.spec.ts:183-193`
  - `e2e/travelback.spec.ts:254-257`
- **Why this is a problem:** Core helpers and assertions depend on literal English text (`Travelback`, `Drop your travel file here`, `locations`) instead of stable test IDs or locale-agnostic attributes.
- **Concrete failure scenario:** A copy update, locale-default change, or broader i18n expansion breaks unrelated E2E tests even when the product behavior is correct, forcing noisy test maintenance for non-functional text edits.
- **Suggested fix:** Prefer `data-testid`/semantic structural selectors for stable surfaces, and expose count/date metadata in machine-readable attributes instead of parsing localized title text.

## Likely Risks

### [MEDIUM][High confidence] Main-thread and Worker Google parsers are still duplicated by hand

- **Files:**
  - `src/lib/parser.ts:182-574`
  - `public/workers/trackParser.worker.js:1-322`
- **Why this is a problem:** The Google-format parsing logic, dedupe behavior, sorting rules, and validation checks are maintained in two separate implementations. This is already a maintenance smell, and the repo history/docs show this area has been corrected repeatedly.
- **Concrete failure scenario:** A future fix lands in only one parser path, so behavior diverges by environment or file size: small files parsed on the main thread behave one way while worker-parsed files behave another.
- **Suggested fix:** Move the parsing core into a shared pure module and generate/bundle the worker entry from that shared source, or introduce an explicit generation step so the worker copy cannot drift manually.
- **Classification:** Likely risk rather than a newly reproduced user-facing bug in this review.

## Final Sweep Note

- **Examined:** all code-bearing files under `src/`, `scripts/`, `public/workers/`, repo config files, the main Playwright spec, and the `.context` project/development/current-cycle docs listed above.
- **Cross-file interactions checked:** parser main-thread/worker parity, playback hotkeys vs. editor controls, export panel vs. export controller/video encoder, page-level state ownership vs. workspace components, and test selectors vs. i18n behavior.
- **Skipped:** binary/static assets (`.woff2`, `.ico`, screenshots), raw map-style JSON payload contents beyond structural review, and fixture file internals except where their corresponding tests/parsers were relevant.
- **Evidence state:** lint/typecheck are clean, so the findings above are logic/maintainability issues rather than current compile-time failures.
