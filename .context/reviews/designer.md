# Product designer review — cycle 001

Date: 2026-07-16

Reviewed revision: `df8f08a`

## Actual-app coverage

I used the running app, not screenshots alone. With `agent-browser` I inspected the accessibility tree, clicked controls, queried DOM/computed styles, checked console/page errors and network/storage state, and captured desktop (1440×900) and iPhone 15 (393×852, DPR 3) views. I also used Playwright's configured Chromium/WebGL flags for interaction measurements and ran targeted mobile, theme, language, guide, dialog-focus, error, and format journeys. Source coverage included every component/style/i18n file plus relevant tests.

The landing screen is visually cohesive in dark mode, the desktop and mobile cards stay within the viewport, the global toolbar does not overlap the main action card, and primary controls measured at least 44px high. Copy hierarchy, focus treatment, and the portrait-social default are materially better than a typical settings-heavy creator tool.

## Findings

### DESIGN-01 — Route-mode icon targets are only 33px wide on an iPhone viewport

- Severity: **Medium**
- Confidence: **High**
- Classification: **Confirmed runtime measurement; platform ergonomics issue, not a WCAG conformance claim**
- Evidence: at 393×852, configured Chromium measured all six `journey-icon-*` buttons at approximately **33×44px**. The buttons are a tightly wrapped `px-2 py-1` group at `src/components/JourneyCreator.tsx:741-764`, unlike the explicit full-width/minimum-height actions elsewhere.
- User scenario: a traveler taps car but selects plane, especially one-handed. The emoji-only labels make the narrow hit areas visually plausible but physically less forgiving than the familiar 44×44 iOS target.
- Recommended fix: add `min-w-11 min-h-11`, preserve `aria-label`/title, and allow two-row wrapping. Validate at 320, 390, and 430px widths so the larger targets do not collide with the panel edge.

### DESIGN-02 — Korean advanced-export summary leaks an English connector

- Severity: **Low**
- Confidence: **High**
- Classification: **Confirmed rendered-copy defect**
- Evidence: the Korean dictionary defines `export.at` as literal English `at` at `src/lib/i18n.ts:474`; the advanced summary renders it between codec and bitrate at `src/components/ExportPanel.tsx:408-411`.
- User scenario: after switching to Korean and opening Advanced, the otherwise localized line reads like “출력 … (H.264) at 8 Mbps.” It is understandable, but it breaks trust in the translation at the most technical moment.
- Recommended fix: localize the complete summary pattern per locale rather than translating the connector token in isolation. A Korean form such as `H.264 · 8 Mbps` avoids awkward grammar.

### DESIGN-03 — “Route name icon” promises naming, but the flow offers only an emoji

- Severity: **Medium**
- Confidence: **High**
- Classification: **Confirmed interaction-model mismatch**
- Evidence: the label is `Route name icon` at `src/lib/i18n.ts:270`; the control group contains only six emoji choices at `src/components/JourneyCreator.tsx:737-765`; confirmation has no editable identity at `src/components/JourneyCreator.tsx:795-815`; creation hard-codes `Custom Journey` at `src/components/JourneyCreator.tsx:607-614`.
- User scenario: the user expects a naming step, reaches confirmation, and has no way to identify “Bali sunrise drive” versus another custom journey.
- Recommended fix: change the label to “Travel icon” immediately, and add an optional route-name field to confirmation if distinct journeys are meant to be saved/downloaded under meaningful names.

## Accessibility, responsiveness, and motion sweep

- Focus: shared focus-visible styling exists at `src/styles/vitro-base.css:610-618`; dialog focus containment/return passed the targeted tests.
- Reduced motion: global suppression is present at `src/styles/vitro-base.css:766-771` and component-specific fallbacks at `src/app/globals.css:46-70` and `260-264`.
- Mobile: 393×852 landing content had no horizontal overflow; tested toolbar, journey, timeline, scene-editor, and export layouts passed.
- Contrast: inspected landing secondary text remained readable against the dark glass card; no contrast failure was established. Light and dark system-theme checks passed.
- i18n/RTL: English, Korean, Japanese, Chinese, and Spanish are present and key parity is covered. No RTL locale is advertised, so this review does not claim RTL support.
- Error recovery: wrong-file messaging includes an alert and an import-guide route at `src/components/FileUpload.tsx:289-303`.

## Final sweep

I revisited landing, mobile geometry, guide/dialog behavior, export defaults/success actions, keyboard focus, reduced motion, localization, and error recovery after the findings were drafted. No blocking overlap, unreadable state, or dead-end primary CTA was reproduced.
