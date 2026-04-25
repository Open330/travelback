# Cycle 1 Aggregate Review — 2026-04-25

## Inputs

Specialist reports written this cycle:

- `.context/reviews/cycle1-code-reviewer-2026-04-25.md`
- `.context/reviews/cycle1-security-reviewer-2026-04-25.md`
- `.context/reviews/cycle1-architect-2026-04-25.md`
- `.context/reviews/cycle1-debugger-2026-04-25.md`
- `.context/reviews/cycle1-test-engineer-2026-04-25.md`
- `.context/reviews/cycle1-critic-2026-04-25.md`
- `.context/reviews/cycle1-verifier-2026-04-25.md`
- `.context/reviews/cycle1-document-specialist-2026-04-25.md`
- `.context/reviews/cycle1-designer-2026-04-25.md`
- `.context/reviews/cycle1-perf-reviewer-2026-04-25.md`
- `.context/reviews/cycle1-tracer-2026-04-25.md`

No review-agent failures were recorded. The designer lane used a live browser probe; several lanes ran lint/typecheck/build/smoke checks while reviewing.

## Deduplicated findings and disposition

| ID | Highest severity | Cross-agent signal | Finding | Primary evidence | Disposition |
|---|---|---:|---|---|---|
| F1 | High | 6 | Google JSON point-budget pre-scan rejected valid exports before validation/dedup. | `src/lib/parser.ts:476-489`, `public/workers/trackParser.worker.js:301-334` | Fixed: removed hard raw-key pre-scan and kept budget enforcement after parsing/normalization. |
| F2 | High | 4 | Timed Google observations repeated across matching export branches were no longer deduped. | `src/lib/parser.ts:422-535`, `public/workers/trackParser.worker.js:178-246` | Fixed: restored global dedupe for timed observations while preserving untimed repeated visits across segments; added fixture/test. |
| F3 | High | 4 | Timeline drag committed expensive parent/session/export state on every animation frame and no-op handle clicks reset export/playback. | `src/components/TimelineSelector.tsx:202-308`, `src/app/page.tsx:274-301` | Fixed: drag now updates local handle state during movement and commits one range update on drag end only; no-op releases do not commit. |
| F4 | Medium-High | 5 | 1 MB XML cap rejected legitimate GPX/KML files despite advertised support. | `src/lib/parser.ts:544-660`, `e2e/travelback.spec.ts:416-423` | Fixed: restored 4 MB XML cap, updated smoke guard/docs, and added >1 MB valid GPX regression. |
| F5 | Medium | 2 | Export panel showed an unsupported-codec alert while codec support probing was pending. | `src/components/ExportPanel.tsx:108-111`, `src/components/ExportPanel.tsx:409-423` | Fixed: split pending vs unsupported states; pending uses neutral status, unsupported uses alert only after a false probe. |
| F6 | High | 1 | Export pipeline allowed oversized in-memory MP4 outputs. | `src/lib/videoEncoder.ts:73-77`, `src/components/ExportPanel.tsx:29-111` | Fixed: centralized a 256 MB in-memory export guard in UI and encoder. |
| F7 | Medium | 2 | Track load left keyboard focus on `body` instead of a visible workspace control. | `src/app/page.tsx:253-262`, live browser probe | Fixed: successful load focuses the first visible playback control with status fallback; added regression. |
| F8 | Medium | 2 | Journey waypoint drag suppression could swallow the next intentional map click. | `src/components/JourneyCreator.tsx:290-350` | Fixed: suppression is now time-bounded to the immediate post-drag synthetic click window. |
| F9 | Low | 1 | File-too-large recovery hint could render double punctuation. | `src/components/FileUpload.tsx:77-87` | Fixed: normalize trailing punctuation before appending recovery hint. |
| F10 | Low-Medium | 2 | Static preview server buffered full files and smoke checks missed HEAD/status on runtime assets. | `scripts/serve-static.mjs:122-166`, `scripts/smoke-static.mjs:221-231` | Fixed: stream GET responses, short-circuit HEAD, assert runtime asset status and cache headers. |
| F11 | Low | 1 | Production debug bridge could be enabled by URL/localStorage. | `src/components/MapView.tsx:595-606` | Fixed: query/localStorage debug hooks are honored only on localhost; development still works. |
| F12 | Medium | 2 | Docs over-promised local “map styles” as cartographic basemaps. | `.context/project/01-overview.md:91`, `.context/project/02-architecture.md:110` | Fixed: docs now call them local background themes and explain there are no road/city basemap assets. |
| F13 | Medium | 1 | Input-format docs omitted XML size and parser caveats. | `.context/project/01-overview.md:35-36` | Fixed: docs now state the 4 MB browser-side XML safety cap and malformed XML caveat. |
| F14 | Low | 1 | Non-technical reviewer docs hard-coded H.264 language despite selectable codecs. | `.context/agents/non-tech-traveler-reviewer.md:99` | Fixed: docs now refer to the selected MP4 codec. |
| F15 | High | 3 | Main parser and worker still duplicate Google parsing logic by hand. | `src/lib/parser.ts:253-545`, `public/workers/trackParser.worker.js:1-334` | Deferred with record: requires shared worker build/parity refactor beyond this cycle's no-new-dependency, small-diff lane. |
| F16 | High | 4 | Large-file parsing still lacks a true streaming/bounded parser boundary for Google JSON and XML. | `src/lib/parser.ts:158-209`, `src/lib/parser.ts:487-546` | Deferred with record: requires a workerized/streaming parser design; current cycle kept bounded caps and fixed confirmed regressions. |
| F17 | Medium-High | 2 | Map ownership leaks through `MapViewHandle`, coupling export and journey editing to MapLibre internals. | `src/components/MapView.tsx:26-34`, `src/components/JourneyCreator.tsx:183-430` | Deferred with record: architectural refactor, not a confirmed cycle regression. |
| F18 | Medium | 1 | Preference state ownership remains split across bootstrap, app shell, and ThemeToggle. | `src/app/layout.tsx:53-66`, `src/app/page.tsx:32-441`, `src/components/ThemeToggle.tsx:7-57` | Deferred with record: architectural simplification, not required to fix current gates. |
| F19 | Medium | 1 | Header-only anti-framing cannot be enforced directly on GitHub Pages. | `.context/project/02-architecture.md:103-118`, `scripts/harden-static-export.mjs:1-35` | Deferred with record: repo docs explicitly note GitHub Pages cannot attach custom headers; JS frame-buster remains current mitigation. |
| F20 | Medium/Low | 1 | Remaining test-suite coverage gaps: sleeps, export cancel, drag/drop upload, full frame encoding, additional parity checks. | `e2e/travelback.spec.ts` cited in test-engineer report | Partially fixed with focused regressions; broader hardening deferred with record. |

## Final sweep

The aggregate preserves each per-agent report for provenance, schedules every confirmed regression for implementation, and records every not-implemented architectural or coverage item in `plan/deferred-cycle1-review-2026-04-25.md` with severity, reason, and exit criteria.
