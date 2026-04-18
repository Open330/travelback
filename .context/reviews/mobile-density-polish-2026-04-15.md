# Mobile Density Polish — 2026-04-15

## Additional polish pass

I continued after the theme/toolbar fixes and tightened the loaded mobile workspace further:

- Reduced mobile elevation profile height and hid the elevation summary label row on small screens.
- Kept timeline date labels, but removed the extra histogram-help text on mobile so the timeline footer is more compact.
- Reduced mobile playback panel padding slightly while preserving 44px-class touch targets.

## Result
- The loaded mobile sample view now leaves more room for the actual map.
- The bottom stack is still feature-complete, but visually lighter and less cramped.

## Verification
- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run build` ✅
- `npm run test:e2e:static:ci` ✅ `50 passed`
