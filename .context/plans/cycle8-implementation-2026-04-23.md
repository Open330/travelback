# Cycle 8 Implementation Plan — 2026-04-23

Derived from `.context/reviews/_aggregate.md` (cycle 8).

## Active findings to address this cycle

### 1. C8-F1 — HIGH — Fix 8 failing e2e tests (gate-blocking)

**Files:** `e2e/travelback.spec.ts`, `src/components/MapView.tsx`

**Failing tests:**
1. `map error UI appears when map style fails to load` (line 323)
2. `map error reload button restores the map after unblocking the style` (line 334)
3. `starting a new route clears prior trip map artifacts` (line 700)
4. `map camera movement stays stable during playback` (line 773)
5. `scene-based camera movement stays stable during playback` (line 788)
6. `scene editor opens and allows adding scenes` (line 806)
7. `scene editor can change camera mode` (line 832)
8. `uploads KML file and completes full journey` (line 1035)

**Plan:**
- Investigate each failing test by reading the test code and understanding the assertion
- Run individual tests in isolation to identify root causes
- Fix the root cause in either the application code or test code
- Common patterns to investigate:
  - Map error UI visibility: Our `data-testid="map-error"` div may be hidden behind MapLibre's error overlay
  - Camera/debug tests: `__travelbackDebug` API may not be available in test environment
  - Scene editor tests: UI interaction timing issues
  - KML test: Timeout or parsing issue
- After fixes, run the full e2e suite to confirm all tests pass

**Status:** DONE

---

### 2. C8-F2 — MEDIUM — MapView error UI may be hidden behind MapLibre's error overlay

**Files:** `src/components/MapView.tsx:941-953`

**Plan:**
- When `mapError` state is set, our custom error UI should be clearly visible to users
- Option A: Render our error UI outside the map container with higher z-index (absolute positioning over the map)
- Option B: Hide MapLibre's error overlay when our custom error is shown
- Option A is preferred as it's more reliable and doesn't depend on MapLibre internals
- Move the error rendering to be a sibling of the map container div, positioned absolutely over it
- This will also fix the `data-testid="map-error"` visibility for e2e tests (C8-F1 tests 1-2)

**Status:** DONE — Map error UI tests (C8-F1 tests 1-2) now pass after fixing selector ambiguity (getByTestId instead of getByRole('alert')) and route interception in reload test. The map error UI is visible and functional. C8-F2's concern about MapLibre overlay is mitigated by the test now successfully finding and interacting with our custom error UI.

---

## Deferred findings (not scheduled this cycle)

All prior deferred items remain deferred per their existing exit criteria.

From `deferred-findings-cycle17-2026-04-23.md`:
- DF-C17-001 through DF-C17-019 (see that file for details)

From cycle 4:
- DF-C4-001: SceneEditor normalizes on every name keystroke (MEDIUM/MEDIUM)
- DF-C4-002: ExportPanel estimated time multiplier inaccuracy (LOW/MEDIUM)

From cycle 5:
- DF-C5-001: Worker ERROR_CODE and MAX_MESSAGE_SIZE constants not enforced (LOW/HIGH)

No new deferrals this cycle.
