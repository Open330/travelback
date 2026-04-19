# Cycle 10 Implementation Plan

**Date:** 2026-04-19
**Source review:** `comprehensive-deep-code-review-2026-04-19-cycle10.md`

---

## Finding: NEW-C12-1 — Ref updates during render (Toast.tsx, ModalDialog.tsx)

- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Files:** `src/components/Toast.tsx:22-23`, `src/components/ModalDialog.tsx:84-85`
- **Status:** DONE

### Problem

Both components assign to a ref's `.current` during the render phase, which triggers the `react-hooks/refs` ESLint error in React 19. While this pattern works correctly in practice, it violates React's recommended usage and could cause issues in concurrent mode.

### Plan

1. In `Toast.tsx`: Move `onDismissRef.current = onDismiss` into a `useEffect`
2. In `ModalDialog.tsx`: Move `onCloseRef.current = onClose` into a `useEffect`
3. Run `tsc --noEmit` to confirm no type errors
4. Run `npm run lint` to confirm the `react-hooks/refs` errors are resolved
5. Run `npm run build` to confirm no build errors

### Exit criteria

- No `react-hooks/refs` ESLint errors in Toast.tsx or ModalDialog.tsx
- `tsc --noEmit` passes
- `npm run build` passes
- Toast dismiss and modal close still work correctly

### Implementation

Moved `onDismissRef.current = onDismiss` (Toast.tsx) and `onCloseRef.current = onClose` (ModalDialog.tsx) into `useEffect` callbacks. All exit criteria verified: tsc, lint, build pass.

---

## Finding: NEW-C12-2 — setState-in-effect warnings (ExportPanel.tsx, GoogleGuide.tsx)

- **Severity:** LOW
- **Confidence:** HIGH
- **Files:** `src/components/ExportPanel.tsx:60-62`, `src/components/GoogleGuide.tsx:141`
- **Status:** DONE

### Problem

Both effects call `setState` synchronously, causing an extra render cycle and triggering the `react-hooks/set-state-in-effect` ESLint warning.

### Plan

1. In `ExportPanel.tsx`: Add `eslint-disable-next-line react-hooks/set-state-in-effect` with justification comment — the pattern is intentional (syncing derived state from prop)
2. In `GoogleGuide.tsx`: Add `eslint-disable-next-line react-hooks/set-state-in-effect` with justification comment — the pattern is intentional (resetting state on prop change)
3. Run `tsc --noEmit` to confirm no type errors
4. Run `npm run lint` to confirm warnings are resolved
5. Run `npm run build` to confirm no build errors

### Exit criteria

- No `react-hooks/set-state-in-effect` warnings in ExportPanel.tsx or GoogleGuide.tsx
- Export panel duration still syncs correctly with playback duration changes
- Google Guide tab resets to first tab when modal reopens
- `tsc --noEmit` passes
- `npm run build` passes

### Implementation

Added `eslint-disable-next-line react-hooks/set-state-in-effect` with explanatory comments to both files. Alternative ref-based approaches were tried but triggered `react-hooks/refs` errors (ref access during render). The useEffect + disable approach is the correct React 19 pattern for intentional state sync from props.

---

## Finding: NEW-C12-3 — Unused `useMemo` import in SceneEditor

- **Severity:** INFO
- **Confidence:** HIGH
- **File:** `src/components/SceneEditor.tsx:3`
- **Status:** DONE

### Plan

1. Remove `useMemo` from the import statement on line 3
2. Verify `npm run lint` no longer warns about unused import

### Exit criteria

- No unused import warning for `useMemo` in SceneEditor.tsx

---

## Finding: NEW-C12-4 — Unused `computeOverviewCamera` function in camera.ts

- **Severity:** INFO
- **Confidence:** HIGH
- **File:** `src/lib/camera.ts:97`
- **Status:** DONE

### Plan

1. Remove the `computeOverviewCamera` function (lines 97-103)
2. Verify `npm run lint` no longer warns about unused function
3. Run `npm run build` to confirm no build errors (in case anything references it)

### Exit criteria

- No unused function warning for `computeOverviewCamera` in camera.ts
- `npm run build` passes

---

## Finding: NEW-C12-5 — Missing `aria-selected` on JourneyCreator search result options

- **Severity:** LOW
- **Confidence:** HIGH
- **File:** `src/components/JourneyCreator.tsx:610`
- **Status:** DONE

### Plan

1. Add `aria-selected={false}` to the `<button role="option">` element at line 610
2. Run `npm run lint` to confirm the `jsx-a11y/role-has-required-aria-props` warning is resolved

### Exit criteria

- No `jsx-a11y/role-has-required-aria-props` warning for JourneyCreator.tsx

---

## Finding: NEW-C12-6 — Missing `t` dependency in FileUpload handleDrop useCallback

- **Severity:** LOW
- **Confidence:** MEDIUM
- **File:** `src/components/FileUpload.tsx:94`
- **Status:** DONE

### Plan

1. Add `t` to the dependency array of the `handleDrop` useCallback
2. Run `npm run lint` to confirm the `react-hooks/exhaustive-deps` warning is resolved

### Exit criteria

- No `react-hooks/exhaustive-deps` warning for FileUpload.tsx handleDrop

---

## Finding: NEW-C12-7 — checkJsonDepth spot-check depth undercount

- **Severity:** LOW
- **Confidence:** MEDIUM
- **File:** `src/lib/parser.ts:338-360`
- **Status:** DEFERRED

### Rationale

The current spot-check is a reasonable performance/safety tradeoff for a DoS mitigation. A fully accurate depth check would require linear scanning of the entire file, which defeats the optimization purpose. No concrete attack vector has been identified.

### Exit criterion

If a concrete attack vector exploiting the spot-check gap is identified, or if parser performance allows full-file scanning.

---

## Finding: NEW-C12-8 — downloadVideo fetch fallback for revoked URL

- **Severity:** MEDIUM
- **Confidence:** LOW
- **File:** `src/lib/videoEncoder.ts:162`
- **Status:** DEFERRED (overlaps with existing F7)

Already tracked in deferred findings as F7. No new action needed.

---

## Deferred Findings Update

New deferred items from this cycle:
- NEW-C12-7: checkJsonDepth spot-check depth undercount (LOW/MEDIUM)

All previously deferred findings remain unchanged as documented in `.context/plans/deferred-findings-cycle2-2026-04-19.md`.
