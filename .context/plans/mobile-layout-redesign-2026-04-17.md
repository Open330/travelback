# Mobile Layout Redesign — 2026-04-17

**Priority:** P0-P1 — largest design task, start early
**Source:** comprehensive-ui-ux-review-2026-04-17 (1.1, 1.4, 2.1, 2.4, 2.9, 3.1, 6.1, 6.2, 6.3), comprehensive-ui-ux-review-2026-04-14 (4)
**Estimated effort:** 1-2 days

---

## Findings addressed

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| 1.1 | Bottom zone vertical crush — controls + elevation + timeline compete for ~200px on mobile | P0 | TrackWorkspace.tsx, Controls.tsx, ElevationProfile.tsx, TimelineSelector.tsx |
| 1.4 | Scene editor dead zone / overlap on mobile | P0 | SceneEditor.tsx, TrackToolbar.tsx |
| 2.1 | Google Guide tabs overflow on mobile (7 tabs = 4 rows) | P1 | GoogleGuide.tsx |
| 2.4 | Elevation profile seek imprecise on mobile (24px tall) | P1 | ElevationProfile.tsx |
| 2.9 | Mobile "more controls" menu doesn't close on map pan | P1 | TrackToolbar.tsx |
| 3.1 | Upload card `p-12` excessive on small phones | P2 | FileUpload.tsx |
| 6.1 | TrackToolbar `sm:right-[18rem]` assumes scene editor always open | P2 | TrackToolbar.tsx |
| 6.2 | Upload card doesn't adapt to landscape mobile | P2 | FileUpload.tsx |
| 6.3 | Scene editor `sm:w-80` too narrow on small tablets | P2 | SceneEditor.tsx |
| UI-14-4 | Mobile workspace chrome consumes too much map (11.4% on short phones) | P2 | TrackWorkspace.tsx |

---

## Core design problem

On a 568px iPhone SE viewport with a track loaded, the map visible area is ~270px. Three UI bands stack at the bottom:
- TimelineSelector (bottom-40, h-12 = 48px)
- ElevationProfile (h-6 = 24px)
- Controls (gc card with progress bar + button row)

Additionally, the scene editor takes top-44 + bottom-32 = 304px, and the toolbar at top-4 occupies ~56px. The mobile user sees very little map.

---

## Implementation steps

### Phase 1 — Bottom sheet pattern for mobile

**Goal:** Replace the stacked bottom bands with a single swipe-up bottom sheet that contains timeline + elevation + controls.

**Files:** TrackWorkspace.tsx, new component `MobileBottomSheet.tsx`

**Design:**
- **Collapsed state** (default): Shows only a thin drag handle + Controls play/pause + progress bar + stats (~64px). Elevation and timeline are hidden inside the sheet.
- **Half-expanded**: Drag up to reveal elevation profile + stats. Map shrinks but is still visible.
- **Full-expanded**: Drag further to reveal timeline selector. Map is mostly hidden but still renders underneath.

**Implementation:**
1. Create `MobileBottomSheet.tsx` with drag-to-expand behavior using touch events
2. Use CSS `transform: translateY()` for smooth animation
3. At `max-width: 768px`, render the bottom sheet instead of the current stacked layout
4. Above 768px, keep the current desktop layout unchanged

**Snap points:**
- Collapsed: `translateY(calc(100% - 64px))`
- Half: `translateY(calc(100% - 200px))`
- Full: `translateY(0)`

---

### Phase 2 — Scene editor as a slide-over drawer on mobile

**File:** SceneEditor.tsx

**Current:** `absolute left-4 right-4 top-44 bottom-32` creates a dead zone between toolbar and editor.

**Fix:** On mobile (below `lg`), render the scene editor as a full-height slide-over drawer from the left:
- Width: `85vw` on mobile
- Height: `100vh` (full screen)
- Slide-in animation from the left
- Semi-transparent overlay behind it
- Close button at top-right

On desktop (`lg+`), keep the current side panel but ensure it doesn't overlap the track toolbar by adding `right: auto` when the toolbar needs space.

---

### Phase 3 — Google Guide mobile tabs

**File:** GoogleGuide.tsx:282

**Current:** `grid grid-cols-2` on mobile = 4 rows of tabs.

**Fix:** Replace grid with a horizontally scrollable tab strip:
```jsx
className="mb-3 flex gap-1.5 overflow-x-auto px-5 scrollbar-none"
```
Each tab becomes a pill/chip that scrolls horizontally. All 7 tabs fit in one row. Add `scroll-snap-type: x mandatory` for smooth snapping.

---

### Phase 4 — Elevation profile mobile interaction

**File:** ElevationProfile.tsx

**Current:** `h-6` (24px) on mobile — too small for touch interaction.

**Two options:**
- **Option A (recommended):** Make elevation profile non-interactive on mobile. Rely solely on the progress bar in Controls for seeking. The profile becomes decorative (visual only).
- **Option B:** Increase the tap target to 44px with transparent padding above/below the visible 24px chart.

If Option A: Add `pointer-events: none` on mobile and `cursor: pointer` on desktop.

---

### Phase 5 — Small fixes

#### 5a. TrackToolbar right offset
**File:** TrackToolbar.tsx:75
Replace `sm:right-[18rem]` with a conditional class that only applies when the scene editor is open:
```jsx
className={`... ${showSceneEditor ? 'sm:right-[18rem]' : 'sm:right-4'} ...`}
```

#### 5b. Mobile menu close on map pan
**File:** TrackToolbar.tsx
Add a `movestart` listener on the map instance to close the mobile menu when the user pans. Pass map reference or use a callback prop.

#### 5c. Upload card responsive padding
**File:** FileUpload.tsx:125
Change `p-12` to `p-6 sm:p-12`.

#### 5d. Upload card landscape overflow
**File:** FileUpload.tsx
Add `max-h-[90vh] overflow-y-auto` to the upload card container div.

---

## Verification checklist

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm run test:e2e:static:ci`
- [x] Visual: iPhone SE (320×568) — map area > 50% of viewport with bottom sheet collapsed
- [x] Visual: iPhone 12 (390×844) — bottom sheet collapsed/half/full all work
- [x] Visual: iPad portrait (768×1024) — scene editor as drawer, not side panel
- [x] Functional: Google Guide tabs scroll horizontally on mobile
- [x] Functional: Mobile menu closes on map pan
- [x] Functional: Upload card doesn't overflow on landscape
