# Implementation Plan: Review Gaps — Items Missing from Both Existing Plans

**Sources:** `.context/reviews/ux-review-non-technical-traveler.md`, `.context/reviews/mina-review-2026-02-22.md`
**Cross-referenced:** `.context/plans/address-ux-review-non-technical-traveler.md`, `.context/plans/address-mina-review-2026-02-22.md`
**Goal:** Capture all review critiques that slipped through the cracks — either listed in the triage tables as "Remains" with no corresponding task, or mentioned only in the review body text without appearing in either plan.

---

## Corrections: Tasks Already Done

Two tasks in the first review plan are listed as "❌ Remains" but are actually **already implemented**:

| First Plan Task | Status | Evidence |
|----------------|--------|----------|
| C.2 Friendly filename | ✅ Already done | `videoEncoder.ts` line 125-128: `"Travelback - ${sanitizedName}.mp4"` |
| B.3 Timeline handles | ✅ Already done | `TimelineSelector.tsx` lines 223-279: `HANDLE_RADIUS = 14`, `Math.max(HANDLE_RADIUS * 2, 44)` = 44px min, `touch-action: none`, grip indicators |

These were completed during the UX overhaul (`9019e14`) but the plan was written afterwards without checking.

---

## Gap Items (13 tasks, 4 phases)

### Phase A — Localization Gaps (3 tasks)

#### A.1 Localize hardcoded English strings in `src/types.ts`

**Review source:** First review §9, lines 399-407
**Why missing:** Both plans address i18n label changes via `src/lib/i18n.ts` keys, but neither addresses the constants defined directly in `src/types.ts` that bypass the i18n system entirely.

**Current state (verified):**
- `CODEC_LABELS` (lines 70-74): `'H.264 (MP4)'`, `'H.265/HEVC (MP4)'`, `'AV1 (MP4)'` — plain English
- `RESOLUTION_PRESETS[].label` (lines 83-91): `'YouTube / Landscape (1920×1080)'` etc. — English platform names + dimensions
- `MAP_STYLES[].label` (lines 15-36): `'Voyager'`, `'Light'`, `'Dark'`, `'Liberty'`, `'Bright'` — English

**Approach:**
- Replace string labels in types.ts with i18n keys, or make components look up labels via `t()` instead of reading `.label` directly
- For CODEC_LABELS: codec names are arguably universal technical names — localize the wrapper text but keep codec identifiers: `'H.264 (MP4)'` stays as-is in both locales (the review acknowledges this)
- For RESOLUTION_PRESETS: Localize the descriptive part. EN: `'YouTube / Landscape (1920×1080)'`, KO: `'YouTube / 가로 (1920×1080)'`
- For MAP_STYLES: `'Light'` → `'밝은'`, `'Dark'` → `'어두운'`. Proper names (Voyager, Liberty, Bright) can stay
- **Files:** `src/types.ts`, `src/lib/i18n.ts`, `src/components/ExportPanel.tsx`, `src/app/page.tsx`
- **Effort:** S (30-45 min)

#### A.2 Add more language locales (Japanese, Chinese, Spanish)

**Review source:** First review §9, lines 389-392
**Why missing:** First plan D.1 covers a language picker UI but not adding new locales.

**Approach:**
- Add `ja`, `zh`, `es` locale objects to `src/lib/i18n.ts`
- ~120 keys per locale — significant translation effort
- Consider using a community translation workflow or AI-assisted initial draft + native review
- Update `Locale` type and `detectLocale()` function to recognize `ja`, `zh*`, `es*` prefixes
- Update language picker (first plan D.1) to include the new locales
- **Files:** `src/lib/i18n.ts`
- **Effort:** L (4-8 hr per locale for quality translations)
- **Priority:** Low — high effort, deferred until core UX is polished

#### A.3 Metric/imperial unit toggle

**Review source:** Mina review §2.3, line 69
**Why missing:** Not mentioned in either plan. Distance is always metric.

**Approach:**
- Add a unit preference to localStorage: `travelback-units` = `'metric' | 'imperial'`
- Default based on locale: `en-US` → imperial, everything else → metric
- Update `formatDistance()` in `src/lib/interpolate.ts` to accept/check the unit preference
- Conversions: km → mi (÷1.609), m → ft (×3.281)
- Add i18n keys for unit labels
- **Files:** `src/lib/interpolate.ts`, `src/lib/i18n.ts`, `src/components/Controls.tsx`, `src/components/ElevationProfile.tsx`
- **Effort:** S (30-45 min)
- **Priority:** Medium

---

### Phase B — Discoverability & Explanation (4 tasks)

#### B.1 Timeline histogram legend/explanation

**Review source:** First review §4, lines 184-188
**Why missing:** Listed in the first plan's triage table (line 43) as "❌ Remains" but no task was created.

**Current state:** The histogram bars in TimelineSelector have no legend or tooltip. Users wonder "why are some tall and some short?"

**Approach:**
- Add a one-line explanation below or above the histogram: "Bar height = recording density (taller = more GPS points recorded)"
- Alternatively, show a small `ⓘ` icon that reveals a tooltip on tap/hover
- Keep it minimal — one sentence, `text-[9px]`, `color: var(--t4)`
- New i18n keys: `timeline.histogramHint` → EN: `"Bar height shows recording density"` / KO: `"막대 높이는 기록 밀도를 나타냅니다"`
- **Files:** `src/components/TimelineSelector.tsx`, `src/lib/i18n.ts`
- **Effort:** XS (15 min)

#### B.2 Timeline selector discoverability

**Review source:** Mina review §2.3, line 68
**Why missing:** Not in either plan. The timeline selector's purpose isn't immediately obvious.

**Approach:**
- Add a brief instructional hint on first appearance: "Drag the handles to select a portion of your trip"
- Show only once (persist via localStorage `travelback-timeline-hint-dismissed`)
- Small text above the timeline, dismissible with ×
- New i18n keys: `timeline.dragHint`
- **Files:** `src/components/TimelineSelector.tsx`, `src/lib/i18n.ts`
- **Effort:** XS (15 min)

#### B.3 Journey Creator expectation copy

**Review source:** First review §3, lines 133-136
**Why missing:** Both plans cover geocoding search and Done confirmation, but not the conceptual mismatch.

The review says: "This feature is more useful for 'I want to plan a future route' than 'I want to relive my past trip' — but that disconnect isn't communicated."

**Approach:**
- Add a subtitle to the Journey Creator mode: "Plan a new route or recreate one from memory"
- Update the instruction text to set expectations: "Click on the map to trace your route. Best for planning new trips — to relive a past trip, upload your GPS file instead."
- New i18n keys: `journey.subtitle`, update `journey.hint`
- **Files:** `src/lib/i18n.ts`
- **Effort:** XS (10 min)

#### B.4 Touch-friendly alternative to tooltip-only info

**Review source:** First review §4, lines 180-182
**Why missing:** Plans renamed "Follow" to "Track" and added tooltip text, but the review's concern that "tooltips require hovering and won't appear on touch devices" is unaddressed.

**Approach:**
- On touch devices (detected via `'ontouchstart' in window` or `pointer: coarse` media query), show the Track button's state as visible text rather than relying on tooltip
- Option A: Always show a small label next to the icon: "Track: ON" / "Track: OFF"
- Option B: Show a brief toast when toggled on touch: "Camera tracking enabled"
- **Files:** `src/components/Controls.tsx`, `src/lib/i18n.ts`
- **Effort:** XS (15 min)
- **Priority:** Low-Medium


---

### Phase C — Visual & Interactive Enhancements (3 tasks)

#### C.1 Camera mode visual preview icons/animations

**Review source:** First review §5, lines 238-239
**Why missing:** Mina plan B.1 covers slider hints but not visual previews for camera modes themselves.

"When hovering or selecting a camera mode, show a small animation or icon demonstrating what 'Orbit' vs 'Flyover' vs 'Ground Follow' looks like."

**Approach:**
- Create simple SVG icons (or small CSS animations) for each camera mode:
  - Overview: wide eye/globe icon
  - Flyover: bird flying forward
  - Orbit: circular arrow around a pin
  - Ground: street-level perspective lines
  - Closeup: magnifying glass on pin
  - Bird's Eye: tilted aerial view
- Show the icon next to the camera mode name in the dropdown
- The one-line descriptions (already added via i18n) serve as text explanation; icons add visual clarity
- **Files:** `src/components/SceneEditor.tsx`, possibly new SVG assets
- **Effort:** M (1-2 hr for 6 icons)
- **Priority:** Low — nice-to-have, the text descriptions already help

#### C.2 Live preview when adjusting scene parameter sliders

**Review source:** First review §5, lines 240-241
**Why missing:** Mina plan B.1 Option B mentions this but explicitly defers it.

"When adjusting a slider, the map should update in real-time to show the effect. Currently users must play the animation to see what changed."

**Approach:**
- When a user drags a scene parameter slider (zoom, tilt, direction, orbit speed), immediately update the map camera to show the effect at that scene's midpoint
- Requires passing a "preview mode" callback from page.tsx to SceneEditor that temporarily sets the map camera without starting animation
- On slider release (or after a debounce), revert to the current playback position
- Technical risk: rapid camera updates during slider drag may cause jank on slower devices
- **Files:** `src/components/SceneEditor.tsx`, `src/app/page.tsx`, `src/components/MapView.tsx`
- **Effort:** L (3-5 hr) — significant plumbing between SceneEditor ↔ Map
- **Priority:** Low — high effort for moderate UX gain; the Mina plan's slider hints (B.1) are a better first step

#### C.3 Google Guide tab layout on desktop

**Review source:** Mina review §2.2, line 49
**Why missing:** Not in either plan. Only layout issues for mobile were considered.

"The tab row wraps on narrow viewports which is fine, but on desktop it's a long horizontal row of 7 buttons."

**Approach:**
- On desktop (≥768px), switch from a single horizontal row of 7 tabs to a 2-row grid (4+3) or a vertical sidebar layout
- Option A: `grid grid-cols-4 sm:grid-cols-7` → becomes `grid-cols-4` on tablet/desktop with wrapping
- Option B: On wide viewports, use a vertical tab list on the left with content on the right (sidebar pattern)
- Option A is simpler and consistent with the mobile wrap behavior
- **Files:** `src/components/GoogleGuide.tsx`
- **Effort:** XS (15 min)
- **Priority:** Low

---

### Phase D — Mobile Polish (3 tasks)

#### D.1 Swipe gestures on mobile

**Review source:** First review §7, lines 333-336
**Why missing:** Listed in first plan triage (line 50) as "❌ Remains (low priority)" but no task was created.

"There are no swipe gestures for navigating between scenes, scrubbing the timeline, or switching panels."

**Approach:**
- Add horizontal swipe on the playback progress area to scrub forward/backward
- Add swipe-to-dismiss on side panels (Export, Camera/Scene editor)
- Use pointer events with touch gesture detection (no external library needed)
- Be careful not to conflict with map pan gestures — only enable swipe on specific UI elements
- **Files:** `src/components/Controls.tsx`, `src/components/ExportPanel.tsx`, `src/components/SceneEditor.tsx`
- **Effort:** M (1-2 hr)
- **Priority:** Low

#### D.2 iOS file picker help tip

**Review source:** First review §7, lines 344-348
**Why missing:** Not in either plan.

**Approach:**
- Detect iOS via user agent and show a small hint below "Browse Files": "On iPhone, your downloaded files are in the Files app → Browse → Downloads"
- Show only on iOS
- New i18n key: `fileUpload.iosTip`
- **Files:** `src/components/FileUpload.tsx`, `src/lib/i18n.ts`
- **Effort:** XS (10 min)
- **Priority:** Low-Medium

#### D.3 Map zoom control overlap on mobile

**Review source:** Mina review §2.1, line 38
**Why missing:** Not in either plan. Minor cosmetic.

"The map zoom controls overlap with the upload card slightly but it's not blocking anything."

**Approach:**
- Adjust MapLibre's zoom control position when upload card is visible, or hide controls on landing
- **Files:** `src/components/MapView.tsx` or `src/styles/globals.css`
- **Effort:** XS (10 min)
- **Priority:** Low

---

## Implementation Order & Effort Estimates

| Phase | Task | Effort | Priority | Source |
|-------|------|--------|----------|--------|
| B | B.1 Histogram legend | XS (15 min) | Medium | First review §4 |
| B | B.2 Timeline hint | XS (15 min) | Medium | Mina §2.3 |
| B | B.3 Journey Creator copy | XS (10 min) | Medium | First review §3 |
| B | B.4 Touch tooltip alternative | XS (15 min) | Low-Medium | First review §4 |
| A | A.1 Localize types.ts strings | S (30-45 min) | Medium | First review §9 |
| A | A.3 Metric/imperial toggle | S (30-45 min) | Medium | Mina §2.3 |
| C | C.3 Guide tab layout | XS (15 min) | Low | Mina §2.2 |
| D | D.2 iOS file picker tip | XS (10 min) | Low-Medium | First review §7 |
| D | D.3 Zoom control overlap | XS (10 min) | Low | Mina §2.1 |
| C | C.1 Camera mode icons | M (1-2 hr) | Low | First review §5 |
| D | D.1 Swipe gestures | M (1-2 hr) | Low | First review §7 |
| C | C.2 Live slider preview | L (3-5 hr) | Low | First review §5 |
| A | A.2 Add more locales | L (4-8 hr/locale) | Low | First review §9 |

**Total estimated effort:** ~10-16 hours (excluding A.2 locale translations)

**Recommended order:** Quick text/config wins first (B.1–B.4, A.1, D.2, D.3, C.3), then medium features (A.3, C.1, D.1), then the two large items (C.2, A.2) last.

---

## Combined Overview: All Three Plans

| Plan | File | Tasks | Effort | Focus |
|------|------|-------|--------|-------|
| First review | `address-ux-review-non-technical-traveler.md` | 13 (11 remaining*) | ~10-16 hr | Landing, controls, export, advanced features |
| Mina review | `address-mina-review-2026-02-22.md` | 7 | ~4-6 hr | Terminology, camera panel, mobile density |
| This plan (gaps) | `address-review-gaps.md` | 13 | ~10-16 hr | Localization, discoverability, visual polish, mobile |

*First plan C.2 and B.3 are already done — 11 tasks remain.

**Grand total:** ~31 remaining tasks, ~24-38 hours estimated effort.