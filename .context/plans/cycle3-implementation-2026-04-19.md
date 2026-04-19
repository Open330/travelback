# Cycle 3 Implementation Plan — 2026-04-19

Derived from `.context/reviews/_aggregate.md` (cycle 3).

## Active findings to address this cycle

### 1. C3-AGG-001 — HIGH — Fix `parseSemanticSegments` segment boundaries

**Files:** `src/lib/parser.ts:269-307`, `public/workers/trackParser.worker.js`

**Plan:**
- In `parseSemanticSegments`, add `segStarts.push(out.length)` between the `timelinePath` block and the `visit` block within the same segment.
- Also push a segment start after the `visit` block if there were points added (for the case where a segment has both a `timelinePath` and a `visit`).
- Mirror the same fix in the worker's copy of `parseSemanticSegments`.
- Verify with existing e2e fixtures that still pass.

**Status:** TODO

---

### 2. C3-AGG-003 — MEDIUM — Add worker fallback to main-thread parser on worker error

**Files:** `src/lib/parser.ts:459-482`

**Plan:**
- In `worker.onmessage` error path (line 461-463), instead of rejecting, fall back to `parseGoogleLocationHistory(decodeJsonBuffer(buffer))`.
- In `worker.onerror` (line 479-482), instead of rejecting, fall back to `parseGoogleLocationHistory(decodeJsonBuffer(buffer))`.
- The main-thread parser is the same code; it just runs synchronously. For files within the supported size limit, this is acceptable.

**Status:** TODO

---

### 3. C3-AGG-004 — MEDIUM — Replace raw WebGL error with user-friendly message

**Files:** `src/components/MapView.tsx:926-933`, `src/lib/i18n.ts`

**Plan:**
- Change `mapError` display to show a user-friendly message without the raw error text.
- Add a "Show technical details" disclosure that reveals the raw error when clicked.
- Add new i18n keys: `app.mapLoadFailedFriendly` and `app.showTechnicalDetails` / `app.hideTechnicalDetails`.
- Store the raw error in a separate state variable and show it in a collapsible `<details>` element.

**Status:** TODO

---

### 4. C3-AGG-005 — MEDIUM — Add keyboard accessibility to timeline handles

**Files:** `src/components/TimelineSelector.tsx:317-375`

**Plan:**
- Add `tabIndex={0}`, `role="slider"`, `aria-valuenow`, `aria-valuemin={0}`, `aria-valuemax={100}`, `aria-label` to both handle divs.
- Add `onKeyDown` handlers for ArrowLeft/Right (step by 1%), Home (0%), End (100%).
- Add visible focus ring style (`:focus-visible` or conditional CSS class).
- Update `startDrag`/`endDrag` to also work from keyboard events.

**Status:** TODO

---

### 5. C3-AGG-006 — MEDIUM — Add live-region semantics to error messages

**Files:** `src/components/Toast.tsx:31-55`, `src/components/FileUpload.tsx:249-250`

**Plan:**
- Add `role="status"` and `aria-live="polite"` to the toast container div.
- Add `role="alert"` to the file-upload error message paragraph.

**Status:** TODO

---

### 6. C3-AGG-002 — MEDIUM — Fix scene editor dead normalization warnings

**Files:** `src/components/SceneEditor.tsx:201-213`

**Plan:**
- Before calling `normalizeScenes`, check the raw scenes for `startPercent >= endPercent` and collect warnings.
- Then call `normalizeScenes` and pass the normalized result to `onChange`.
- Display the warnings collected from the pre-normalization check.

**Status:** TODO

---

### 7. C3-AGG-007 — MEDIUM — Soften download success language

**Files:** `src/components/ExportPanel.tsx:205`, `src/lib/i18n.ts`

**Plan:**
- Add a new i18n key `export.downloadStarted` with text like "Your video download has started."
- Change the export success state to use `export.downloadStarted` instead of `export.savedToDownloads` when the download method was the `<a>` fallback (not `showSaveFilePicker`).
- This requires tracking which download method was used, or simply changing the default message to be less specific.
- Simplest approach: just reword `export.savedToDownloads` to say "Your video download has started." which is accurate for both paths.

**Status:** TODO

---

### 8. C3-AGG-009 — MEDIUM — Add build guard for tool-state leakage

**Files:** `scripts/smoke-static.mjs`, `.gitignore`

**Plan:**
- In `smoke-static.mjs`, add a scan step after the existing assertions that checks `out/` for hidden directories matching `.omc`, `.omx`, `.claude`, `.codex`.
- Fail the smoke test if any are found.
- Add `.omc/` and `.omx/` to `.gitignore` if not already present.

**Status:** TODO

---

### 9. C3-AGG-008 — LOW — Remove misleading `--err-rgb` fallback

**Files:** `src/app/page.tsx:325`

**Plan:**
- Change `rgba(var(--err-rgb, 244,63,94),.7)` to `rgba(var(--err-rgb),.7)` since the variable is always defined in `:root`.

**Status:** TODO

---

## Quality gates

- `eslint` — must pass (zero errors, zero warnings)
- `tsc --noEmit` — must pass (zero errors)
- `next build` — must pass (compiled successfully, static pages generated)

## Deferred findings (not scheduled this cycle)

See `.context/plans/deferred-findings-cycle2-2026-04-19.md` and `.context/plans/deferred-findings-cycle1-2026-04-19.md` for the existing deferred lists. No new deferred items from this review — all active findings are scheduled above.

The following findings from the cycle 3 review are explicitly deferred because they are the same items already on the DF-C2 list:
- Map styles remote dependency / basemap strategy (DF-C2-010)
- Playback rerender performance (DF-C2-002)
- Main-thread XML parsing (DF-C2-003)
- Export memory envelope (DF-C2-005)
- App shell god object architecture (DF-C1-002)
- Worker/main-thread parser duplication (DF-C2-003)
- JourneyCreator map ownership boundary (DF-C1-002)
- Locale/E2E test monolithic structure (DF-C2-006, DF-C2-008)
