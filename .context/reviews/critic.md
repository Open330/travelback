# Critic review — cycle 001

Date: 2026-07-16

Reviewed revision: `df8f08a`

Mandate: challenge whether the product's promises survive a complete traveler journey

## Coverage

I reviewed the complete tracked product surface: landing/import copy, all 17 components, parser and worker paths, playback/camera/export controllers, all tests and fixtures, scripts/configuration, README/context, and the static workflow. I exercised the running app at desktop and iPhone 15 dimensions and ran targeted format, mobile, dialog, error, stub-export, and opt-in real-export E2E checks. This is a product-claim review, not an implementation plan.

## Findings

### CRIT-01 — “Exports browser-side MP4” is not protected by a test that can reach the encoder

- Severity: **High**
- Confidence: **High**
- Classification: **Confirmed test defect; product export remains unproven by this review**
- Evidence: the README makes MP4 export a headline promise at `README.md:25` and `README.md:60`. The deterministic test at `e2e/travelback.spec.ts:1299-1309` substitutes a local export stub. The real test is disabled by an early return at `e2e/travelback.spec.ts:1314-1315`; when enabled, it requests nonexistent duration `3` at line 1319, versus the controls' allowed values at `src/components/Controls.tsx:23-24`.
- Reproduction: run `TRAVELBACK_REAL_EXPORT=1 PLAYWRIGHT_DEV_PORT=43127 PLAYWRIGHT_REUSE_EXISTING_SERVER=1 npx playwright test -c playwright.config.ts -g 'real export produces a valid MP4'`. Both attempts timed out in `selectOption('3')`; encoding was never invoked.
- User scenario: a release passes all routine checks even if the final MP4 path regressed. The first person to discover it may be a traveler after waiting through rendering.
- Recommended fix: repair the test input, assert a nontrivial MP4 download, and run the smoke on a browser/runner where WebCodecs support is part of the release contract. Continue to call the stub test a UI-state test.

### CRIT-02 — The Google “computer” route can send current Timeline users through a long dead end

- Severity: **Medium**
- Confidence: **High**
- Classification: **Confirmed guidance mismatch; Takeout availability for a particular legacy account needs manual validation**
- Evidence: `src/components/GoogleGuide.tsx:167-189` presents the Takeout method as the equal “computer” path. English copy says to select Location History and find `Records.json` at `src/lib/i18n.ts:180-189`; Korean repeats it at `src/lib/i18n.ts:537-546`. The landing tip also leads with Takeout ZIP at `src/lib/i18n.ts:20`. Current official Google guidance exports Timeline data from Google Maps on iOS or Android's Location settings, and Google describes Timeline as device-based: [iPhone/iPad export](https://support.google.com/maps/answer/6258979?co=GENIE.Platform%3DiOS&hl=en), [Android Timeline controls/export](https://support.google.com/maps/answer/14169818?co=GENIE.Platform%3DAndroid&hl=en-419).
- User scenario: a traveler chooses “computer,” requests an archive, waits for email, extracts it, and cannot find the promised route JSON because the current data lives on the phone. The app appears broken before a file is ever uploaded.
- Recommended fix: make phone export the explicit current path; mark Takeout as a legacy/conditional fallback and explain that the archive may not include device-based Timeline data. Update the landing tip and README source table at the same time.

### CRIT-03 — A manually drawn journey cannot be named

- Severity: **Medium**
- Confidence: **High**
- Classification: **Confirmed product-friction defect**
- Evidence: the UI labels the emoji chooser “Route name icon” at `src/lib/i18n.ts:270`, but exposes only the icon buttons at `src/components/JourneyCreator.tsx:737-765`. Creation always assigns `${emoji} Custom Journey` at `src/components/JourneyCreator.tsx:607-614`; the confirmation at `src/components/JourneyCreator.tsx:795-815` has no name field.
- User scenario: a traveler sketches Bali, Kyoto, and Seoul routes. Every track/export begins with the same generic label, making the workspace and downloaded files harder to distinguish.
- Recommended fix: add an optional, prefilled route-name field to the existing confirmation card and use it for the `Track` name. This stays client-side and within scope.

## What survived the challenge

The landing CTA hierarchy is clear, portrait social export is the default (`src/components/ExportPanel.tsx:70`), advanced codec controls are hidden until requested, the success screen offers MP4 download and platform tips (`src/components/ExportPanel.tsx:252-285`), and wrong-file errors include recovery guidance (`src/components/FileUpload.tsx:63-88`, `289-303`). Targeted GPX/KML/Google import checks passed, as did mobile/dialog/theme/error checks and the stubbed export state transition.

## Final sweep

I re-ran the strongest counterexample—the opt-in real export—after the first failure and received the same selector failure on retry. I then checked every finding against current source rather than carrying forward historical review claims. No additional high-confidence product blocker was found.
