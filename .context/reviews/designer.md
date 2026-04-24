# Designer/UI-UX Review — Prompt 1, Cycle 1/100

## Summary
I reviewed the app shell, landing/upload flow, playback workspace, export modal, i18n strings, and the responsive mobile behavior in the live app.

Overall, the UI is strong: the glass treatment is consistent, the dialogs are well-factored, and the app is generally accessible. I found three UX/a11y issues worth fixing before this cycle moves on.

## Findings

### 1) Arrow keys on the timeline range handles also scrub playback

- **Severity:** Medium
- **Confidence:** High
- **Files:**
  - `src/lib/usePlaybackController.ts:149-157`
  - `src/components/TimelineSelector.tsx:363-461`
- **Evidence**
  - On a 375×812 viewport, I focused `[data-testid="timeline-start-handle"]` and pressed `ArrowRight`.
  - The handle moved (`aria-valuenow` changed from `0` to `1`), **and** playback also sought forward (`input[aria-label='재생 진행률']` changed from `0` to `0.02`).
- **Failure scenario**
  - Keyboard users trying to trim the timeline get a moving preview at the same time. That makes precise range editing unpredictable and can move the playback cursor away from the intended frame.
- **Concrete fix**
  - Either add `[role="slider"]` to the interactive-target exclusion in `usePlaybackHotkeys`, or stop propagation from the custom slider key handlers in `TimelineSelector` so arrow keys only adjust the range.

### 2) Mobile loaded state hides the only visible track-name confirmation

- **Severity:** Medium
- **Confidence:** High
- **File:** `src/components/TrackWorkspace.tsx:117-123`
- **Evidence**
  - On a 375×812 viewport after loading the sample trip, `document.querySelector('[data-testid="track-title"]')` exists but `getComputedStyle(...).display` is `none`.
  - `document.body.innerText.includes('Namsan Tower Walk')` was `false`, and the accessibility snapshot did not expose the track name either.
- **Failure scenario**
  - On phones, users get no inline confirmation of which track is active after import. If they load the wrong file, there is no visible or spoken track-name anchor to reassure them.
- **Concrete fix**
  - Replace the `hidden lg:block` treatment with a compact mobile header/chip so the track name and point count remain visible and announced at small breakpoints.

### 3) The mobile “additional controls” popup claims menu semantics but does not behave like a menu

- **Severity:** Low
- **Confidence:** High
- **File:** `src/components/TrackToolbar.tsx:134-237`
- **Evidence**
  - `button[aria-label="추가 컨트롤"]` opens a `role="menu"` containing `role="menuitem"` children.
  - When I focused the first menu item and pressed `ArrowDown`, focus stayed on the same `BUTTON` instead of moving to the next item.
- **Failure scenario**
  - Screen readers are told this is a menu, but keyboard behavior is still generic popover/tab behavior. That mismatch is confusing and makes the mobile toolbar feel inconsistent for assistive-tech users.
- **Concrete fix**
  - Either remove the `menu/menuitem` roles and treat it as a normal popover of buttons, or implement full menu keyboard behavior with roving focus and arrow-key navigation.

## Verification notes
- Checked the live app in browser automation at desktop and 375×812 mobile sizes.
- Inspected accessibility snapshots, focus state, and computed styles/DOM text.
- Confirmed the export modal focus trap works and did not find console errors during the reviewed flows.
