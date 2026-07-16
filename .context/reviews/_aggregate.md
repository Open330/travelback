# Aggregate Review — Travelback (Cycle 7, 2026-07-17)

## Outcome

All twelve required role reviews completed against `2df1516`, were read independently, and produced their canonical artifacts. Cross-report deduplication retains **9 new actionable findings**: 5 Medium and 4 Low, all with High confidence. Security and performance review found no new actionable issue; established authority, legal-input, representative-hardware, and measured-redesign carryovers remain unchanged.

Fresh evidence:

- `npm run lint`, direct no-emit TypeScript, generated-worker parity, and `git diff --check` passed.
- All 368 unit tests passed across 15 files without the former React lifecycle warning.
- `npm audit --audit-level=high --json` reported zero vulnerabilities across 579 dependencies; the current-source secret scan found no credential material.
- Current-source desktop/mobile browser checks covered landing, sample/GPX loading, map/playback, More-controls focus containment, export-dialog inertness and focus restoration, Korean status/guide content, and responsive stack separation with empty console/page-error buffers.
- A direct parser probe converted source latitude order `10, 20, 30` into `20, 10, 30` when only the middle observation had a valid timestamp.
- At 1440×1000, Help occupied `(1345.75,812,78.25,44)` and the composed bottom stack occupied `(0,697.47,1440,302.53)`. The full Help target intersected, and `elementsFromPoint` identified the Elevation-profile SVG above Help at its center.
- No process, live `.next/dev/lock`, or port 3114 was touched. Bounded static servers on unique review ports exited through their own configured lifetime.

## Deduplicated actionable findings

| ID | Severity / confidence | Evidence | Finding and required outcome |
| --- | --- | --- | --- |
| AG7-01 | Medium / High | `src/lib/googleJsonParser.ts:228-270`; `src/lib/parser.test.ts:548-560,980-1013`; CODE7-01, CRIT7-01, ARCH7-01 | **Partially timestamped Google data is reordered into a route that never existed.** A valid timestamp partitions ahead of adjacent untimed observations; the same rule can reorder partially comparable segments. Preserve producer order unless every retained point/segment in the comparison domain has a valid time, and cover mixed valid/missing/empty/invalid timestamps through direct parser and worker paths. |
| AG7-02 | Medium / High | `src/components/ElevationProfile.tsx:20-60`; `e2e/fixtures/invalid-elevation.gpx`; CODE7-02, CRIT7-02, ARCH7-02 | **Missing elevation samples become false trip-minimum vertices.** Preserve unknown data by drawing separate contiguous valid runs; do not invent leading/trailing or interior extrema. Add pure/component path assertions for leading, interior, and trailing gaps while retaining the no-NaN browser check. |
| AG7-03 | Medium / High | `src/components/KeyboardHelp.tsx:19-30`; `src/components/TrackWorkspace.tsx:142-173`; current-browser hit geometry; CODE7-03, CRIT7-04, ARCH7-03, VR7-03, TE7-03, DESIGN7-03, MINA | **The desktop Help button is fully covered by the elevation/bottom stack.** Give Help a shared collision-free layout owner or place it in the desktop TrackToolbar. Prove non-intersection, center hit ownership, real click-to-dialog behavior, and unchanged progress. |
| AG7-04 | Medium / High | `src/components/GlobalToolbar.tsx:27-49`; `src/components/TrackToolbar.tsx:231-253`; `src/styles/vitro-base.css:615-623`; VR7-01, TE7-01, DESIGN7-01, MINA | **Segmented unit groups clip their outward keyboard focus shadow.** Add a complete high-contrast internal focus treatment to both desktop and mobile segments without losing joined corners, and cover the first/last buttons in both placements. |
| AG7-05 | Medium / High | `src/components/TimelineSelector.tsx:132-139,481-483,550-680`; `e2e/travelback.spec.ts:1499-1539`; VR7-02, TE7-02, DESIGN7-02, MINA | **Timeline thumbs announce only a percentage instead of the selected localized date/time.** Include the resolved endpoint date/time in `aria-valuetext` when timestamps exist, retain a percentage fallback for timeless tracks, and assert initial plus keyboard-updated localized values. |
| AG7-06 | Low / High | `src/components/SceneEditor.tsx:40-44,353-402,518-520,643-660`; TRACE7-01, DB7-01 | **Serial scene-warning replacement reinterprets placeholder-like user names.** Resolve `{name}`, `{from}`, and `{to}` against the untouched template in one pass so inserted values stay opaque; cover visible and live output for `{from}`/`{to}` names. |
| AG7-07 | Low / High | `src/components/GoogleGuide.tsx:33-64,265-270,351-363`; `public/guide/*.svg`; CRIT7-03, DOC7-01 | **English-only static diagrams bypass the already-localized Phone and Takeout illustrations.** Render localized code-native art (or equivalent locale-owned/text-free assets) and assert a non-English rendered guide instead of only dictionary parity. |
| AG7-08 | Low / High | `src/lib/parse-utils.ts:9-12`; `src/components/FileUpload.tsx:20,73-76`; `src/lib/i18n.ts:214,578,942,1306,1670`; ARCH7-04, DOC7-02 | **Import-size policy has conflicting sources of truth.** The guide and warning promise slow parsing for `100MB+`, while JSON above 100 MB and XML above 4 MB are rejected. Centralize typed size-policy metadata, derive any warning below the enforced limit, localize placeholder values, and add a policy-consistency regression. |
| AG7-09 | Low / High | `scripts/harden-static-export.mjs:90-103`; DOC7-03 | **A static-hardening comment attributes the current serialization shape to Next.js 15 although the project uses Next 16.** Describe the shape as current-repository output guarded by build/smoke assertions, without a stale major claim. |

AG7-03's geometry, hit owner, and missing browser assertion are one interaction-ownership defect. AG7-08 combines the architectural duplicated-policy root with its documentation manifestation. The Timeline percentage label itself was added in an earlier cycle; AG7-05 is the distinct missing human-readable date/time semantics. AG7-06 is a narrow interpolation edge in Cycle 6's otherwise-correct localized warning repair.

## Explicit blocked and evidence-gated carryovers

| ID | Original severity / confidence | Exact scope | Reason and exit criterion |
| --- | --- | --- | --- |
| B01 | High / High | `.github/workflows/deploy-pages.yml:26-32` | CI omits `npm test`. User-level destructive-action policy requires explicit confirmation before CI/CD modification. Exit: user explicitly authorizes the workflow edit; add the unit gate and validate syntax without dispatching or deploying. |
| B02 | Medium / High | `.github/workflows/deploy-pages.yml:8-45` | The build job inherits Pages/OIDC writes. The same explicit CI/CD authority boundary applies. Exit: user authorizes the edit; narrow permissions without dispatching or deploying. |
| B03 | Medium / High | `README.md:225-227`, absent root `LICENSE` | The README claims MIT, but intended license, copyright holder, and year/range are unknown. Exit: the owner supplies exact legal intent and attribution. |
| B04 | Medium / Medium | `src/components/MapView.tsx:920-930` | Always-on `preserveDrawingBuffer` cost lacks representative low-end/mobile GPU, memory, battery, and thermal evidence. Exit: record comparative p50/p95 frame time and memory plus battery/thermal observations, then isolate capture only if material. |

## Existing performance deferrals

- **D01 — High/High:** root-owned playback progress commits broad React state per foreground frame (`src/lib/usePlaybackController.ts:98-155`; `src/app/page.tsx:173-232,577-595`). Exit: profile representative tracks, then isolate frame-frequency ownership while preserving seek, camera, scenes, and export.
- **D02 — Medium/High:** elevation SVG strings contain every sample (`src/components/ElevationProfile.tsx:20-60,91-133`). Exit: profile near the supported point ceiling and implement distance-aware downsampling with endpoint/extrema guarantees. AG7-02's correctness-only gap representation does not perform this redesign.
- **D03 — Medium/High:** each waypoint drag move performs an O(n) route-distance scan (`src/components/JourneyCreator.tsx:197-201,372-381`). Exit: measure and use incremental adjacent-segment updates or a throttled preview with exact terminal reconciliation.
- **D04 — Medium/High:** export performs a second idle check for every captured frame (`src/lib/useExportController.ts:181-240`; `src/lib/videoEncoder.ts:223-268`). Exit: profile real exports and prove redundant waiting before changing capture correctness.

## Cross-review agreement and rejected hypotheses

Code, critic, and architecture independently converged on AG7-01 and AG7-02. Code, critic, architecture, verifier, test, designer, and traveler roles converged on AG7-03 after exact hit testing overturned an earlier source-only rejection. Verifier, test, designer, and traveler roles converged on AG7-04 and AG7-05. Tracer and debugger isolated AG7-06. Critic/documentation identified AG7-07; architecture/documentation identified AG7-08; documentation identified AG7-09. Security rechecked all trust boundaries without a new issue; performance found only B04/D01-D04.

The wrapper port-reservation release window was rejected as unproven because no collision was reproduced. Repeated map-Retry loss and stale superseded-style callbacks were rejected by current ownership guards, bundled local styles, and existing coverage. Environment-local extraneous optional WASM packages were not tracked dependency defects. The Help candidate was not accepted from source geometry alone; it became AG7-03 only after the exact current-source browser proved complete overlap and wrong hit ownership.

## Agent and process notes

All twelve required artifacts completed with no agent failure. No deployment, CI/CD mutation, production action, deletion, or pre-existing process/port action occurred. Cycle 7 added `/tmp/travelback-cycle7-browser-state.json`, `/tmp/travelback-cycle7-a11y-baseline.txt`, and `/tmp/travelback-cycle7-static-server.mjs` to the durable user-injected final-cleanup inventory. None was deleted, and cleanup remains reserved for the loop's final stop condition after provenance and primary-worktree health are reverified.
