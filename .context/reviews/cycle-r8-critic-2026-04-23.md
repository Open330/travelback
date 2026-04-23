# Cycle r8 — Critic (2026-04-23)

## Scope

Adversarial read of the changes shipped across cycles r1–r7.
Particular attention to the cycle-r7 Escape-to-cancel on the export
overlay and the deferred items it leaves on the table.

## Criticisms considered

1. **Capture-phase keydown listener may swallow other handlers.**
   The `document.addEventListener('keydown', onKeyDown, true)` in
   `page.tsx:151` runs before `usePlaybackHotkeys`'s `window` listener
   (`usePlaybackController.ts:198`) because `capture` on `document`
   wins over bubble-phase on `window`. We deliberately chose this to
   ensure Escape gets to `cancelExport()` before playback hotkeys'
   `Escape → onClosePanels` path runs. The current design is
   intentional — not a defect.

2. **The overlay still doesn't call `focus()` when it mounts.** The
   minimal cycle-r7 fix did not move focus onto the overlay. A
   keyboard user who triggers export from a button that then becomes
   `disabled`/re-rendered may end up with focus on `<body>`. This is
   the same gap flagged as R7-AGG-D21 (full `ModalDialog` migration).
   No change to severity: LOW. Carrying forward.

3. **Cancel-button re-renders on every progress tick.** The
   export-progress number re-renders the cancel button roughly once
   per frame. The button is unconditionally cheap (no heavy children,
   no portal), so this is a non-issue. No action.

## Findings

### CT8-1 — No new critic findings (INFO)

All adversarial concerns reduce to already-deferred items (R7-AGG-D21
covers the focus-move request).

## Verdict

No action this cycle.
