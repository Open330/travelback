# Cycle 3 Implementation Plan -- 2026-04-21

## Review Summary

Deep review focused on 4 user-reported issues. **13 new findings** identified, 5 HIGH severity. See `.context/reviews/cycle3-composite-2026-04-21.md` and `.context/reviews/_aggregate.md`.

## USER-INJECTED TODOs (Primary Focus)

1. 기본 로드 상태에서 UI 컬러 스키마가 엉망임 -- initial load theme broken
2. light / dark mode toggle을 한번이라도 클릭해야 올바른 테마로 표시됨 -- toggle click required
3. UI 버튼이 너무 많이 겹침 -- buttons overlap
4. 지도가 로드가 안 됨 -- map does not load

## Active Implementation Items

### TASK-1: Fix React hydration stripping data-mode from <html> [U1-1, U2-1] -- HIGH/HIGH
- **User Issue:** #1, #2
- **Root Cause:** `RootLayout` renders `<html>` WITHOUT `data-mode`. Bootstrap script adds it. React hydration removes it because virtual DOM lacks it. `useEffect` re-adds it, causing a flash.
- **Files:** `src/app/layout.tsx` line 52
- **Fix:** Add `data-mode="light"` and `data-mapstyle="voyager"` to the `<html>` element in the server render. The bootstrap script already guards with `if(!d.getAttribute('data-mode'))` so it won't double-set if dark mode is preferred. React's virtual DOM now includes `data-mode`, preventing hydration from stripping it.
- **Status:** DONE (commit 015d528)

### TASK-2: Add CSS variable fallbacks to body style [U1-2] -- MEDIUM/HIGH
- **User Issue:** #1
- **Root Cause:** `style="background:var(--bg);color:var(--t1)"` has no fallback values. If variables are undefined, background is transparent and text color is invalid.
- **Files:** `src/app/layout.tsx` line 73
- **Fix:** Change to `style="background:var(--bg,#EBEEF4);color:var(--t1,#050810)"` so there are safe defaults even if CSS variables are temporarily undefined.
- **Status:** DONE (commit 015d528)

### TASK-3: Fix ThemeToggle DOM mutation during render [U2-2] -- MEDIUM/HIGH
- **User Issue:** #2
- **Root Cause:** `detectInitialMode()` calls `document.documentElement.setAttribute('data-mode', inferredMode)` during `useState` initializer (render phase). This is a React anti-pattern.
- **Files:** `src/components/ThemeToggle.tsx` lines 7-25, especially line 23
- **Fix:** Remove the `document.documentElement.setAttribute` call from `detectInitialMode()`. Since the component is always controlled (parent provides `controlledMode`), the DOM mutation is unnecessary. The bootstrap script and the parent component's `useEffect` already handle setting `data-mode`.
- **Status:** DONE (commit 015d528)

### TASK-4: Fix GlobalToolbar hidden behind FileUpload overlay [U3-1] -- MEDIUM/HIGH
- **User Issue:** #3
- **Root Cause:** Both `GlobalToolbar` and `FileUpload` use `z-10`. FileUpload renders after GlobalToolbar in the DOM, so it stacks on top. The semi-transparent blurred overlay makes toolbar buttons hard to read.
- **Files:** `src/components/GlobalToolbar.tsx` line 25
- **Fix:** Change GlobalToolbar z-index from `z-10` to `z-20` so it renders above the file upload overlay. The toolbar should always be accessible.
- **Status:** DONE (commit cd1430c)

### TASK-5: Add MapLibre error event listener for silent map failures [U4-1] -- HIGH/HIGH
- **User Issue:** #4
- **Root Cause:** MapView constructor only catches `new maplibregl.Map()` errors. Style fetch failures fire `error` events on the map instance but the component doesn't listen for them. Map shows blank with no error message.
- **Files:** `src/components/MapView.tsx` lines 547-639
- **Fix:** Add `map.on('error', handler)` listener in the map initialization useEffect. The handler should set `mapError` state so the error UI is shown. Also listen for `style.load` errors specifically.
- **Status:** DONE (commit bc5e338)

## Deferred Items

### New Deferred Findings from This Cycle

- DF-C3-001: CSS layer ordering may deprioritize theme variables [U1-3] (LOW/MEDIUM) -- No current impact; re-open if unlayered CSS sets Vitro variables
- DF-C3-002: Mobile users lose theme/locale access when track loaded [U3-2] (MEDIUM/MEDIUM) -- Related to DF-C1-001/DF-C2-001 mobile IA; re-open in next UX-focused cycle
- DF-C3-003: TrackToolbar/title overlap potential on large screens [U3-3] (LOW/LOW) -- Minor; re-open if reports come in
- DF-C3-004: Map style URL path correctness on alternative hosting [U4-2] (HIGH/MEDIUM) -- Works correctly for GitHub Pages deployment; re-open if hosting changes
- DF-C3-005: next/image for static SVG adds complexity [A2] (LOW/HIGH) -- Low impact; re-open if LCP score needs optimization
- DF-C3-006: Select dropdown doesn't match dark theme [A3] (LOW/MEDIUM) -- Native OS limitation; re-open if custom select component is built

### Previously Deferred (Carried Forward)

- DF-C1-001: Mobile information architecture and discoverability polish
- DF-C1-002: Broad maintainability/performance restructuring
- DF-C2-001: Mobile information architecture gaps
- DF-C2-002: Playback progress drives whole-app rerenders (HIGH/HIGH)
- DF-C2-003: Large GPX/KML imports parse on main thread
- DF-C2-004: Manual route dragging is O(n) on pointer move
- DF-C2-005: Export settings permit browser-hostile combinations
- DF-C2-006: Locale/help content eagerly bundled
- DF-C2-007: Large default variable font payload
- DF-C2-008: E2E suite serialized and sleep-heavy
- DF-C2-009: Residual CSP allows inline styles
- DF-C2-010: Local-only bundled styles ship without real basemap layer
- DF-C4-001: `preserveDrawingBuffer: true` always on
- DF-C5-001: TrackToolbar mobile menu focus trapping
- C11-007 (LOW): ElevationProfile RTL click handling
- C11-009 (LOW): Controls elapsed floating point wobble
- C11-005 (LOW): TrackWorkspace title overlap with scene editor
- C12-005 (LOW): TimelineSelector reset button bypasses resolveRangeIndexes
- C12-008 (LOW): ExportPanel file size estimate accuracy
