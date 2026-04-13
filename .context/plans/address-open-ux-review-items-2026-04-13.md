# Implementation Plan: Address Remaining Open UX Review Items (2026-04-13)

**Source reviews:**
- `.context/reviews/ux-review-non-technical-traveler.md`
- `.context/reviews/mina-review-2026-02-22.md`

**Historical planning references:**
- `.context/plans/address-ux-review-non-technical-traveler.md`
- `.context/plans/address-mina-review-2026-02-22.md`
- `.context/plans/address-review-gaps.md`
- `.context/plans/archive/ux-overhaul-non-technical-traveler.md`

**Goal:** re-triage the older UX review family against the **current** codebase and isolate the UX tasks that still appear genuinely open after the implemented overhaul and later follow-up work.

---

## Re-triage summary

A large share of the old UX-review criticisms are already implemented in the current app, including:
- sample-trip CTA
- language picker
- speed label
- histogram hint + drag hint
- keyboard help overlay
- geocoding search in JourneyCreator
- confirmation step before creating a manual route
- friendlier export filename
- export time estimate
- travel-icon selection
- touch-friendly timeline handles
- camera parameter hint labels / live preview behavior

The remaining open work is therefore narrower than the older follow-up plans suggest.

---

## Still-open UX tasks worth planning

### Phase A — Stronger onboarding and demonstration

#### A.1 Replace the abstract route-animation card with a true product-output preview
**Files:**
- `src/components/FileUpload.tsx`
- `public/` (new preview asset) if using a real clip
- `src/lib/i18n.ts` if copy/alt text changes are needed

**Why it still seems open:**
- The landing page now has an animated SVG route illustration, but it still does **not** show what Travelback’s actual exported output looks like.
- Both UX reviews explicitly asked for a preview that reduces uncertainty before file hunting/export work.

**Work:**
- Choose one of these approaches:
  1. short looping product-output video/GIF using the sample trip and cinematic preset,
  2. a side-by-side before/after card (“raw route” → “Travelback video”),
  3. a richer clickable preview that loads the sample trip into the app.
- Keep bundle/asset weight bounded.

**Acceptance criteria:**
- A first-time user can understand the eventual output **before** uploading anything.
- The landing card shows an example of the actual visual style, not just an abstract route trace.

#### A.2 Upgrade the import guide from schematic illustrations to richer visual guidance
**Files:**
- `src/components/GoogleGuide.tsx`
- `public/guide/` if image assets are added
- `src/lib/i18n.ts`

**Why it still seems open:**
- The current guide includes compact SVG illustrations, which is an improvement, but the older reviews specifically criticized the lack of screenshot-like visual guidance for non-technical users.

**Work:**
- Decide whether to add:
  - annotated screenshots,
  - larger mock UI cards that more closely resemble the real Google/Strava/Garmin flows,
  - or step thumbnails paired with each action block.
- Prioritize Google Maps phone/computer flows first.

**Acceptance criteria:**
- The guide provides at least one strong visual aid for the most important import paths.
- The visual aid sits next to the exact step sequence it explains.

### Phase B — Make scene segmentation less abstract

#### B.1 Replace raw start/end percentages with a more tangible segment editor
**Files:**
- `src/components/SceneEditor.tsx`
- `src/lib/i18n.ts`
- optionally `src/components/TimelineSelector.tsx` patterns as inspiration

**Why it still seems open:**
- The UI still asks users to think in route percentages (`From %`, `To %`), which both UX reviews identified as unnatural for travelers.

**Work:**
- Design a more intuitive segment-selection control, for example:
  - draggable scene handles on a mini route-progress bar,
  - a visual coverage timeline where each scene can be resized directly,
  - labels that emphasize beginning/middle/end segments rather than numeric percentages alone.
- Preserve precision for advanced users, but make the default interaction visual-first.

**Acceptance criteria:**
- A user can define or adjust a scene segment without reasoning primarily in percentages.
- Numeric percentage input, if retained, becomes a secondary/advanced affordance.

### Phase C — User-facing control clarity

#### C.1 Add an explicit unit-system control instead of locale-only auto-defaulting
**Files:**
- `src/lib/interpolate.ts`
- `src/components/Controls.tsx`
- `src/components/ElevationProfile.tsx`
- `src/lib/i18n.ts`
- optionally a small settings/menu component if needed

**Why it still seems open:**
- The code now auto-selects metric vs imperial from locale and stores a preference, but there is still no user-visible toggle to override it.
- This leaves the older “American user confusion” issue only partially addressed.

**Work:**
- Add a lightweight UI affordance for Metric / Imperial.
- Keep it subtle: toolbar chip, settings popover, or export/settings-adjacent toggle.

**Acceptance criteria:**
- Users can explicitly switch between metric and imperial without changing browser locale.
- Distance and elevation displays update consistently across controls/profile/editor surfaces.

#### C.2 Decide whether theme/app-appearance controls need clearer discoverability
**Files:**
- `src/components/ThemeToggle.tsx`
- `src/app/page.tsx`
- `src/lib/i18n.ts`

**Why it still seems open:**
- The reviews flagged that the theme toggle may be easy to miss.
- Current state: icon-only control with good aria/title text, but no visible label.

**Work:**
- Decide whether to:
  - keep icon-only (explicitly accept current behavior), or
  - add a tiny visible appearance label or settings grouping.
- This is a low-priority polish decision, but it should be resolved deliberately.

**Acceptance criteria:**
- The team has an explicit decision on whether icon-only discoverability is acceptable.
- If not acceptable, a visible label/grouping is added in a way that does not clutter the toolbar.

### Phase D — Optional richer visual polish (defer unless capacity remains)

#### D.1 Evaluate whether the remaining guide/preview tasks should be solved with assets or generated visuals
**Files:**
- planning/design decision only at first; implementation may touch `public/`, `src/components/FileUpload.tsx`, `src/components/GoogleGuide.tsx`

**Why this task exists:**
- The main open UX items are now mostly visual communication problems, not raw feature gaps.
- Those can be solved multiple ways: screenshots, mockups, short captured clips, or richer in-app sample flows.

**Work:**
- Decide the lowest-maintenance path that still satisfies the old UX critique.
- Prefer reusable static/vector assets over heavy media unless the output preview truly benefits from motion.

**Acceptance criteria:**
- The visual-asset strategy for the remaining UX work is chosen before implementation starts.

---

## Out of scope for this plan

These are now covered elsewhere and should not be re-opened here unless regressions are found:
- security/privacy hardening work → `.context/plans/address-ultradeep-security-review-2026-04-13.md`
- session-state / parser / scene runtime correctness → `.context/plans/address-ultradeep-code-quality-review-2026-04-13.md`
- first-load theme correctness / export idle timeout / same-file upload / static cache policy → `.context/plans/address-comprehensive-code-review-2026-04-13.md`

---

## Verification plan

- targeted manual UX walkthrough on desktop + mobile
- screenshot comparison of onboarding/import-guide changes
- regression check for metric/imperial toggle consistency if added
- keep existing lint/typecheck/smoke checks green for any implementation changes

---

## Recommended execution order

1. A.1 real output preview
2. A.2 richer import-guide visuals
3. B.1 visual scene segment editor
4. C.1 explicit unit toggle
5. C.2 appearance-control discoverability decision
6. D.1 only if needed to resolve remaining visual-strategy ambiguity
