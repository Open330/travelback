# Designer Review — Cycle 8 (2026-07-17)

## Scope and evidence

The UI inventory covered the complete app shell, all 17 production components, both hooks, shared types, localization, the two authored stylesheets, public guide/landing assets, root framework/browser-test configuration, all 16 unit suites, and the complete Playwright journey in `e2e/travelback.spec.ts` with its 18 fixtures. I traced landing, import, loaded workspace, playback, timeline/elevation, scene editing, journey creation, export, errors, dialogs, locale/theme controls, mobile controls, and reduced-motion rules.

The browser pass used the required agent-browser core, configuration, interaction, query, wait, network, visual, debug, state, and storage surfaces in the isolated `travelback-cycle8-review` session. It loaded the hardened current `out/index.html`, rewrote its absolute stylesheet/image URLs only in the page DOM, and inspected accessibility structure and computed geometry at 390×844 and 1440×1000. At 390×844 the page had no horizontal/vertical overflow, the landing card and toolbar did not intersect, and the exercised primary controls were at least 44px. At 1440×1000 the centered card and toolbar were also separate. No screenshot interpretation was used. Because `file://` could not hydrate Next's absolute `/travelback` chunk graph, interaction-dependent claims were not inferred from that session; the apparent unstyled native-file-input issue was rejected once the real stylesheet hid it. No server, port, process, worktree, or temporary file was created or stopped.

## Findings

### DESIGN8-01 — Supported non-English locales force React to discard the server-rendered UI during hydration

- Severity: Medium
- Confidence: High
- Status: Confirmed by a direct real-provider SSR/hydration probe
- Location: `src/lib/i18n.ts:1838-1845,1869-1888`; test gap in `src/lib/i18n.test.ts:103-108` and fixed-English browser context in `playwright.config.ts:19-31`
- Problem: `getInitialLocale()` returns English when rendering statically because `window` is absent, but the same state initializer reads storage or `navigator.language` during hydration. Any supported non-English preference therefore renders different text on the client before hydration completes.
- Concrete failure: the repository's actual `LocaleProvider` rendered the English upload subtitle on the server and hydrated with `navigator.language = 'ko-KR'`. React emitted `Hydration failed because the server rendered text didn't match the client`, replaced the provider tree, and only then showed the Korean subtitle. Returning users with a stored non-English locale follow the same divergent path. On a slower device this produces English-first instability and delays trustworthy interaction across the whole app shell.
- Fix: hydrate from a deterministic English state that matches the static HTML, then resolve stored/browser preference after mount and update `document.lang`. Add an SSR-to-hydration regression for a supported non-English navigator and stored locale that asserts no hydration diagnostic and eventual localized text/lang.

### DESIGN8-02 — Spanish locale copy contains a grammatical error and an untranslated timeline term

- Severity: Low
- Confidence: High
- Status: Confirmed source defect
- Location: `src/lib/i18n.ts:1669,1699`; existing reviewed-copy assertions at `src/lib/i18n.test.ts:58-71`
- Problem: the Google guide says `datos del cronología`, although *cronología* is feminine (`datos de la cronología`). The timeline reset's accessible label says `Restablecer rango del timeline`, leaking the English product term into otherwise localized controls.
- Concrete failure: a Spanish-speaking traveler sees broken grammar in the most important provenance guidance and hears mixed-language copy when reaching the range reset by assistive technology. That weakens confidence precisely where the app asks the user to locate sensitive travel data.
- Fix: use `datos de la cronología` and `Restablecer intervalo de la línea de tiempo`, and extend the reviewed-phrase regression so these known mistakes cannot return.

## Cross-cutting UX sweep

- Information architecture and affordances: landing primary/sample/manual-route paths are distinct; loaded-track actions remain grouped; no new dead end was found.
- Keyboard/focus/WCAG 2.2: current components expose dialog, tab, slider, status, alert, and focus-visible contracts; the Cycle 7 Help and segmented-focus fixes are present. No new confirmed trap, obscured target, or contrast regression was found in current source.
- Responsive states: source plus valid computed geometry cover narrow and desktop landing layouts; loading, unsupported-file, map failure, export readiness/cancel/failure, and empty-scene/journey states have explicit UI.
- Theme/motion/i18n: light/dark token ownership and `prefers-reduced-motion` fallbacks are present. RTL is not reported because all five shipped locales are LTR. DESIGN8-01 and DESIGN8-02 are the only new localized-experience defects promoted.
- Perceived performance: no new measured UI-performance finding was established; retain the existing evidence-gated playback/elevation/waypoint/export and `preserveDrawingBuffer` items.

The final sweep revisited fixed corners, mobile overflow, touch targets, dialogs, focus restoration, error recovery, color-independent state, locale switching, dark/light bootstrap, reduced motion, loading/empty/success states, and test ownership. No relevant UI file was skipped.
