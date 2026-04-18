# Accessibility, Contrast & i18n — 2026-04-17

**Priority:** P0-P2 — cross-cutting, can run in parallel with mobile-layout and interaction plans
**Source:** comprehensive-ui-ux-review-2026-04-17 (2.3, 3.2, 3.3, 3.4, 3.5, 3.7, 3.9, 3.12, 3.14, 3.15, 4.4, 4.5, 7.1, 7.2), ultradeep-code-quality-review-post-remediation-2026-04-13 (CQ-POST-4)
**Estimated effort:** 4-6 hours

---

## Findings addressed

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| 2.3 | Follow camera toggle unclear on desktop | P1 | Controls.tsx |
| 3.2 | Progress bar thumb low contrast in dark mode | P2 | Controls.tsx |
| 3.3 | Read-only bitrate input looks editable | P2 | ExportPanel.tsx |
| 3.4 | Scene range handles below 44px touch target | P2 | SceneEditor.tsx |
| 3.5 | No cancel confirmation in JourneyCreator | P2 | JourneyCreator.tsx |
| 3.7 | Loading spinner low contrast on Positron style | P2 | FileUpload.tsx |
| 3.9 | 10px stat text below readability minimum | P2 | Controls.tsx |
| 3.12 | Theme toggle focus ring low contrast on glass | P2 | ThemeToggle.tsx |
| 3.14 | `isIOS` detection fragile | P2 | FileUpload.tsx |
| 3.15 | Blend slider too thin (h-1 = 4px) | P2 | SceneEditor.tsx |
| 4.4 | i18n — "km"/"mi" not localized, mixed-language labels | P2 | GlobalToolbar.tsx, TrackToolbar.tsx |
| 4.5 | Color contrast gaps — var(--t4) below WCAG AA | P2 | vitro-base.css |
| 7.1 | Marker pulse animation ignores prefers-reduced-motion | P2 | globals.css |
| 7.2 | Landing preview image has no dark-mode variant | P2 | FileUpload.tsx |
| CQ-POST-4 | Scene range editor global pointer listeners per scene | Low | SceneEditor.tsx |

---

## Implementation steps

### 2.3 — Follow camera toggle clarity on desktop

**File:** `src/components/Controls.tsx:123-135`

**Current:** Desktop shows only "Track" text regardless of state.

**Fix:** Show clearer state text on desktop:
- Off: "Follow" (imperative, suggests the action)
- On: "Following" (present continuous, indicates active state)

Or add a small crosshair icon from lucide (`Crosshair` / `Locate`) alongside the text.

---

### 3.2 — Progress bar thumb contrast in dark mode

**File:** `src/components/Controls.tsx:67-71`

**Current:** Track background `rgba(var(--gl),.15)` is nearly invisible in dark mode.

**Fix:** Increase the track fill opacity for the played portion. Use a CSS gradient background to show filled vs unfilled:
```css
background: `linear-gradient(to right, rgb(var(--gl)) ${progress * 100}%, rgba(var(--gl),.15) ${progress * 100}%)`
```
This gives a clear filled portion that contrasts with the unfilled track.

---

### 3.3 — Read-only bitrate styling

**File:** `src/components/ExportPanel.tsx:289`

**Current:** `readOnly` input with same styling as editable inputs.

**Fix options:**
- **Option A:** Replace with a plain `<span>` or `<div>` styled as a value display (no input chrome)
- **Option B:** Add `opacity-60 cursor-not-allowed` classes + a tooltip explaining bitrate is derived from quality
- **Option C:** Make it editable with validation (most work, but most user-friendly)

**Recommendation:** Option B — quickest with good UX. Add a small info tooltip: "Bitrate is calculated from quality setting."

---

### 3.4 — Scene range editor touch targets

**File:** `src/components/SceneEditor.tsx:168`

**Current:** Drag handles are `h-8 w-8` (32×32px) — below 44px touch minimum.

**Fix:** Use transparent padding to extend the touch target while keeping the visible handle small:
```jsx
// Visible handle stays h-8 w-8, but touch target is 44x44
<div className="relative h-8 w-8">
  <div className="absolute -inset-[6px]" /> {/* invisible touch target extender */}
  <div className="actual-handle h-8 w-8" />
</div>
```

---

### 3.5 — JourneyCreator cancel confirmation

**File:** `src/components/JourneyCreator.tsx`

**Current:** Canceling with waypoints silently discards all work.

**Fix:** Add confirmation when waypoints exist (pointCount >= 1):
```ts
const handleCancel = () => {
  if (pointCount >= 1 && !window.confirm(t('journeyCreator.discardConfirm'))) return
  onClose()
}
```
Add the i18n key `journeyCreator.discardConfirm` to all 5 locales.

---

### 3.7 — Loading spinner contrast

**File:** `src/components/FileUpload.tsx:137`

**Current:** Spinner border uses `rgb(var(--gl))` which can be low contrast on Positron style.

**Fix:** Use a fixed high-contrast color for the spinner:
```jsx
style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: 'rgba(var(--gl),.9)' }}
```
The white-ish base ensures the spinner is visible against any glass background, while the accent-colored top provides the brand identity.

---

### 3.9 — Minimum font size for stats

**File:** `src/components/Controls.tsx:142`

**Current:** `text-[10px]` on mobile — below 12px readability minimum.

**Fix:** Change to `text-xs` (12px) as the minimum:
```jsx
className="flex w-full items-center justify-between gap-3 text-xs sm:ml-auto sm:w-auto sm:justify-end sm:text-sm"
```

---

### 3.12 — Theme toggle focus ring contrast

**File:** `src/components/ThemeToggle.tsx:62`

**Current:** Focus ring uses `var(--focus-ring)` which may be low contrast on glass backgrounds.

**Fix:** Ensure the focus ring has a 2px+ offset and sufficient contrast. In `vitro-base.css`, verify `--focus-ring` has adequate contrast in both themes. If not, add an outline-offset and a thicker ring:
```css
--focus-ring: 0 0 0 2px var(--bg), 0 0 0 4px rgb(var(--gl));
```
The double-ring pattern (white gap + accent ring) ensures visibility on any background.

---

### 3.14 — isIOS detection improvement

**File:** `src/components/FileUpload.tsx:29-32`

**Current:** Uses deprecated `navigator.platform` and fragile regex.

**Fix:** Simplify to just show the tip on all mobile/touch devices, or use a feature detection approach:
```ts
const isTouchDevice = useMemo(() => {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}, [])
```
The iOS-specific tip ("tap Browse instead of drag") is actually helpful for all touch-device users encountering file-picker confusion. Rename the tip from iOS-specific to a general touch-device tip.

---

### 3.15 — Blend slider height

**File:** `src/components/SceneEditor.tsx:339`

**Current:** `h-1` (4px) — below standard 8px slider track height.

**Fix:** Change to `h-2` (8px) minimum for the range input track.

---

### 4.4 — Localize unit labels

**Files:** `src/components/GlobalToolbar.tsx:37,44`, `src/components/TrackToolbar.tsx:177,184`

**Current:** "km" and "mi" are hardcoded English strings.

**Fix:** Add i18n keys:
```ts
// in i18n.ts
'units.km': { en: 'km', ko: 'km', ja: 'km', zh: 'km', es: 'km' },
'units.mi': { en: 'mi', ko: '마일', ja: 'マイル', zh: '英里', es: 'mi' },
```
Note: "km" is universal, but "mi" should be localized as it's not universally understood. Replace hardcoded strings with `t('units.km')` and `t('units.mi')`.

Also fix the mixed-language resolution labels in ExportPanel — add locale context to resolution descriptions.

---

### 4.5 — WCAG contrast gaps for var(--t4)

**File:** `src/styles/vitro-base.css`

**Current:**
- Light mode: `--t4: #6E7A96` → ~2.8:1 contrast on glass backgrounds (below AA 4.5:1)
- Dark mode: `--t4: #6E7C9A` → ~3.2:1 on glass backgrounds

**Fix:** Darken the light-mode value and lighten the dark-mode value to meet AA:
- Light mode: change to `#5A6578` or similar (~4.5:1 on glass)
- Dark mode: change to `#8A93AE` or similar (~4.5:1 on glass)

Test with a contrast checker against the effective glass background colors.

---

### 7.1 — Marker pulse prefers-reduced-motion

**File:** `src/app/globals.css:30-37`

**Current:** `.marker-pulse` animation runs continuously. The `vitro-base.css` `prefers-reduced-motion` override sets `animation-duration: 0.01ms` but leaves the pulse div visible at full size.

**Fix:** Add a specific override that hides the pulse div:
```css
@media (prefers-reduced-motion: reduce) {
  .marker-pulse {
    display: none;
  }
}
```

---

### 7.2 — Dark-mode landing preview

**File:** `src/components/FileUpload.tsx:149-153`

**Current:** Same `landing-preview.svg` regardless of theme.

**Fix options:**
- **Option A (recommended):** Create a `landing-preview-dark.svg` and switch based on theme
- **Option B:** Apply a CSS filter in dark mode: `filter: brightness(0.7) saturate(0.8)` — simpler but less polished

Implement Option A by:
1. Creating a dark-themed version of the SVG
2. Using the `mode` prop (already available) to select the variant
3. ```jsx
   src={`${basePath}/${mode === 'dark' ? 'landing-preview-dark' : 'landing-preview'}.svg`}
   ```

---

### CQ-POST-4 — Scene range editor listener cleanup

**File:** `src/components/SceneEditor.tsx`

**Current:** Each rendered scene card installs its own pair of global pointer listeners.

**Fix:** Move drag tracking to a single top-level handler that identifies which scene is being dragged via data attributes, rather than per-scene listeners. Or use the `pointer capture` API (`setPointerCapture`) which automatically routes events to the capturing element without global listeners.

---

## Verification checklist

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm run test:e2e:static:ci`
- [x] Contrast: var(--t4) text meets WCAG AA 4.5:1 in both themes
- [x] Contrast: progress bar fill visible in dark mode
- [x] Contrast: theme toggle focus ring visible on glass
- [x] i18n: "mi" label localized in Korean/Japanese/Chinese
- [x] A11y: prefers-reduced-motion hides marker pulse
- [ ] A11y: min font size 12px for all stat text
- [ ] Touch: scene range handles meet 44px target
- [ ] Touch: blend slider meets 8px height
