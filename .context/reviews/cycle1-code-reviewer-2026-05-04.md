# Code Quality Review — Travelback (Cycle 1, 2026-05-04)

**Reviewer**: code-reviewer
**Scope**: Full repository source code

## Summary

The codebase is well-structured for a client-side Next.js application. TypeScript strict mode is enabled, naming conventions are consistent, and the code is generally readable. However, several maintainability and correctness issues exist.

## Findings

### CR-01: page.tsx is a god component (658 lines, ~30 useState hooks)
**Confidence**: High
**File**: `src/app/page.tsx`
**Description**: `HomeInner` manages track state, theme, map style, scenes, playback, export, modals, trim, units, locale, accessibility announcements, and more — all in one component. This violates Single Responsibility and makes the component difficult to reason about, test, or refactor.
**Fix**: Extract theme/mapstyle into a `useThemeController` hook, scenes into a `useSceneController` hook, and modal orchestration into a `useModalManager` hook.

### CR-02: Duplicate `parseOptionalNumber` and `parseOptionalDate` definitions
**Confidence**: High
**File**: `src/lib/parser.ts:23-33`, `src/lib/googleJsonParser.ts:21-32`
**Description**: Both files define identical `parseOptionalNumber` and `parseOptionalDate` functions. This is a DRY violation — if one is updated for a bug fix, the other may be missed.
**Fix**: Extract these into a shared utility module (e.g., `src/lib/parse-utils.ts`) and import from both files.

### CR-03: Duplicate `assertPointBudget` definitions
**Confidence**: High
**File**: `src/lib/parser.ts:17-21`, `src/lib/googleJsonParser.ts:60-64`
**Description**: Same function defined in two places with identical logic but hardcoded 250_000 limit in googleJsonParser vs `MAX_TRACK_POINTS` constant in parser.ts.
**Fix**: Single source of truth for the budget constant and function.

### CR-04: Inconsistent indentation in useExportController.ts
**Confidence**: High
**File**: `src/lib/useExportController.ts:192-237`
**Description**: Lines 192-237 use tab-based indentation instead of the project's 2-space convention. This appears to be a formatting inconsistency.
**Fix**: Reformat to 2-space indentation.

### CR-05: Mixed indentation in MapView.tsx
**Confidence**: High
**File**: `src/components/MapView.tsx:797-811`
**Description**: The `getMapState` debug function body uses inconsistent indentation (tab-indented block inside space-indented code).
**Fix**: Normalize to project's 2-space convention.

### CR-06: eslint-disable comments without tracking
**Confidence**: Medium
**File**: `src/app/page.tsx:153,179,188`, `src/components/MapView.tsx:853,879,1052,1175`
**Description**: Multiple `eslint-disable-next-line` comments suppress `react-hooks/exhaustive-deps` warnings. While each has a justification comment, there is no centralized tracking.
**Fix**: Consider whether some suppressions are still needed.

### CR-07: Stale closure risk in `handleRangeChange`
**Confidence**: Medium
**File**: `src/app/page.tsx:319-336`
**Description**: `handleRangeChange` depends on `scenes.length` — when scenes change, the callback is recreated. If scenes change during a drag operation, the callback reference changes but the TimelineSelector might still hold the old reference.
**Fix**: Use a ref for scenes.length check inside the callback instead of depending on it directly.

### CR-08: Magic numbers in camera system
**Confidence**: Medium
**File**: `src/lib/camera.ts:115,149,181,396`
**Description**: The smoothstep formula `t * t * (3 - 2 * t)` is used inline without a named function. Look-ahead progress `0.05` (5%) is a magic number.
**Fix**: Extract `smoothstep(t)` as a named utility and `LOOK_AHEAD_FRACTION = 0.05` as a constant.

### CR-09: WeakMap cache never evicts overview cameras
**Confidence**: Low
**File**: `src/lib/camera.ts:97`
**Description**: `overviewCameraCache` is a `WeakMap<Track, CameraState>` — correct for GC but limited effectiveness across track sessions.
**Fix**: No action needed.

### CR-10: i18n translations object is ~1800 lines in a single file
**Confidence**: Medium
**File**: `src/lib/i18n.ts`
**Description**: All 5 locale translations are in one monolithic file. Adding a new key requires editing 5 places.
**Fix**: Split translations into per-locale files or use a compile-time extraction tool.

### CR-11: `readStoredMapStyleKey` uses type assertion
**Confidence**: Low
**File**: `src/app/page.tsx:66`
**Description**: `(MAP_STYLES as Record<string, unknown>)[saved]` bypasses TypeScript type checking.
**Fix**: Use `Object.keys(MAP_STYLES).includes(saved)` for type-safe validation.

## Severity Summary

| Severity | Count |
|----------|-------|
| High     | 5     |
| Medium   | 5     |
| Low      | 2     |
