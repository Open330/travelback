# Cycle 9 Implementation Plan — 2026-04-23

Derived from `.context/reviews/_aggregate.md` (cycle 9).

## Active findings to address this cycle

### 1. C9-F1 — MEDIUM — Remove ExportPanel codecSupportCache module-level singleton

**Files:** `src/components/ExportPanel.tsx:31`

**Issue:** `codecSupportCache` is a module-level `let` variable that persists across component mounts and is never invalidated. If a browser gains codec support (via update), the stale cache will continue showing those codecs as unsupported until a page reload.

**Implementation steps:**
1. Remove the `let codecSupportCache` module-level variable at line 31
2. Update the `useState` initializer to always start with `{ h264: null, h265: null, av1: null }` (no cache fallback)
3. Remove the `if (codecSupportCache != null) return` guard inside the `useEffect` that probes codecs
4. After probing completes, set component state directly (no module-level cache write)
5. The `useEffect` already probes all codecs in parallel, so removing the cache has negligible performance cost
6. Verify ExportPanel still correctly probes and displays codec support on open

**Verification:** `tsc --noEmit`, `eslint`, `next build`, manual check that export panel still probes codecs

**Status:** PENDING

---

### 2. C9-F4 — LOW — ExportPanel estimated time may show "0 seconds"

**Files:** `src/components/ExportPanel.tsx:105`

**Implementation steps:**
1. Change `const estimatedSeconds = Math.round(duration * 0.5 * resScale * codecScale)` to use `Math.max(1, Math.round(...))`
2. This ensures the display always shows at least "1 second" even for very short/efficient exports

**Verification:** `tsc --noEmit`, `eslint`, `next build`

**Status:** PENDING

---

### 3. C9-F3 — LOW — GoogleGuide tabs arrow-key navigation

**Files:** `src/components/GoogleGuide.tsx:289-307`

**Implementation steps:**
1. Add `aria-orientation="horizontal"` to the tablist div
2. Add an `onKeyDown` handler to the tablist that:
   - On ArrowRight: move focus to next tab (wrap to first), activate it
   - On ArrowLeft: move focus to previous tab (wrap to last), activate it
   - On Home: move focus to first tab, activate it
   - On End: move focus to last tab, activate it
3. Add `tabIndex={tab === i ? 0 : -1}` to each tab button so only the active tab is in the tab order
4. Use `event.currentTarget.children[i].focus()` to move focus programmatically

**Verification:** `tsc --noEmit`, `eslint`, `next build`, keyboard navigation test

**Status:** PENDING

---

### 4. C9-F5 — LOW — MapView empty state accessible description

**Files:** `src/components/MapView.tsx:433-441,935-953`

**Implementation steps:**
1. Add an `aria-label` to the map container div when no track is loaded and no map error
2. Use the existing i18n key pattern — add a new key like `app.mapWaitingForData` or reuse an existing one
3. The label should communicate that the map area is waiting for a travel file
4. When a track is loaded or an error occurs, the aria-label should be removed or updated

**Verification:** `tsc --noEmit`, `eslint`, `next build`

**Status:** PENDING

---

## Deferred findings (not scheduled this cycle)

All prior deferred items remain deferred per their existing exit criteria.

From `deferred-findings-cycle17-2026-04-23.md`:
- DF-C17-001 through DF-C17-006, DF-C17-008 through DF-C17-019 (see that file for details)
- DF-C17-007: RESOLVED (aria-valuetext now present on all SceneEditor sliders)

From cycle 4:
- DF-C4-001: SceneEditor normalizes on every name keystroke (MEDIUM/MEDIUM)
- DF-C4-002: ExportPanel estimated time multiplier inaccuracy (LOW/MEDIUM)

From cycle 5:
- DF-C5-001: Worker ERROR_CODE and MAX_MESSAGE_SIZE constants not enforced (LOW/HIGH)

New deferrals from cycle 9:

### DF-C9-001: JourneyCreator search regex robustness note
- **Source finding**: C9-F2
- **Severity / Confidence**: LOW / HIGH
- **File**: `src/components/JourneyCreator.tsx`
- **Reason for deferral**: The regexes are safe against ReDoS. The `query.length` code-unit vs grapheme cluster distinction is academic for this use case (coordinate/map-link input). No functional bug exists.
- **Exit criterion**: Re-open if JourneyCreator search is refactored to accept arbitrary text that could contain complex Unicode.

### DF-C9-002: usePlaybackController does not defensively reset on track change
- **Source finding**: C9-F6
- **Severity / Confidence**: LOW / MEDIUM
- **File**: `src/lib/usePlaybackController.ts:86-117`
- **Reason for deferral**: All current callers (`loadTrackIntoSession`, `startFreshJourneySession`) properly call `resetPlayback()` before setting a new track. Adding a defensive reset would change the hook's semantics and could mask bugs in future callers.
- **Exit criterion**: Re-open if a new caller is added that sets track without resetting playback, or during a usePlaybackController refactor.

### DF-C9-003: i18n translations bundled inline
- **Source finding**: C9-F7
- **Severity / Confidence**: LOW / HIGH
- **File**: `src/lib/i18n.ts`
- **Reason for deferral**: Already tracked as DF-C17-016. Static export means the bundle is cached after first load. Code-splitting locales adds complexity with minimal benefit.
- **Exit criterion**: Re-open when bundle-size optimization is in scope.
