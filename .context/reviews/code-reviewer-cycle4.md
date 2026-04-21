# Code Reviewer -- Cycle 4 (2026-04-21)

## Summary
The codebase is well-structured with consistent patterns. All cycle 3 fixes confirmed applied. Found 6 new issues ranging from MEDIUM to LOW severity.

## Findings

### C4-001: Module-level mutable state in ExportPanel [MEDIUM]
- **File:** `src/components/ExportPanel.tsx` line 31
- **Issue:** `let codecSupportCache: Record<VideoCodec, boolean> | null = null` is module-level mutable state. In React concurrent mode or if the component is used in multiple trees, this shared cache could cause stale or cross-contaminated results. The cache is only written, never invalidated (e.g., on browser codec support changes via OS updates).
- **Impact:** Low practical impact today since the app is single-instance, but breaks React's single-direction data flow principle and makes testing harder.

### C4-002: Module-level mutable state in ModalDialog [MEDIUM]
- **File:** `src/components/ModalDialog.tsx` lines 31-32
- **Issue:** `const openModalStack: string[] = []` and `let lockedBodyOverflow: string | null = null` are module-level mutable arrays/variables. Same concern as C4-001 -- shared across all instances, not reset between component trees, and not safe for server-side rendering (though guarded by `canRenderPortal`).
- **Impact:** Works correctly in practice because modals are opened/closed in LIFO order and the app is single-page. But if two React trees were mounted (e.g., during hot reload), state would cross-contaminate.

### C4-003: `generateId()` fallback uses `Math.random()` [LOW]
- **File:** `src/types.ts` lines 1-6
- **Issue:** When `crypto.randomUUID` is unavailable, the fallback `${Date.now()}-${Math.random().toString(36).slice(2)}` is not cryptographically safe. This is acceptable for UI keys (scene IDs) since they're never used for security, but the collision probability under rapid creation is non-trivial: `Date.now()` has millisecond resolution and `Math.random()` provides ~52 bits of entropy.
- **Impact:** Negligible for current usage (scene IDs are created one at a time by user interaction).

### C4-004: `isTouchDevice` detection runs once on mount only [LOW]
- **File:** `src/components/FileUpload.tsx` lines 29-32
- **Issue:** `setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)` runs once in a useEffect and never updates. On devices with both touch and pointer (e.g., Surface Pro, convertible laptops), the detection is static. If a user detaches a keyboard, the touch state becomes stale.
- **Impact:** Only affects the display of an iOS tip hint text (`fileUpload.iosTip`). Very low user impact.

### C4-005: `next/image` for static SVG adds unnecessary optimization layer [LOW]
- **File:** `src/components/FileUpload.tsx` lines 163-168, 185-189
- **Issue:** Using `next/image` for `landing-preview.svg` (a static SVG) adds the Image Optimization API overhead. SVGs are already resolution-independent and don't benefit from next/image's resizing or format conversion. The `width` and `height` props are required but meaningless for SVG.
- **Impact:** Adds an unnecessary API call in dev mode and a slight processing overhead. Already deferred as DF-C3-005.

### C4-006: Multiple `eslint-disable` comments across codebase [LOW]
- **Files:** `src/app/page.tsx` lines 94-95, `src/components/MapView.tsx` lines 646-647, 671, 819-820, 935-936
- **Issue:** Several `eslint-disable-next-line react-hooks/exhaustive-deps` and `eslint-disable-next-line react-hooks/exhaustive-deps` comments. While the justifications are documented in comments, some (particularly the MapView ones) could mask future dependency bugs if the component logic changes.
- **Impact:** Low risk but worth periodic review.

## Positive Observations
- Clean separation of concerns between hooks and components
- Consistent use of `useCallback` with proper dependency arrays
- Proper error boundary usage wrapping the entire app
- Clean TypeScript types with no `any` usage in application code
- Good use of `useImperativeHandle` for MapView's ref API
- ParseError with machine-readable codes is a strong pattern for i18n
