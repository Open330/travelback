# Document Specialist Review — review-plan-fix cycle 1/100

Scope: documentation-code mismatches against local authoritative sources. I inspected `.context/project`, `.context/development`, `.context/plans`, current `plan/` files, review aggregates, package scripts/configs, and UI text-bearing implementation files. No implementation fixes were made.

## Findings

### DOC-001 — Architecture still documents a removed Journey Creator label layer
- **Doc:** `.context/project/02-architecture.md:140-149`
- **Source:** `src/components/JourneyCreator.tsx:20-23`, `src/components/JourneyCreator.tsx:160-209`, `src/components/JourneyCreator.tsx:211-219`
- **Mismatch:** The architecture layer table lists `journey-points-labels` as a `symbol` layer for numbered waypoint labels, but Journey Creator only defines `journey-line` and `journey-points`; `addLayers()` adds a line layer and a circle layer, and cleanup only removes those two. This also conflicts with the local glyphless/static-map direction behind removing symbol layers.
- **Failure scenario:** A developer or reviewer trying to verify "numbered labels on waypoints" will look for a layer that cannot exist, or reintroduce a MapLibre symbol layer that violates the bundled glyphless map-style constraint guarded by `scripts/smoke-static.mjs`.
- **Suggested fix:** Remove the `journey-points-labels` row, or replace it with the current circle-marker behavior and mention that numeric labels are intentionally not rendered as a MapLibre symbol layer.
- **Severity / confidence:** Medium / High

### DOC-002 — `.context/plans/README.md` is no longer a reliable active/deferred plan index
- **Doc:** `.context/plans/README.md:1-5`
- **Source:** `.context/plans/cycle-r8-implementation-2026-04-23.md:23-29`, `.context/plans/deferred-findings-cycle-r8-2026-04-23.md:1-13`, `plan/deferred-cycle1-review-plan-2026-04-24.md:1-5`
- **Mismatch:** The README claims the active plan set is only the two 2026-04-19 deferred files. Current local plan sources include later `.context/plans/deferred-findings-cycle-r4` through `r8` carryovers and the active review-plan-fix deferred record under `plan/deferred-cycle1-review-plan-2026-04-24.md`.
- **Failure scenario:** A future cycle using `.context/plans/README.md` as the index can miss active 2026-04-23 and 2026-04-24 deferred work, reopening already-triaged items or silently dropping carryovers.
- **Suggested fix:** Update the index to distinguish historical `.context/plans` waves from the active `plan/` review-plan-fix lane, and list the latest carryover snapshot files.
- **Severity / confidence:** Medium / High

### DOC-003 — Cycle 10 plan says all deferred items are low severity, but active deferred records include high-severity items
- **Doc:** `plan/cycle10-plan.md:37-41`
- **Source:** `plan/deferred-cycle1-review-plan-2026-04-24.md:14-47`, `plan/cycle2-c2-plan.md:90-104`
- **Mismatch:** The cycle 10 convergence assessment says "All deferred items have LOW severity," while the active deferred record contains `High / High` items for large XML parsing, trail rendering, overview bounds, and export memory limits, plus `Medium / High` parser-worker items in the cycle 2 plan.
- **Failure scenario:** A planner could downgrade follow-up risk based on the cycle 10 summary and defer high-risk performance/memory work without preserving the original severity required by the repo's deferred-fix rules.
- **Suggested fix:** Correct the convergence note to say later convergence applied only to that cycle's new findings, and explicitly exclude earlier high/medium deferred records or restate their severities.
- **Severity / confidence:** Medium / High

### DOC-004 — E2E reviewer instructions overstate export execution coverage
- **Doc:** `.context/agents/non-tech-traveler-reviewer.md:51-59`, `.context/agents/non-tech-traveler-reviewer.md:82-101`
- **Source:** `e2e/travelback.spec.ts:1111-1150`, `e2e/travelback.spec.ts:1237-1270`, `e2e/travelback.spec.ts:1274-1292`
- **Mismatch:** The reviewer doc says the full journey tests should click Start Export and verify the `'done'` state, video preview, and "Export Again" button. The current E2E suite verifies export panel semantics/options and the two "completes full journey" tests stop after asserting `Start Export` is visible; they do not execute an export or assert the success state.
- **Failure scenario:** Reviewers can report that export works end to end for KML/Google formats when CI only proves the panel opens. Regressions in encoding, download state, or the success screen can pass under the documented but absent coverage.
- **Suggested fix:** Either update the doc to describe the current coverage boundary, or add a mock/short export path and make the tests match the documented success-state assertions.
- **Severity / confidence:** Medium / High

### DOC-005 — Build/test documentation omits configured gates used by the repo
- **Doc:** `.context/project/01-overview.md:17-25`, `.context/development/01-conventions.md:52-57`
- **Source:** `package.json:10-17`, `plan/cycle1-review-plan-2026-04-24.md:74-77`
- **Mismatch:** The docs list build, dev, start, lint, Playwright, and manual testing, but omit `npm run typecheck`, `npm run smoke:static`, `npm run test:e2e:static:ci`, and the audit gate used by the current review-plan-fix completion criteria.
- **Failure scenario:** A contributor following the documented checklist can ship after `build`/`lint` while skipping typechecking, static export smoke checks, and static E2E, leaving base-path/CSP regressions undetected.
- **Suggested fix:** Add a "quality gates" block that mirrors package scripts and current plan criteria: lint, typecheck, audit, build, smoke-static, and static E2E.
- **Severity / confidence:** Medium / High

### DOC-006 — Project overview under-documents the current import guide scope
- **Doc:** `.context/project/01-overview.md:62-63`, `.context/project/01-overview.md:92`
- **Source:** `src/components/GoogleGuide.tsx:146-245`, `src/lib/i18n.ts:149-199`
- **Mismatch:** The overview describes `GoogleGuide.tsx` and the feature as a Google Takeout guide. The component now renders a broader "How to Get Your Travel Data" guide with tabs for Google phone, Google Takeout, Strava, Garmin, AllTrails, Komoot, and other apps.
- **Failure scenario:** Documentation-driven reviewers may test only Google Takeout instructions and miss stale or broken copy for non-Google import paths that are visible in the app.
- **Suggested fix:** Rename the overview entry to an import/travel-data guide and list the non-Google sources at least at a high level.
- **Severity / confidence:** Low / High

### DOC-007 — Map-style docs do not match user-facing map-style labels
- **Doc:** `.context/project/01-overview.md:88`
- **Source:** `src/lib/i18n.ts:142-147`, `src/components/TrackToolbar.tsx:114-123`
- **Mismatch:** The feature list names the five styles as Voyager, Positron, Dark Matter, Liberty, and Bright. The toolbar renders localized labels from i18n: Voyager, Light, Dark, Liberty, and Bright.
- **Failure scenario:** A test script or support note written from the docs may look for "Positron" or "Dark Matter" in the UI and fail even though the app is behaving as implemented.
- **Suggested fix:** Use the current user-facing labels in the overview, optionally noting the internal `positron` and `dark` style keys separately if useful.
- **Severity / confidence:** Low / High

## Final sweep

I did not find current mismatches in the package base-path wiring, static preview command, CSP hardening script, supported parser branches, resolution preset list, or scene-name architecture note after comparing the docs against `package.json`, `next.config.ts`, `scripts/*`, `src/lib/parser.ts`, `src/types.ts`, `src/lib/camera.ts`, and `src/components/SceneEditor.tsx`.
