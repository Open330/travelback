# Designer Review — Cycle 10 (2026-07-17)

Review target: `3d74754369d22ad1bb9e7970634e0f0163d5b777`.

## Scope and live evidence

The design inventory covered the app shell and every production component/hook, shared types/localization/styles, authored visual assets, tests/fixtures, and the full landing → acquire → preview → playback/trim → Camera/scenes → export path. States reviewed included empty, loading, loaded, unsupported input, rendering, ready/save/share, errors, five locales, dark/light themes, reduced motion, keyboard focus, touch targets, responsive containment, and mobile safe areas.

Using agent-browser core, configuration, interaction, query, wait, network, visual, debug, state, and storage workflows, I exercised the isolated exact-HEAD app at 1440×900 and iPhone 15 emulation (393×852). The sample loaded successfully, desktop/mobile had no document overflow, landing controls had visible focus, and the loaded phone controls fit the emulated viewport. Screenshots are `/tmp/cycle10-landing-desktop.png`, `/tmp/cycle10-workspace-desktop.png`, `/tmp/cycle10-scene-endpoints.png`, `/tmp/cycle10-mobile-loaded.png`, `/tmp/cycle10-localized-google.png`, and `/tmp/cycle10-mobile-journey.png`.

The isolated code gates passed, as did 17 files/405 Vitest cases and a retries-off 13-case Chromium slice in 6.3 minutes covering the supported import families, local export/picker cancellation, and complete KML/Records journeys. These broad passes do not contain the four right-reason assertions requested below.

## Findings

### DESIGN10-01 — The landing's visual title is not the page title semantically

- Severity / confidence: Medium / High
- Status: Confirmed live/source accessibility defect
- WCAG relevance: headings and labels / meaningful structure (1.3.1, 2.4.6)
- Location: `src/components/FileUpload.tsx:194-205,259-261`
- Evidence: the only live heading is `h2 "Travelback"`; there is no H1. Visually it is clearly the page title, so semantics and information hierarchy disagree.
- Failure scenario: heading navigation starts at level two and offers no top-level orientation before the acquisition choices.
- Root fix: make the existing title an H1 without changing its styling and assert one page heading in the accessibility tree.

### DESIGN10-02 — Import fallback names break the selected-language experience

- Severity / confidence: Medium / High
- Status: Confirmed source defect
- Locations: `src/lib/parser.ts:214-216,228-230`; `src/lib/googleJsonParser.ts:377-380`
- Evidence: unnamed GPX/KML and Google imports inject English titles before the locale-aware UI receives them.
- Failure scenario: the global toolbar remains Korean/Japanese/Chinese/Spanish while the dominant trip title and downstream filename switch to English, making the app look partially translated.
- Root fix: resolve a structured missing-name/source-kind through i18n in the display boundary; validate all three sources in every shipped locale.

### DESIGN10-03 — Fallback export feedback overstates success

- Severity / confidence: Medium / High
- Status: Confirmed source/state defect
- Location: `src/lib/videoEncoder.ts:296-303,336-360`; `src/lib/useExportController.ts:250-264`; `src/components/ExportPanel.tsx:302-310`
- Evidence: the fallback explicitly records `saved:false`, but the visible heading is still “Video saved!” The supporting sentence only promises that a download started and is not itself the defect.
- Failure scenario: a blocked download leaves no file, while the strongest visual feedback tells the traveler to trust that saving is complete.
- Root fix: use distinct generated/download-started/save-confirmed states and pair each with truthful heading, recovery action, and focus target.

### DESIGN10-04 — The mobile Journey Creator Cancel hitbox is unusually narrow

- Severity / confidence: Low / High
- Status: Confirmed live/source touch-usability defect; not a WCAG 2.5.8 claim
- Location: `src/components/JourneyCreator.tsx:740-750`; `src/styles/vitro-base.css:796-805`
- Evidence: at 393×852 under coarse-pointer emulation, Cancel measured 20.75×44.09px while the journey-mode buttons measured 44×44. The responsive base rule supplies minimum height but no minimum width. The action is isolated enough that the WCAG target-spacing exception may apply; the defect is the product's inconsistent finger target and visibly tiny exit affordance.
- Failure scenario: a one-thumb traveler misses the narrow text target while trying to leave route creation, even though nearby icon actions establish a 44px target expectation.
- Root fix: add a 44px minimum width or sufficient horizontal padding, then extend the mobile geometry test beyond the mode icons to every primary route-creation action.

## Cross-cutting assessment

- **Responsive/touch:** no horizontal overflow appeared at either exercised viewport. The scene range's endpoint handles have symmetric intentional overhang and correctly aligned centers; the suspected clipping issue is rejected. Primary mobile loaded controls remained usable in emulation except for the narrow Journey Creator Cancel target above.
- **Keyboard/focus:** every landing action and global toolbar control was sequentially reachable with a visible focus indication. The H1 defect is structural, not a missing keyboard action.
- **Contrast/theme/motion:** the dark flow remained legible, and reduced-motion fallbacks exist for primary authored animation. No contrast or motion failure was promoted without a trustworthy measured reproduction.
- **Errors/loading/empty:** upload help, unsupported inputs, scene empty/custom states, export codec checking/rendering/ready/error, and reset paths have owned UI. The completion-copy mismatch above is the confirmed exception.
- **Mobile safe area:** real iOS home-indicator/dynamic-chrome behavior remains manual validation because the emulator reported a zero inset. No synthetic result is presented as a physical-device failure.

The final design sweep revisited hierarchy, action clarity, terminology, feedback truth, intrinsic localized widths, responsive containment, viewport-visible targets, focus order, color independence, reduced motion, safe areas, errors/recovery, and the complete primary journey. Only the four findings above crossed the evidence threshold.
