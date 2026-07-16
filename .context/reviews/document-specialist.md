# Documentation specialist review — cycle 002

Date: 2026-07-16
Reviewed revision: `cc6f24f`

## Inventory and method

I reviewed README, every current `.context` project/development instruction, the active plan index, package scripts/configuration, workflow, all 50 `src/` files for user-visible claims and comments, all 12 unit-test files, the Playwright spec and 17 fixtures, public/runtime assets, and all 7 scripts. Generated output and historical plan/review archives were excluded except for the cycle-1 aggregate/plan used to identify carried-forward issues.

Because Google changes Timeline export flows, I rechecked the in-product instructions against Google's current official support pages on 2026-07-16: [iPhone/iPad Timeline export](https://support.google.com/maps/answer/6258979?co=GENIE.Platform%3DiOS&hl=en), [Android Timeline export](https://support.google.com/maps/answer/14169818?co=GENIE.Platform%3DAndroid&hl=en-419), and [Google Takeout help](https://support.google.com/accounts/answer/3024190?hl=en).

## New findings

### DOC-C2-01 — The Takeout guide gives an unsupported completion-time promise in every locale

- Severity: **Low**
- Confidence: **High that the claim is unsupported; actual per-account duration is variable/manual-validation**
- Status: **Confirmed documentation defect, not a parser defect**
- Repository evidence: English says “usually 10 minutes to a few hours” at `src/lib/i18n.ts:186`; the same bound is repeated in Korean `:546`, Japanese `:906`, Chinese `:1266`, and Spanish `:1626`.
- Authoritative evidence: Google's Takeout help promises an email when an export is complete and recommends smaller archives when downloads fail, but gives no 10-minute-to-hours service window. Completion depends on archive size/account state and is not controlled by Travelback.
- Failure scenario: after waiting a few hours, a traveler assumes either Google or Travelback has failed and abandons an otherwise valid fallback flow.
- Suggested fix: remove the duration: “Create export → wait for Google's completion email → download the ZIP.” If a time hint is retained, explicitly say it varies and may take much longer; do not translate a numeric promise that the upstream service does not make.

### DOC-C2-02 — README calls an explicitly adapted stylesheet an “exact upstream copy”

- Severity: **Low**
- Confidence: **High**
- Status: **Confirmed internal contradiction**
- Evidence: `README.md:138` describes `vitro-base.css` as “exact upstream copy + service theme,” while `src/styles/vitro-base.css:1-5` labels itself “adapted for Travelback.” README itself also says the system was adapted at `README.md:219`. The file includes Travelback-specific density/touch/contrast rules, for example `src/styles/vitro-base.css:225-245`.
- Failure scenario: a maintainer assumes the file can be replaced wholesale from upstream or diffed as a pristine vendor copy, discarding local accessibility/theme work.
- Suggested fix: describe it as an adapted/vendor-derived base and, if upstream synchronization matters, record the upstream revision plus which sections are local.

### DOC-C2-03 — Three shipped locale strings contain obvious duplicated or missing grammar

- Severity: **Low**
- Confidence: **High**
- Status: **Confirmed copy defects; final wording should receive native-speaker review**
- Evidence: Korean `export.estimatedTime` is the redundant `약 예상 소요 시간:` at `src/lib/i18n.ts:478`; Japanese `journey.addOneMore` is missing the connective in `ルートを作成するにもう1つ追加` at `:974`; Chinese `export.estimatedTime` duplicates approximation/estimation in `约计预计时间:` at `:1198`. `src/lib/i18n.test.ts:6-25` checks key parity/duplicates, not linguistic quality.
- Failure scenario: users encounter visibly broken copy in the advanced export or manual-route flow, precisely where they need reassurance that the app understands their language.
- Suggested fix: use concise native forms (for example Korean `예상 소요 시간:`, Japanese `ルートを作成するには、もう1ポイント追加してください`, Chinese `预计时间:`), then have a native speaker approve all five corresponding flows. Keep key-parity tests and add a reviewed-copy checklist rather than brittle prose snapshots.

### DOC-C2-04 — The architecture reference materially misdescribes five current runtime paths

- Severity: **Medium**
- Confidence: **High**
- Status: **Confirmed source/documentation drift**
- Evidence:
  - `.context/project/02-architecture.md:19` still calls `GoogleGuide` a “Google Takeout import guide,” while current copy makes phone Timeline export primary and includes Strava, Garmin, AllTrails, Komoot, and other-app tabs (`src/components/GoogleGuide.tsx:155-205`, `src/lib/i18n.ts:165-171`).
  - `.context/project/02-architecture.md:59-60` and the source comment at `src/lib/videoEncoder.ts:99-107` say capture goes directly through `CanvasSource.add()`. The implementation imports/constructs `VideoSampleSource` at `src/lib/videoEncoder.ts:120` and `:174-179`, copies each captured `VideoFrame` through a CPU-backed staging canvas at `:146-165` and `:211-227`, then adds a `VideoSample`.
  - `.context/project/02-architecture.md:69` says identical camera state resolves immediately without waiting for paint. `src/lib/map-render.ts:16-20` and `:62-86` instead subscribe before mutation, call `triggerRepaint()`, wait for `render`, and then wait one animation frame, specifically so source-only changes paint.
  - `.context/project/02-architecture.md:75-77` says completed segments are pushed as O(1) references and only the partial segment is copied. `src/lib/map-geometry.ts:78-93` iterates segments and calls `slice(0, lastOffset + 1)`, so rebuilding a newly completed prefix still copies coordinates.
  - The map-layer table at `.context/project/02-architecture.md:155-165` omits the active `trail-head` source/`trail-head-line` layer defined at `src/components/MapView.tsx:65-68`, updated at `:410-435`, and rendered at `:760-787`.
- Failure scenario: a maintainer investigating export stalls, frame freshness, trail cost, or map styling follows an obsolete pipeline and “fixes” behavior that no longer exists, or overlooks the layer that now provides continuous trail motion.
- Suggested fix: update the component label, export diagram, repaint semantics, complexity wording, and layer inventory together. Correct the stale `videoEncoder.ts:99-107` comment in the same change so the executable source does not immediately reintroduce drift.

### DOC-C2-05 — README's Mediabunny acknowledgement links to a 404 repository

- Severity: **Low**
- Confidence: **High**
- Status: **Confirmed live-link defect on 2026-07-16**
- Evidence: `README.md:222` links to `https://github.com/nicosh/mediabunny`, which returned HTTP 404. The current project repository is [Vanilagy/mediabunny](https://github.com/Vanilagy/mediabunny), which returned HTTP 200 and matches the installed package name/import.
- Failure scenario: a contributor cannot reach the encoder's official source, API documentation, issues, or license from the project's acknowledgement.
- Suggested fix: replace the link with the official repository URL and optionally use the package's canonical documentation URL if the acknowledgement is meant as an API reference.

## Accuracy checks that passed

- Current phone export steps are accurate: `src/lib/i18n.ts:172-177` matches Google's iOS and Android support routes, and `src/components/GoogleGuide.tsx:155-175` links to the platform-specific official pages.
- The Takeout tab is now explicitly labelled legacy and warns that current device-based Timeline data may be absent (`src/lib/i18n.ts:166`, `:181-187`), resolving the cycle-1 conflation.
- The README format list, resolution presets, static base-path command, and local-processing promise matched parser/types/config/source behavior in this sweep.
- Fresh targeted browser tests imported GPX, KML, and all five documented Google JSON families: **7/7 passed**.

## Carried-forward items

README still says MIT at `README.md:224-226` without a root license file. This is the already-recorded cycle-1 legal/owner decision (AG-27/P27), not a new cycle-2 discovery. CI policy/permissions and low-end `preserveDrawingBuffer` measurement are likewise outside documentation edits and remain carried forward.

## Final missed-issue sweep

I re-searched current prose for Google/Takeout paths, time estimates, supported formats, resolution/codec claims, commands, base path, privacy/local processing, test structure, architecture diagrams, runtime comments, dependency links, design-system provenance, licensing, and untranslated/duplicated locale copy. No other new confirmed documentation defect remained. New finding count: **5** (1 Medium, 4 Low). Clean verified scopes: current phone acquisition, legacy labelling, documented import families, scripts/base path, and privacy wording.
