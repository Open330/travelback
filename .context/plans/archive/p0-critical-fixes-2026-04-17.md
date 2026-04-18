# P0 Critical Fixes — 2026-04-17

**Priority:** Immediate — fix before next release
**Source:** comprehensive-ui-ux-review-2026-04-17 (findings 1.2, 1.3, 1.5, 1.6)
**Estimated effort:** 2-3 hours

---

## Findings addressed

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| 1.2 | `font-weight: 400` in globals.css overrides vitro-base.css `font-weight: 100` for CJK | P0 | globals.css |
| 1.3 | Track title `hidden xl:block` invisible below 1280px | P0 | TrackWorkspace.tsx |
| 1.5 | Export panel duration not synced with playback controls | P0 | ExportPanel.tsx, page.tsx |
| 1.6 | "?" hotkey fires in text inputs | P0 | usePlaybackController.ts |

---

## Implementation steps

### 1.2 — Fix CJK font-weight cascade

**File:** `src/app/globals.css:21-24`

**Current:**
```css
body, [lang] {
  font-family: 'Pretendard Variable', ...;
  font-weight: 400;
}
```

**Problem:** Unlayered `font-weight: 400` wins over layered `vitro-base.css` `font-weight: 100` for `[lang="ko"]`, `[lang="ja"]`, `[lang="en"]`. All CJK text renders heavier than the design system intends, with line-height values calibrated for weight-100 producing loose vertical rhythm.

**Fix:** Remove the `font-weight: 400` declaration from `globals.css`. The vitro-base.css already sets appropriate font-weight per language. If readability at weight 100 is a concern, adjust the design system variables rather than overriding per-lang.

**Verification:** Visually compare Korean/Japanese text before and after. Confirm line-height rhythm is tighter. Run `npm run build` and check in browser.

---

### 1.3 — Show track name below xl breakpoint

**File:** `src/components/TrackWorkspace.tsx:117-121`

**Current:** Track name + point count is `hidden ... xl:block` — invisible below 1280px.

**Fix:** Show a condensed version (track name only, no counts) at the `lg` breakpoint. Two approaches:

**Option A — Extend visibility down to lg:**
```jsx
className="... hidden lg:block xl:block ..."
```
Show name only at lg, name + stats at xl.

**Option B — Add track name inside Controls card:**
Add a small subtitle inside the Controls `gc` card showing just the track name. This keeps the info visible on all viewports without needing the top bar.

**Recommendation:** Option A is simpler and sufficient for most laptops (1366px viewport is > lg:1024px).

**Verification:** Load a track on a 1366px viewport. Confirm track name is visible.

---

### 1.5 — Sync export duration with playback

**Files:** `src/components/ExportPanel.tsx`, `src/app/page.tsx`

**Current:** `ExportPanel` maintains its own `duration` state initialized to `30`, independent of playback duration in `Controls.tsx`.

**Fix:** Pass the current playback `duration` as a prop or initial value to the export panel. When the user opens export, the duration field should pre-fill with the current playback duration.

**Implementation:**
1. In `page.tsx`, pass `playbackDuration` (the duration from playback controls state) to `ExportPanel`
2. In `ExportPanel`, use `playbackDuration` as the initial value for the local duration state
3. If the user changes the playback duration while the export panel is open, consider either:
   - Updating the export duration to match (simpler, "what you see is what you export")
   - Showing a warning badge that they differ (more flexible)
4. Start with the simpler approach: export duration initializes from playback, and subsequent playback changes don't override user's explicit export setting

**Verification:** Set playback to 60s, open export, confirm duration shows 60. Change to 30s, close and reopen export, confirm 30.

---

### 1.6 — Guard hotkeys against text input focus

**File:** `src/lib/usePlaybackController.ts`

**Current:** Global keyboard handlers (including "?" for help) fire regardless of whether the user is typing in an input field.

**Fix:** At the top of the hotkey handler, check if `document.activeElement` is an editable element:

```ts
const active = document.activeElement
if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement) {
  return
}
```

Place this guard before the hotkey switch/matching logic.

**Verification:** Focus the Journey Creator search input, type "?" — confirm help modal does NOT open. Press "?" while no input is focused — confirm help DOES open. Test same for Space (play/pause) and other hotkeys.

---

## Verification checklist

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm run test:e2e:static:ci`
- [x] Visual: Korean/Japanese text at weight 100 looks correct
- [x] Visual: Track name visible on 1366px viewport
- [x] Functional: Export duration matches playback on open
- [x] Functional: "?" does not fire in text inputs
