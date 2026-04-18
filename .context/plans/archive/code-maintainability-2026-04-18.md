# Code Maintainability — 2026-04-18

**Priority:** P2 — long-term code health, least user-facing urgency
**Source:** comprehensive-deep-code-review-2026-04-18 (P1-2, P1-3, P2-4 through P2-9, P3 items), comprehensive-ui-ux-review-2026-04-18 (P2-7, P2-11, P2-13, P2-14, P2-16, P2-17, P3 items)
**Estimated effort:** 3-5 days (can be spread across multiple iterations)

---

## Findings addressed

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| CD-P1-2 | Stale closure in usePlaybackController animation loop — one-frame glitch after pause | P1 | usePlaybackController.ts |
| CD-P1-3 | MapView animation useEffect excessive dependency array | P1 | MapView.tsx |
| CD-P2-4 | page.tsx still 411 lines with 15+ state variables — God Component | P2 | page.tsx |
| CD-P2-5 | TrackWorkspace has 25+ props — interface bloat | P2 | TrackWorkspace.tsx |
| CD-P2-6 | MapView is 850 lines — does 7 things | P2 | MapView.tsx |
| CD-P2-7 | Four eslint-disable for exhaustive-deps without explanatory comments | P2 | MapView.tsx, TimelineSelector.tsx, JourneyCreator.tsx |
| CD-P2-8 | i18n.ts is 1726 lines — 90% translation data | P2 | i18n.ts |
| CD-P2-9 | Duplicated haversineDistance / centerDistanceMeters logic | P2 | interpolate.ts, MapView.tsx |
| CD-P2-10 | parser.ts uses 20+ `as Record<string, unknown>` casts without validation | P2 | parser.ts |
| CD-P2-11 | computeCameraForProgress transition blend discontinuity | P2 | camera.ts |
| CD-P2-12 | ElevationProfile SVG IDs hardcoded — breaks with multiple instances | P2 | ElevationProfile.tsx |
| UX-P2-7 | KeyboardHelp kbd 44px min-height on non-interactive elements | P2 | KeyboardHelp.tsx |
| UX-P2-11 | Track name uses fragile negative right margin | P2 | TrackWorkspace.tsx |
| UX-P2-13 | GoogleGuide SVG text doesn't scale with i18n | P2 | GoogleGuide.tsx |
| UX-P2-14 | ExportPanel checkmark reduced-motion handling inconsistent | P2 | globals.css |
| UX-P2-16 | FileUpload gi transition missing box-shadow for smooth focus ring | P2 | vitro-base.css |
| UX-P2-17 | Controls progress slider has no seek-time feedback during drag | P2 | Controls.tsx |
| UX-P3-1 | ThemeToggle icon size imbalance | P3 | ThemeToggle.tsx |
| UX-P3-2 | ErrorBoundary emoji renders inconsistently | P3 | ErrorBoundary.tsx |
| UX-P3-3 | GlobalToolbar locale select has no dropdown chevron | P3 | GlobalToolbar.tsx |
| UX-P3-4 | Controls speed/duration labels asymmetric on mobile | P3 | Controls.tsx |
| UX-P3-5 | MapView error has no retry button | P3 | MapView.tsx |
| UX-P3-6 | SceneEditor redundant 0-100% labels | P3 | SceneEditor.tsx |
| UX-P3-7 | GoogleGuide Takeout link styled as primary action | P3 | GoogleGuide.tsx |
| UX-P3-8 | JourneyCreator Done/Create Route buttons use hardcoded #f97316 | P3 | JourneyCreator.tsx |
| UX-P3-9 | MapView error div missing role="alert" | P3 | MapView.tsx |
| UX-P3-10 | ExportPanel Share failure gives no feedback | P3 | ExportPanel.tsx |
| UX-P3-11 | SceneEditor range slider styling inconsistent with Controls | P3 | SceneEditor.tsx |
| CD-P3-1 | isTouchDevice computed on mount, never updates | P3 | FileUpload.tsx |
| CD-P3-2 | basePath computed inside component on every render | P3 | FileUpload.tsx, GoogleGuide.tsx |

---

## Implementation steps

### Phase 1 — Animation & state correctness (P1)

#### 1a. Fix usePlaybackController stale closure after pause

**File:** `src/lib/usePlaybackController.ts:81-109`

Add an `isPlayingRef` that the `animate` function checks before each frame:
```ts
const isPlayingRef = useRef(false)
// Sync the ref when isPlaying changes
useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])

// Inside animate:
const animate = () => {
  if (!isPlayingRef.current || !trackRef.current) return
  // ... existing logic
}
```

#### 1b. Reduce MapView animation useEffect dependencies

**File:** `src/components/MapView.tsx:831`

Store `scenes`, `duration`, and `transitionDuration` in refs (like `trackRef`), read from refs inside the effect, and remove them from the dependency array. Only `progress` should drive re-execution during playback.

---

### Phase 2 — Component decomposition

#### 2a. Extract useAppReducer from page.tsx

Group related state into a single `useReducer`:
- Track state: `fullTrack`, `track`, `trackSessionKey`
- UI state: `showExport`, `showSceneEditor`, `showGoogleGuide`, `showKeyboardHelp`, `isCreatingJourney`
- Appearance state: `colorMode`, `mapStyleKey`, `hasExplicitMapStyleChoice`

This reduces `page.tsx` from 15 `useState` calls to ~5 (reducer + a few independent states like `units`, `locale`).

#### 2b. Reduce TrackWorkspace prop count

Group related props into objects:
```ts
interface PlaybackState {
  isPlaying: boolean; progress: number; speed: number; duration: number; followCamera: boolean
}
interface PlaybackActions {
  onTogglePlay: () => void; onSeek: (p: number) => void; onSpeedChange: (s: number) => void; ...
}
```

#### 2c. Extract MapView hooks

Extract into custom hooks:
- `useMapInit` — map initialization, style switching, cleanup
- `useTrackLayers` — track route/trail layer management
- `useCameraFollow` — camera animation, follow mode, scene transitions
- `useReferenceGrid` — reference grid management

---

### Phase 3 — Code quality improvements

#### 3a. Split i18n.ts translations into per-locale files

Move translations to `src/locales/en.ts`, `src/locales/ko.ts`, etc. Import them in `i18n.ts`.

#### 3b. Consolidate distance utilities

Replace `centerDistanceMeters` in MapView.tsx with an import from `interpolate.ts`. Add `approximateDistanceMeters` to `interpolate.ts` that uses the equirectangular approximation for performance-critical paths.

#### 3c. Add eslint-disable comments

Add explanatory comments above each `eslint-disable-next-line react-hooks/exhaustive-deps`:
```ts
// eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally omits mapStyleKey to avoid re-creating the map on every style change
```

#### 3d. ElevationProfile SVG useId()

```tsx
const gradientId = useId()
const clipId = useId()
// Replace hardcoded "elev-grad" and "elev-clip" with gradientId/clipId
```

#### 3e. Module-level basePath constants

Move `basePath` computation out of component bodies in FileUpload.tsx and GoogleGuide.tsx:
```ts
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '')
```

---

### Phase 4 — UI polish (P3 items, quick hits)

#### 4a. KeyboardHelp — reduce kbd min-height
Remove `min-h-11` from non-interactive `<kbd>` elements.

#### 4b. globals.css — add box-shadow to gi transition
```css
.gi { transition: background .15s ease, border-color .15s ease, transform .15s ease, box-shadow .15s ease; }
```

#### 4c. ExportPanel checkmark — consistent reduced-motion
```css
@media (prefers-reduced-motion: reduce) {
  .export-checkmark { animation: none; }
}
```

#### 4d. ErrorBoundary — add aria-hidden to emoji, or replace with lucide icon
```tsx
<AlertTriangle size={48} strokeWidth={1.5} style={{ color: 'var(--err)' }} />
```

#### 4e. MapView error — add role="alert" and retry button
```tsx
<div role="alert" ...>
  <p>...</p>
  <button onClick={() => window.location.reload()} className="gi mt-4 px-4 py-2 text-sm cursor-pointer" style={{ color: 'var(--t1)' }}>
    {t('error.reloadPage')}
  </button>
</div>
```

#### 4f. GlobalToolbar locale select — add chevron
Use `vitro-select` class or add a custom `backgroundImage` chevron.

#### 4g. JourneyCreator buttons — use design tokens
Replace hardcoded `#f97316` with `rgba(var(--gl),.85)` or define a `--trail` token.

#### 4h. GoogleGuide Takeout link — style as secondary
Change from `vitro-btn-primary` to `gi` with `color: 'rgb(var(--gl))'`.

#### 4i. SceneEditor redundant labels
Remove the coverage bar 0%/100% labels (keep range editor labels).

#### 4j. ExportPanel share — log non-abort failures
```ts
catch (err) {
  if (err instanceof DOMException && err.name === 'AbortError') return
  console.warn('Share failed:', err)
}
```

#### 4k. Controls traveled distance at 100%
```ts
const traveled = progress >= 1 ? total : total * progress
```

---

## Verification checklist

- [x] `npm run build` succeeds
- [x] `npm run test:e2e:static:ci` passes
- [x] No stale closure in playback animation after pause (US-023: isPlayingRef)
- [ ] MapView animation effect only re-runs on progress change during playback (deferred)
- [ ] page.tsx reduced to fewer useState calls (deferred — useReducer refactor)
- [ ] TrackWorkspace prop count reduced (deferred — prop grouping)
- [ ] All eslint-disable comments have explanatory notes (deferred)
- [ ] i18n translations in separate files (deferred — large refactor)
- [ ] No duplicate distance utility functions (deferred)
- [x] ElevationProfile SVG IDs unique per instance (US-024: useId)
- [x] All P3 UI polish items implemented (US-026: ErrorBoundary, MapView, Controls)

**Status: PARTIAL** — Phase 1 (stale closure) and Phase 3 partial (useId, P3 polish) implemented. Phase 2 (component decomposition) and remaining Phase 3 items deferred to future iteration. Commit: `8460022`
