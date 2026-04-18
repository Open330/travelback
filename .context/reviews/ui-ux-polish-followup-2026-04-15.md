# UI/UX Polish Follow-up — 2026-04-15

Additional improvements made after the original remediation pass:

- Removed the duplicate landing-page sample CTA below the main upload button, keeping the preview card as the primary sample-entry path.
- Changed the sample preview card's accessible label to the actual action (`Try with a sample trip`) so keyboard/screen-reader users get a cleaner first-run action name.
- Enlarged MapLibre navigation and attribution control hit areas to 44px-class targets while a track is loaded.

Verification:
- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run build` ✅
- `npm run test:e2e:static:ci` ✅ `44 passed`
