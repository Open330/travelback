# Implementation Plan: Address Remaining Issues from Mina Review

**Source:** `.context/reviews/mina-review-2026-02-22.md`
**Cross-reference:** `.context/plans/address-ux-review-non-technical-traveler.md` (first review plan)
**Goal:** Address the 12 issues and 5 priority recommendations from Mina's review that are NOT already covered by the first plan.

---

## Triage: Overlap with First Review Plan

Many of Mina's issues overlap with the first review's remaining tasks. Here's the mapping:

| Mina # | Mina Issue | First Plan Coverage | Action |
|--------|-----------|-------------------|--------|
| 1 | Format line jargon ("GPX, KML...") | ❌ Not covered — first review's rec #1 was already fixed, but Mina says the `formatHint` line below the main text is still technical | **New task** — rewrite `fileUpload.formatHint` |
| 2 | Scene parameters have no visual preview | ❌ Not covered | **New task** |
| 3 | Route Start/End percentages are abstract | ❌ Not covered | **New task** |
| 4 | Camera mode names ("Ground Follow", "Orbit") | ❌ Not covered | **New task** |
| 5 | Import guide has no screenshots | ✅ Covered by first plan A.2 | **Skip** — defer to first plan |
| 6 | "points" → "locations" terminology | ❌ Not covered | **New task** |
| 7 | Redundant guide buttons on landing page | ❌ Not covered | **New task** |
| 8 | Technical output summary | ✅ Covered by first plan C.1 | **Skip** — defer to first plan |
| 9 | No export time estimate | ✅ Covered by first plan C.3 | **Skip** — defer to first plan |
| 10 | Mobile control bar dense | ❌ Not fully covered (first plan B.2 only fixes time stats) | **New task** |
| 11 | Map attribution clutter | ⚠️ Skip — attribution is legally required | **Won't fix** |
| 12 | Theme toggle could have label | ❌ Not covered | **New task** |

**Result:** 7 new tasks unique to the Mina review, plus 1 partial overlap (mobile density).

---

## Remaining Tasks (7 items, 3 phases)

### Phase A — Terminology & Copy Fixes (3 tasks)

#### A.1 Rewrite format hint line

**Files:** `src/lib/i18n.ts`

Mina Issue #1: The secondary line below the drop hint still reads "Supports GPX, KML, and Google Location History JSON" — pure jargon.

**Current i18n key:** `fileUpload.formatHint`
- EN: `"Supports GPX, KML, and Google Location History JSON"`
- KO: `"GPX, KML, Google 위치 기록 JSON을 지원합니다"`

**Proposed:**
- EN: `"Works with files from Google Maps, Strava, Garmin, and most GPS apps"`
- KO: `"Google Maps, Strava, Garmin 등 대부분의 GPS 앱 파일을 지원합니다"`

This is a one-line string change, no component modifications needed.

**Optional enhancement:** Add a tooltip or expandable `(?)` icon next to the line that reveals the actual format names for power users: "Accepted formats: GPX, KML, Google Location History JSON".

#### A.2 Rename "points" to "locations"

**Files:** `src/lib/i18n.ts`, `src/components/TimelineSelector.tsx` (if it renders the count)

Mina Issue #6: "56 / 56 points" uses technical GPS language. Non-technical users don't think in "points."

**Changes:**
- `timeline.points`: EN `"points"` → `"locations"`, KO `"포인트"` → `"위치"`
- `journey.noPoints`: EN `"No points yet"` → `"No locations yet"`, KO `"포인트 없음"` → `"위치 없음"`
- `journey.onePoint`: EN `"1 point"` → `"1 location"`, KO `"1개 포인트"` → `"1개 위치"`
- `journey.hint`: Update "points" → "locations" in both EN and KO

**Search across codebase** for any other instances of "point" referring to GPS data points and update consistently.

#### A.3 Rename camera modes to friendlier names

**Files:** `src/lib/i18n.ts`

Mina Issue #4: Camera mode names use film industry terms. Rename the most confusing ones.

**Proposed changes (i18n labels only — internal enum values stay the same):**

| Internal Mode | Current EN Label | Proposed EN Label | Current KO | Proposed KO |
|--------------|-----------------|-------------------|-----------|------------|
| `overview` | Overview | Overview | 전체 보기 | 전체 보기 |
| `flyover` | Flyover | Flyover | 플라이오버 | 하늘에서 따라가기 |
| `orbit` | Orbit | Spin Around | 궤도 | 주위 회전 |
| `ground` | Ground Follow | Street View | 지면 추적 | 거리 시점 |
| `closeup` | Closeup | Closeup | 클로즈업 | 클로즈업 |
| `birdeye` | Bird's Eye | Bird's Eye | 조감도 | 조감도 |

Only `orbit` and `ground` need renaming. The descriptions (e.g., "Circle around a point", "Street-level chase view") should also be updated to match:
- `camera.orbitDesc`: EN `"Circle around a point"` → `"Spin around a spot on the route"`
- `camera.groundDesc`: EN `"Street-level chase view"` → `"Follow from street level"`
- KO equivalents updated similarly

**Note:** "Flyover" is borderline — it's a real English word most people understand. Keep it. The KO label for flyover could be improved from the English loanword "플라이오버" to something native.

---

### Phase B — Camera Panel UX (2 tasks)

#### B.1 Add scene parameter hints/descriptions

**Files:** `src/components/SceneEditor.tsx`, `src/lib/i18n.ts`

Mina Issue #2 / Priority Recommendation #3: Scene parameters (Zoom 13, Tilt 55°, Direction 0°, Orbit Speed 0°/s) are meaningless numbers to non-technical users. Adjusting them is blind experimentation.

**Approach — Option A (Minimal, recommended):**
Add a one-line hint below each slider explaining the effect in plain language:

| Parameter | Current Label | Hint Text (EN) | Hint Text (KO) |
|-----------|-------------|----------------|----------------|
| Zoom | Zoom | "farther ← → closer" | "멀리 ← → 가까이" |
| Tilt | Tilt | "flat ← → angled" | "평면 ← → 기울기" |
| Direction | Direction | "camera faces this compass direction" | "카메라가 바라보는 방향" |
| Orbit Speed | Orbit Speed | "slower ← → faster spin" | "느린 ← → 빠른 회전" |

**Implementation:**
- Add small `<span>` elements below each `<input type="range">` in the Customize section
- Style: `text-[9px]`, `color: var(--t4)`, `opacity: 0.6`, flexbox with `justify-between` for the "←→" labels at slider ends
- New i18n keys: `scenes.zoomHint`, `scenes.pitchHint`, `scenes.bearingHint`, `scenes.rotationHint`

**Approach — Option B (Richer, future consideration):**
Add a live mini-preview thumbnail that updates as sliders change. This would require rendering a small MapLibre viewport alongside the sliders — significantly more work (estimated 4-8 hours). Defer to a future iteration.

#### B.2 Improve Route Start/End segment definition

**Files:** `src/components/SceneEditor.tsx`, `src/lib/i18n.ts`

Mina Issue #3: Route Start/End as percentages (0%–15%) requires thinking about the trip in abstract progress terms.

**Approach — Option A (Minimal, recommended):**
Keep the percentage inputs but add contextual labels:
- Show the actual timestamp or distance at each percentage: e.g., "0% (Start — 7:00 PM)" and "15% (7:12 PM, ~0.6 km)"
- This requires passing the track data into SceneEditor (which already receives `scenes` and track duration)
- Add a visual indicator: color the scene's segment on the elevation profile or timeline bar

**Implementation:**
- SceneEditor already has a colored bar showing scene segments (line 155-167). Enhance this bar:
  - Make segments draggable (drag the left/right edge to resize)
  - Show a tooltip with timestamp on hover/drag
- Rename the labels: `scenes.startPct` → "From" / "시작", `scenes.endPct` → "To" / "끝"
  - Keep the percentage number but drop the "%" suffix from the label itself since the value already shows it

**Approach — Option B (Richer, future consideration):**
Replace percentage inputs entirely with a visual mini-map showing the segment highlighted on the route. Tapping the mini-map sets start/end. This is a significant UX redesign — defer to a future iteration.

---

### Phase C — Landing Page & Mobile Polish (2 tasks)

#### C.1 Merge redundant guide buttons

**Files:** `src/components/FileUpload.tsx`, `src/lib/i18n.ts`

Mina Issue #7: Two separate buttons — "How to get your travel data" (opens the 7-tab guide dialog) and "Where do I find my travel file?" (expands an inline hint) — serve overlapping purposes and confuse users about which to click.

**Current behavior:**
- "How to get your travel data" (line 164-169) → opens `GoogleGuide` dialog via `onShowGoogleGuide`
- "Where do I find my travel file?" (line 171-178) → toggles inline `showWhereToFind` state showing bullet points

**Proposed:**
- Remove the "Where do I find my travel file?" collapsible entirely
- Keep only "How to get your travel data" as the primary guide link
- Rename it to something friendlier: "Need help finding your file?" / "파일을 찾는 데 도움이 필요하세요?"
- Update i18n key: `fileUpload.importGuideLink` → "Need help finding your file?" / "파일을 찾는 데 도움이 필요하세요?"

**Cleanup:**
- Remove the `showWhereToFind` state and its toggle button from FileUpload.tsx
- Remove i18n keys: `fileUpload.whereToFind`, `fileUpload.fromGoogle`, `fileUpload.fromOtherApps`
- The guide dialog already covers all the information that the inline hint provided

#### C.2 Improve mobile control bar density

**Files:** `src/components/Controls.tsx`, `src/lib/i18n.ts`

Mina Issue #10 / Priority Recommendation #5: On 375px width, play button + speed selector + duration selector + Track toggle + distance/time stats are all crammed into a single bar.

**Approach:**
- Split the controls into two rows on mobile (below `sm:` breakpoint):
  - **Row 1:** Play/Pause + progress slider + current time
  - **Row 2:** Speed + Duration + Track + Distance stats
- Use `flex-wrap` or explicit `sm:flex-row` / `flex-col` layout switching
- The progress slider should span full width on mobile (currently it's in a row with other controls)

**Alternative (simpler):**
- Keep single row but move stats behind a tap:
  - Replace the always-visible stats with a small `ⓘ` icon that shows stats on tap
  - Or show only distance on mobile, hide everything else
- Add `gap-1` instead of `gap-2` on mobile for tighter spacing

**Recommendation:** Start with the simpler approach (hide time stats, tighten spacing) since first plan B.2 already proposes showing time on mobile. If B.2 is implemented first and the bar is still too dense, then do the two-row layout.

---

## Additional: Theme Toggle Label (Mina Issue #12)

This is low-priority and may not warrant its own task. If implemented:

**Files:** `src/components/ThemeToggle.tsx`, `src/lib/i18n.ts`

- Add a visible label next to the sun/moon icon: "Theme" / "테마" or "Light" / "Dark" / "밝게" / "어둡게"
- Or add `aria-label` (already exists) and rely on the icon being discoverable
- **Recommendation:** Skip for now. The toggle works, is in a conventional location (top-right), and adding a label may clutter the minimal toolbar.

---

## Implementation Order & Effort Estimates

| Phase | Task | Effort | Priority | Files Modified |
|-------|------|--------|----------|----------------|
| A | A.1 Rewrite format hint | XS (10 min) | High | i18n.ts |
| A | A.2 "points" → "locations" | XS (15 min) | Medium | i18n.ts |
| A | A.3 Camera mode renames | S (20 min) | Low | i18n.ts |
| C | C.1 Merge guide buttons | S (30 min) | Medium | FileUpload.tsx, i18n.ts |
| B | B.1 Parameter slider hints | S (45 min) | Medium | SceneEditor.tsx, i18n.ts |
| B | B.2 Route segment labels | M (1-2 hr) | Medium | SceneEditor.tsx, i18n.ts |
| C | C.2 Mobile control density | M (1-2 hr) | Low-Medium | Controls.tsx |

**Total estimated effort:** ~4-6 hours (for the 7 unique tasks)

**Combined with first plan:** ~16-24 hours total for both reviews

**Recommended order:** A.1 → A.2 → C.1 → A.3 → B.1 → B.2 → C.2

Quick string changes first (A.1, A.2), then the component simplification (C.1), then UI enhancements (A.3, B.1, B.2), then the mobile layout work (C.2) last since it benefits from seeing the other changes first.

---

## Cross-Reference: Tasks Deferred to First Review Plan

These Mina issues are fully addressed by tasks in `.context/plans/address-ux-review-non-technical-traveler.md`:

| Mina # | Issue | First Plan Task |
|--------|-------|----------------|
| 5 | Screenshots in import guide | A.2 |
| 8 | Technical output summary | C.1 |
| 9 | No export time estimate | C.3 |

Implementing both plans together would address all 12 Mina issues (except #11 which is a won't-fix).

