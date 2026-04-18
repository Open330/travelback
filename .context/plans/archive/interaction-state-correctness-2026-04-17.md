# Interaction & State Correctness — 2026-04-17

**Priority:** P0-P1
**Source:** comprehensive-ui-ux-review-2026-04-17 (2.5, 2.6, 2.7, 2.8, 2.10, 5.1, 5.2, 5.3), comprehensive-deep-code-review-2026-04-15 (F7)
**Estimated effort:** 4-6 hours

---

## Findings addressed

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| 2.5 | TimelineSelector dates use `toLocaleString(undefined, ...)` ignoring app locale | P1 | TimelineSelector.tsx |
| 2.6 | Scene presets replace without confirmation | P1 | SceneEditor.tsx |
| 2.7 | JourneyCreator undo during drag leaves inconsistent state | P1 | JourneyCreator.tsx |
| 2.8 | No visual feedback when drag-drop file fails format check | P1 | FileUpload.tsx |
| 2.10 | Settings undiscoverable on mobile loaded state | P1 | GlobalToolbar.tsx, TrackToolbar.tsx |
| 5.1 | Double duration control (Controls + Export) | P1 | Controls.tsx, ExportPanel.tsx, page.tsx |
| 5.2 | No way to reset timeline selection | P1 | TimelineSelector.tsx |
| 5.3 | JourneyCreator "Done" disabled with <2 points but no hint why | P1 | JourneyCreator.tsx |
| F7 | JourneyCreator stale travel icons after style/theme reload | Medium | JourneyCreator.tsx |

---

## Implementation steps

### 2.5 — Pass app locale to TimelineSelector date formatting

**File:** `src/components/TimelineSelector.tsx:21-27`

**Current:**
```ts
date.toLocaleString(undefined, { month: 'short', ... })
```

**Fix:** Accept `locale` prop (already available via `useLocale()` or passed from parent). Replace `undefined` with the current locale:
```ts
date.toLocaleString(locale, { month: 'short', ... })
```

**Changes:**
1. Import `useLocale` or accept `locale` prop in TimelineSelector
2. Replace all `toLocaleString(undefined, ...)` calls with `toLocaleString(locale, ...)`
3. Ensure the `locale` value matches the app's selected locale (en/ko/ja/zh/es)

---

### 2.6 — Confirmation before scene preset replacement

**File:** `src/components/SceneEditor.tsx:312-327`

**Current:** Clicking a preset (Cinematic, Simple, Bird's Eye, Dynamic) immediately replaces all existing scenes.

**Fix:** If scenes already exist, show a confirmation dialog before replacing.

**Implementation:**
1. Before calling the preset handler, check `scenes.length > 0`
2. If scenes exist, show a confirmation using the existing `ModalDialog` pattern or a simple `confirm()` as a quick first pass
3. Better: Add a small inline confirmation banner inside the scene editor ("Replace all scenes? [Replace] [Cancel]")
4. Only proceed with preset application after confirmation

**Quick approach (MVP):** Use `window.confirm()` — one line, no new UI needed.
**Better approach:** Inline confirmation banner within the scene editor panel.

---

### 2.7 — JourneyCreator cancel drag on undo

**File:** `src/components/JourneyCreator.tsx:414-419`

**Current:** `handleUndo` removes the last waypoint but doesn't cancel any active drag.

**Fix:** Track drag state in a ref. When `handleUndo` fires, cancel any active drag first:
```ts
const dragActiveRef = useRef(false)

const handleUndo = () => {
  if (dragActiveRef.current) {
    // Cancel drag - reset drag state
    dragActiveRef.current = false
    // Any other drag cleanup
  }
  // ... existing undo logic
}
```

---

### 2.8 — Visual feedback on file drop before parse

**File:** `src/components/FileUpload.tsx:73-78`

**Current:** `isDragging` resets immediately on `handleDrop`, so the highlight disappears before the error/success appears.

**Fix:** Add a brief "processing" state between drop received and parse result:

**Implementation:**
1. Add a `processing` state (separate from `loading` which is set inside `handleFile`)
2. Set `processing = true` in `handleDrop` before calling `handleFile`
3. Keep `isDragging = true` visually during processing
4. Clear `isDragging` and `processing` in `handleFile`'s `finally` block
5. Or simpler: just delay clearing `isDragging` by a small timeout (200ms) so the border highlight persists briefly

---

### 2.10 — Settings discoverable on mobile loaded state

**Files:** `src/components/GlobalToolbar.tsx`, `src/components/TrackToolbar.tsx`

**Current:** On mobile with a track loaded, the global toolbar is `hidden`. The only access to units/locale/theme is the "..." menu in TrackToolbar, which is not obviously a settings location.

**Fix:** Add a gear/settings icon in the mobile loaded-state toolbar:
1. Add a small gear icon (using lucide `Settings`) in the TrackToolbar's visible button row (not hidden in the "..." menu)
2. Tapping the gear opens the "..." menu's settings section (or a dedicated settings panel)
3. Alternatively, show the "..." menu label as "Settings" instead of an ellipsis icon

**Simpler approach:** Change the "..." (Ellipsis) icon to a `Settings` icon (gear) — more universally recognized as "settings."

---

### 5.1 — Unify duration control

**Files:** `src/components/Controls.tsx`, `src/components/ExportPanel.tsx`, `src/app/page.tsx`

**Current:** Two separate duration selectors that can diverge.

**Fix (incremental approach):**
1. Make playback duration the single source of truth (lift to `page.tsx` state)
2. Pass it to both Controls and ExportPanel
3. ExportPanel's duration defaults to the playback value but can be overridden independently (for "export a different duration than preview")
4. Show a visual indicator in the export panel when the export duration differs from the playback duration: "Differs from preview (30s)"
5. This is partially addressed by P0 fix 1.5 (sync on open) — this plan extends it to a full unified model

---

### 5.2 — Timeline reset mechanism

**File:** `src/components/TimelineSelector.tsx`

**Current:** No way to reset timeline selection back to full range after dragging handles.

**Fix options:**
- **Option A:** Add a small reset icon button (e.g., `RotateCcw` from lucide) next to the timeline
- **Option B:** Double-tap/double-click on the timeline to reset
- **Option C:** Long-press on the timeline to reset

**Recommendation:** Option A is the most discoverable. Place a small icon button at the right end of the timeline that resets start to 0% and end to 100%.

---

### 5.3 — JourneyCreator "Done" disabled hint

**File:** `src/components/JourneyCreator.tsx:717-718`

**Current:** "Done" button is `disabled` and `opacity-40` with <2 points but no explicit hint.

**Fix:** When `pointCount === 1`, show a message below the "Done" button: "Add 1 more point to create a route." When `pointCount === 0`, the existing "Click on the map to add locations" is sufficient but could be enhanced with "Add at least 2 points."

---

### F7 — JourneyCreator stale travel icons after style/theme reload

**File:** `src/components/JourneyCreator.tsx:131-205, 218-356`

**Current:** The `handleStyleReload` effect depends only on `[isActive]`, so it can use stale closures for `selectedIconSymbol`.

**Fix:** Store the active icon symbol in a ref that `handleStyleReload` reads at execution time:
```ts
const selectedIconRef = useRef(selectedIconSymbol)
selectedIconRef.current = selectedIconSymbol

// In handleStyleReload, read from selectedIconRef.current instead of closure
```

---

## Verification checklist

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm run test:e2e:static:ci`
- [x] Timeline dates respect app locale (test: switch to Korean, confirm month names are Korean)
- [x] Scene preset shows confirmation when scenes exist
- [x] File drop shows brief processing state
- [x] Mobile loaded state has visible settings access (gear icon)
- [x] Timeline has a reset button
- [x] JourneyCreator "Done" shows "Add 1 more point" hint
- [x] JourneyCreator icon doesn't go stale after theme toggle
