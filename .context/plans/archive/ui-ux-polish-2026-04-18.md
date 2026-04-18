# UI/UX Polish — 2026-04-18

**Priority:** P1-P2 — significant usability and consistency improvements
**Source:** comprehensive-ui-ux-review-2026-04-18 (P1-1 through P1-6, P2-8 through P2-23, P3 items), comprehensive-deep-code-review-2026-04-18 (P1-7, P1-9, P2-10, P3-3)
**Estimated effort:** 6-8 hours

---

## Findings addressed

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| UX-P1-1 | SceneEditor absolute positioning breaks on mobile | P1 | SceneEditor.tsx |
| UX-P1-2 | Bottom zone stacks 4 layers competing for space on mobile | P1 | TrackWorkspace.tsx |
| UX-P1-4 | ElevationProfile non-interactive on mobile but looks clickable; too small | P1 | ElevationProfile.tsx |
| UX-P1-5 | SceneEditor uses browser confirm() — breaks glass UI | P1 | SceneEditor.tsx |
| UX-P1-6 | JourneyCreator uses browser confirm() — breaks glass UI | P1 | JourneyCreator.tsx |
| UX-P2-8 | Toast position overlaps Controls on mobile; dismiss too small | P2 | Toast.tsx |
| UX-P2-9 | Controls stats row wraps awkwardly on narrow screens | P2 | Controls.tsx |
| UX-P2-10 | Track name uses fragile negative right margin | P2 | TrackWorkspace.tsx |
| UX-P2-12 | Scene range handles too small, no visual affordance | P2 | SceneEditor.tsx |
| UX-P2-15 | JourneyCreator search results clipped by overflow-hidden | P2 | JourneyCreator.tsx |
| UX-P2-18 | GoogleGuide tabs use undefined `--bg-gi` variable | P2 | GoogleGuide.tsx |
| UX-P2-19 | JourneyCreator icon selector selected state nearly invisible | P2 | JourneyCreator.tsx |
| UX-P2-20 | ElevationProfile hardcodes #06b6d4 instead of design tokens | P2 | ElevationProfile.tsx |
| UX-P2-21 | SceneEditor name input invisible focus state, imperative DOM | P2 | SceneEditor.tsx |
| UX-P2-22 | ExportPanel progress bar transition jank on frequent updates | P2 | ExportPanel.tsx |
| UX-P2-23 | FileUpload drop zone feedback subtle; misleading on touch | P2 | FileUpload.tsx |
| CD-P1-7 | SceneEditor uses Date.now() for IDs — collisions | P1 | SceneEditor.tsx |
| CD-P1-9 | Toast uses Date.now() for IDs | P1 | Toast.tsx |
| CD-P3-3 | Controls traveled distance floating point imprecision at 100% | P3 | Controls.tsx |

---

## Implementation steps

### 1. SceneEditor mobile bottom-sheet pattern

**File:** `src/components/SceneEditor.tsx:291`

**Current:** `absolute left-4 right-4 top-44 bottom-32 z-20 w-auto gs`

**Fix:** Use bottom-sheet pattern on mobile, side panel on desktop:
```tsx
className="absolute left-4 right-4 z-20 w-auto gs flex flex-col overflow-hidden
  bottom-0 max-h-[70vh] rounded-b-none
  sm:right-auto sm:top-16 sm:w-80 sm:max-w-[calc(100vw-2rem)] sm:bottom-auto sm:rounded-[var(--r-glass)]"
```

Add a drag handle at the top of the mobile panel for discoverability.

**Verification:** Open SceneEditor on iPhone SE. Confirm it shows as a bottom sheet. On desktop, confirm it shows as a side panel.

---

### 2. ElevationProfile — make interactive on mobile with larger height

**File:** `src/components/ElevationProfile.tsx:71`

**Current:** `pointer-events-none sm:pointer-events-auto` with `h-6 sm:h-10`

**Fix:** Make interactive on mobile with adequate height:
```tsx
className="h-10 w-full rounded cursor-pointer sm:h-10"
```

Remove `pointer-events-none` entirely. The `onClick={handleClick}` handler will work on all viewports. The `h-10` (40px) meets the 44px touch target guideline with padding.

**Verification:** Tap the elevation profile on mobile. Confirm seeking works. Confirm the chart is large enough to read elevation values.

---

### 3. Replace browser confirm() with ModalDialog confirmation

**Files:** `src/components/SceneEditor.tsx:312-316`, `src/components/JourneyCreator.tsx:519`

**Current:** Both use `confirm(t('...'))` which produces native browser dialogs.

**Fix:** Add a confirmation state and render a ModalDialog:

For SceneEditor:
```tsx
const [pendingPreset, setPendingPreset] = useState<(() => void) | null>(null)

// In preset button:
onClick={() => {
  if (scenes.length > 0) setPendingPreset(() => () => commitScenes(generateDefaultScenes()))
  else commitScenes(generateDefaultScenes())
}}

// Render confirmation dialog:
{pendingPreset && (
  <ModalDialog open onClose={() => setPendingPreset(null)} labelledBy="scene-confirm-title">
    <p id="scene-confirm-title">{t('scenes.replaceConfirm')}</p>
    <button onClick={() => { pendingPreset(); setPendingPreset(null) }}>{t('app.replace')}</button>
    <button onClick={() => setPendingPreset(null)}>{t('app.cancel')}</button>
  </ModalDialog>
)}
```

Same pattern for JourneyCreator's discard confirmation. Add i18n keys for "Replace" and "Cancel" in all 5 locales if not already present.

**Verification:** Click a scene preset with existing scenes. Confirm a styled modal appears. Confirm "Replace" and "Cancel" buttons work. Confirm button labels are localized.

---

### 4. Track name integration into TrackToolbar

**File:** `src/components/TrackWorkspace.tsx:115-121`

**Current:** `right-[43rem]` absolute positioning with fragile negative margin.

**Fix:** Move track name into the TrackToolbar as a centered title that's visible between the left-side controls and right-side buttons:
```tsx
// TrackToolbar.tsx — accept trackName prop
<div className="hidden lg:flex flex-1 items-center justify-center min-w-0 px-2">
  <span className="truncate text-sm font-medium" style={{ color: 'var(--t2)' }}>
    {trackName}
  </span>
</div>
```

Remove the separate absolute-positioned title div from TrackWorkspace.

**Verification:** Load a track on a 1366px viewport. Confirm track name appears centered in the toolbar. Confirm it truncates gracefully for long names.

---

### 5. GoogleGuide tabs — fix undefined CSS variable

**File:** `src/components/GoogleGuide.tsx:294`

**Current:** `var(--bg-gi)` — undefined variable.

**Fix:** Replace with the correct variable name:
```tsx
style={{
  background: tab === i ? 'rgb(var(--gl))' : 'var(--gi-bg)',
  color: tab === i ? '#fff' : 'var(--t3)',
}}
```

**Verification:** Open GoogleGuide modal. Confirm inactive tab buttons have a visible glass background.

---

### 6. ElevationProfile — use design tokens instead of hardcoded colors

**File:** `src/components/ElevationProfile.tsx:79-80,87,93,98`

**Current:** Hardcoded `#06b6d4` (teal) and `#f97316` (orange).

**Fix:** Use `style` attribute for SVG elements that need CSS custom properties (SVG attributes don't support `var()`):
```tsx
<stop offset="0%" style={{ stopColor: 'rgb(var(--gl))', stopOpacity: 0.4 }} />
<stop offset="100%" style={{ stopColor: 'rgb(var(--gl))', stopOpacity: 0.05 }} />
<path d={areaD} fill="url(#elev-grad)" />
<path d={pathD} fill="none" style={{ stroke: 'rgb(var(--gl))', strokeWidth: 1.5 }} vectorEffect="non-scaling-stroke" />
<path d={areaD} style={{ fill: 'rgb(var(--gl))', opacity: 0.25 }} clipPath="url(#elev-clip)" />
<line ... style={{ stroke: 'var(--trail, #f97316)', strokeWidth: 1.5 }} vectorEffect="non-scaling-stroke" opacity={0.8} />
```

Also add `--trail` CSS variable to `vitro-base.css` with `#f97316` as default.

**Verification:** Switch between map styles (Voyager, Positron, Dark). Confirm elevation profile colors adapt to the current glow color.

---

### 7. Fix SceneEditor name input — React state instead of imperative DOM

**File:** `src/components/SceneEditor.tsx:381-385`

**Current:** Uses `e.target.style.borderBottomColor = 'rgb(var(--gl))'` in onFocus/onBlur.

**Fix:** Use React state:
```tsx
const [focusedInput, setFocusedInput] = useState<string | null>(null)

<input
  value={scene.name}
  onChange={e => updateScene(scene.id, { name: e.target.value })}
  className="text-xs font-semibold bg-transparent w-32 outline-none border-b"
  style={{
    color: 'var(--t1)',
    borderBottomColor: focusedInput === scene.id ? 'rgb(var(--gl))' : 'var(--div)',
    transition: 'border-color .15s ease',
  }}
  onFocus={() => setFocusedInput(scene.id)}
  onBlur={() => setFocusedInput(null)}
/>
```

**Verification:** Click a scene name. Confirm a subtle divider line appears. Confirm it transitions smoothly. Edit the name and confirm it saves.

---

### 8. Remaining P2 fixes (quick hits)

#### 8a. Toast position + dismiss button sizing
```tsx
// Toast.tsx line 59
<div className="fixed bottom-28 sm:bottom-24 right-4 z-50 flex flex-col gap-2">
// Toast.tsx line 45 — enlarge dismiss button
<button className="cursor-pointer flex-shrink-0 flex min-h-11 min-w-11 items-center justify-center" ...>
```

#### 8b. Controls stats row — prevent awkward wrapping
```tsx
className="flex items-center justify-between gap-2 text-[11px] sm:ml-auto sm:gap-3 sm:text-sm whitespace-nowrap"
```

#### 8c. Scene range handles — enlarge and add hover state
```tsx
<div className="flex h-8 w-5 items-center justify-center rounded-full border-2 border-white/60 bg-[rgb(var(--gl))] shadow-lg transition-transform hover:scale-110 active:scale-95">
  <div className="h-4 w-0.5 rounded bg-black/30" />
</div>
```

#### 8d. JourneyCreator search results — change overflow-hidden to overflow-visible
```tsx
className="absolute top-20 left-4 z-10 w-72 max-w-[calc(100vw-2rem)] gs overflow-visible sm:top-4"
```

#### 8e. JourneyCreator icon selector — stronger selected state
```tsx
style={{
  color: 'var(--t1)',
  background: isSelected ? 'rgba(var(--gl),.15)' : undefined,
  borderColor: isSelected ? 'rgb(var(--gl))' : undefined,
  boxShadow: isSelected ? '0 0 0 2px rgba(var(--gl),.5) inset' : undefined,
  transform: isSelected ? 'scale(1.1)' : undefined,
}}
```

#### 8f. ExportPanel progress bar — fix transition jank
```tsx
<div className="h-full rounded-full" style={{
  width: `${exportProgress * 100}%`,
  background: 'rgb(var(--gl))',
  transition: 'width .3s linear',
}} />
```

#### 8g. FileUpload drop zone — conditional hint text
Show "formatHint" instead of "dropHint" on touch devices. Show "Release to upload" during drag on desktop.

#### 8h. Scene IDs — use crypto.randomUUID() instead of Date.now()
```tsx
id: `scene-${crypto.randomUUID().slice(0, 8)}`,
```

#### 8i. Toast IDs — simplify to crypto.randomUUID()
```tsx
id: crypto.randomUUID(),
```

#### 8j. Controls traveled distance at 100%
```tsx
const traveled = progress >= 1 ? total : total * progress
```

---

## Verification checklist

- [x] `npm run build` succeeds
- [x] `npm run test:e2e:static:ci` passes
- [x] SceneEditor works as bottom sheet on mobile
- [x] ElevationProfile is interactive on mobile with adequate height
- [x] Confirmation modals use ModalDialog, not browser confirm()
- [ ] Track name visible in toolbar on desktop (deferred — requires TrackToolbar refactor)
- [x] GoogleGuide tabs have visible glass background
- [x] Elevation profile colors adapt to map style
- [x] Scene name input has visible focus state
- [x] Toast does not overlap controls on mobile
- [x] No browser confirm() calls remain in codebase

**Status: COMPLETE** — 18/19 findings implemented. Track name integration deferred. Commits: `bcdc2d2`, `8460022`
