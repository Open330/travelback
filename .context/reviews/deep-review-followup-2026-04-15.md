# Deep Review Follow-up — 2026-04-15

Additional hardening completed after the first post-remediation pass:

## Improvements

- **JourneyCreator touch dragging support added**
  - Waypoint dragging now listens to `touchstart`/`touchmove`/`touchend` in addition to mouse events.
  - Drag state now tracks whether a point actually moved, preventing the post-drag click/delete path from firing accidentally.

- **Modal dialog handling made stack-aware**
  - The modal shell now tracks open dialogs globally.
  - Background `inert` / `aria-hidden` and body scroll lock are only released when the last open dialog closes.
  - Only the topmost dialog processes focus trapping and Escape handling.

## Verification
- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run build` ✅
- `npm run smoke:static` ✅
- `npm run test:e2e:static:ci` ✅ `48 passed`

## Notes
- Touch dragging is now implemented in code, but a real-device manual sanity check would still be valuable because automated touch dragging through Playwright remains awkward for this specific map interaction.
