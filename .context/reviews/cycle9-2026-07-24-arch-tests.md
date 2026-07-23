# Cycle 9 architecture, verification, test, and documentation review — 2026-07-24

Target: `0c7eb7cb0d9265797327c343684d27ad27fdfdfa`
Branch: `review-plan-fix/no-deploy-20260723`
Roles: architect, verifier, test engineer, document specialist
Status: **provisional**
Outcome: **2 genuinely new Cycle 9 causal roots**

## Review inventory

The exact target contains 1,049 tracked paths. The review-relevant inventory
included:

- all 69 `src/` paths: 42 production/source/style/binary paths and all 27
  Vitest files;
- all 17 production components, all library modules, the application shell,
  shared types/styles, the parser-worker source, and its generated public
  artifact;
- all 12 script/process-fixture paths, both Playwright configurations, and
  Next/Vitest/TypeScript/ESLint/PostCSS configuration;
- `package.json`, `package-lock.json`, `.gitignore`, and the Pages workflow;
- all 21 E2E paths: the 3,894-line browser specification, MP4 validator, and
  all 19 data fixtures;
- all 19 published assets: the generated worker, five map themes, sample GPX,
  font/style payloads, guide illustrations, icons, and landing preview; and
- `README.md`, the active project/development documents, the active/deferred
  plan index and user-injected ledger, Cycle 1–8 reports and implementation
  plans, and the separate `plan/` history.

Cross-file traces covered import bytes through XML/JSON preflight, worker
transport and parser budgets, session replacement, interpolation and wrapped
renderer geometry, map/style/locale generations, playback, trimming, scene
transactions, Journey Creator, export leasing/frame rendering/finalization/
save/recovery, localization and preference hydration, modal/focus ownership,
static hardening/serving, CI, and supervised E2E process ownership.

## Findings

### ATD9-01 — Large-card social metadata has no image

- **Severity:** Low
- **Confidence:** High
- **Status:** Confirmed source, published-asset, documentation, and test
  contract defect
- **Source:** `src/app/layout.tsx:24-37`
- **Published assets:** `public/landing-preview.svg:1-47`
- **Documentation:** `.context/project/01-overview.md:55,100`
- **Missing regression boundary:** `scripts/smoke-static.mjs:141-273,438-475`

#### Causal trace

The root layout declares Open Graph text metadata and selects
`twitter.card: 'summary_large_image'`, but neither `openGraph` nor `twitter`
declares an `images` entry. The application also has no convention-owned
`opengraph-image.*` or `twitter-image.*` file. The authored
`public/landing-preview.svg` is referenced by the landing UI, not by metadata,
so it does not cause Next to emit `og:image` or `twitter:image`.

This is historically distinct from the old metadata/base-path work, which
fixed `metadataBase`, `openGraph.url`, and icon URLs. Searches across prior
reviews, plans, and git history found no record of the absent social image
contract.

#### Failure scenario

When a crawler requests the deployed page after a link is pasted into a
social or messaging service, the generated head supplies a large-card type
but no preview image URL. The service therefore cannot render the promised
branded large preview and may fall back to a text-only card. This also makes
the project overview's “Full metadata for social sharing” claim false.

#### Fix

Add a crawler-compatible social preview asset (preferably a 1200×630 raster
with useful alt text) and wire the same base-path-safe absolute URL into both
`openGraph.images` and `twitter.images`, or use Next's corresponding
file-convention assets. Keep the public documentation claim only after the
generated static head carries the complete contract.

#### Regression test

Extend the static-output smoke check to inspect the generated/served head and
assert:

1. `twitter:card` remains `summary_large_image`;
2. nonempty `og:image` and `twitter:image` tags resolve beneath the configured
   production base path;
3. width, height, and alt metadata are present; and
4. the referenced asset returns 200.

Exercise the assertion for the default `/travelback` mount and the existing
root-mount configuration so a future metadata edit cannot silently drop or
mis-prefix the image.

### ATD9-02 — Export cleanup documentation still describes the pre-snapshot contract

- **Severity:** Low
- **Confidence:** High
- **Status:** Confirmed authoritative documentation and inline-contract defect
- **Documentation:** `.context/project/02-architecture.md:46-84,148-159`
- **Stale inline guidance:** `src/lib/useExportController.ts:369-389`
- **Current source of truth:** `src/lib/map-export-presentation.ts:25-96`;
  `src/components/MapView.tsx:373-409,494-510`
- **Existing behavioral proof:**
  `src/lib/map-export-presentation.test.ts:88-219`

#### Causal trace

The architecture guide says `resetSize()` clears `width` and `height` inline
styles and restores the container to its natural dimensions. Controller
comments repeat the clear-to-natural model. That was the older cleanup
contract.

Cycle 5 replaced it with an export-presentation transaction:

- the first resize captures the exact pre-export inline width and height;
- automatic versus explicit pixel-ratio ownership is captured;
- a Follow-off camera pose is captured under manual ownership;
- cleanup restores the captured dimensions, releases or restores DPR
  ownership, resizes the map, and conditionally restores the manual camera.

Only the no-snapshot fallback clears dimensions. The documentation was not
updated when that ownership model landed. Prior Cycle 7 documentation work
corrected session ingress and toolbar ownership, not this export transaction.

#### Failure scenario

A maintainer following the authoritative guide can treat cleanup as a simple
style clear and omit the DPR/camera portions of the transaction. In a reused
container with pre-existing inline dimensions or with Follow disabled, that
model would discard the original layout and leave export-owned presentation
state behind. The current implementation avoids the regression, but its
documentation teaches the wrong invariant and hides the state that
`resetSize()` actually owns.

#### Fix

Rewrite the export pipeline/cleanup section to describe capture, apply, and
restore as one presentation lease. State the restoration order and distinguish
the captured-snapshot path from the no-snapshot teardown fallback. Update the
controller comments to say “restore the captured presentation” rather than
“clear container style.”

#### Regression test

No new runtime behavior is required for the documentation repair. Keep the
existing map-presentation cases that prove:

- exact original inline dimensions are restored;
- automatic DPR ownership is released with `setPixelRatio(null)`;
- explicit DPR overrides are restored; and
- manual camera state is restored only when ownership still permits it.

The focused review run executed this suite together with locale/i18n ownership
checks: 3 files and 38 tests passed. Review the edited prose directly against
those assertions and `MapView.resetSize()` in the documentation patch.

## Test-engineering result

All 27 Vitest files were mapped to their current production owners. The
inherited exact-HEAD baseline is 616 unit/component tests plus 40 process
supervisor tests, with two 118-case development/static E2E catalogues. Every
relevant test name, fixture family, retry/skip boundary, and real-MP4 contract
was inspected statically. No missing coverage was promoted unless it exposed a
current distinct defect; ATD9-01 is that one gap.

The process-supervisor implementation and its 40-case catalogue still cover
normal/nonzero exits, forwarded signals, detached and markerless descendants,
snapshot failures, sparse cleanup polling, final marker discovery, diagnostic
composition, startup rollback, Windows containment refusal/providers, spawn
errors, and validated Next-lock reuse. No deterministic new survivor path was
found. The three native/host capability residuals remain exactly the recorded
Cycle 2 boundaries and were not relitigated.

## Historical deduplication

Cycle 1–8 reports, plans, and implementation commits were searched before
counting candidates. This review did not recount:

- Cycle 8 MapLibre locale synchronization;
- Cycle 7 bounded import collection, parser/worker parity, Unicode filename
  truncation, or the session-ingress/toolbar architecture correction;
- Cycle 6 GPX fallback, obsolete wrapped-geometry retention, Scene Editor
  settlement, or semantic no-op export preservation;
- Cycle 5 export camera ownership, export recovery settlement, parser
  ownership, interpolation bounds, duration drafts, or process-lock evidence;
- earlier import/export races, parser lexical limits, world-wrap rendering,
  session/camera recovery, localization, modal/accessibility, static-serving,
  and supervised-process repairs; or
- the three explicit platform-capability residuals in
  `.context/plans/deferred-p01-platform-boundaries-cycle2-2026-07-23.md`.

## Safe checks and final missed-file sweep

Only review-safe checks were run:

- `npm run check:worker` — generated worker is current;
- `git diff --check` — clean before this report;
- focused ESLint on the finding-adjacent source/config files — passed; and
- focused Vitest on map-presentation, map-locale, and i18n contracts — 3 files,
  38 tests passed.

The closing sweep rechecked generated parity, metadata and public-asset
reachability, source/document claims, unbounded collection operations,
timers/listeners/rAF cleanup, object URLs, map sources/layers, async
invalidation, modal/portal ownership, skips/retries, external origins,
base-path construction, CSP, workflow gates, and all inventory categories.
No third historically distinct actionable root survived.

No full unit/process suite, supervisor fixture, E2E, Playwright,
Chromium/browser, development/static server, build, deploy, process signal,
commit, or push was run by this workstream.
