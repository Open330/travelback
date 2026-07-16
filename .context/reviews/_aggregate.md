# Aggregate Review — Travelback (2026-07-16, Cycle 2)

## Outcome

All twelve required role reviews completed against `cc6f24f`, were read independently, and passed `git diff --check`. The reports contain 60 role-level entries, most of which corroborate the same state, rendering, security, or product boundaries. After deduplication, this aggregate retains **19 new confirmed findings**: 1 High, 9 Medium, and 9 Low. Four unresolved cycle-1 items remain explicitly separated as authority-, input-, or evidence-gated carryovers. No deployment was attempted.

Fresh review evidence:

- `npm run lint`, `npm run typecheck`, `npm run test` (266/266), `npm audit --audit-level=high` (zero vulnerabilities), `npm run build`, the generated-worker drift check, and `npm run smoke:static` passed.
- Targeted Playwright journeys passed 7/7 for GPX, KML, and the five documented Google JSON families.
- Desktop and iPhone-emulated browser review covered landing, recovery, playback, scenes, export, dialogs, theme, locale, reduced motion, console/page errors, and network behavior.
- Fresh emitted HTML reproduced the CSP-order defect; actual mobile touch and export-focus journeys reproduced their respective product defects.

## Deduplicated new findings

### Runtime correctness, lifecycle, and accessibility

| ID | Severity / confidence | Evidence | Finding and required outcome |
| --- | --- | --- | --- |
| AG2-01 | High / High | `src/lib/map-geometry.ts:78-93`, `src/components/MapView.tsx:410-435` | **Completed-trail publication repeatedly copies and reparses a growing route prefix.** A dense single-segment route produces cumulative prefix work during playback/export. Move progress onto immutable or bounded-chunk geometry and add a structural allocation/update budget test. |
| AG2-02 | Medium / High | `src/app/page.tsx:374-397`, `src/components/FileUpload.tsx:215-240,288-299` | **A stale sample request can overwrite a newer manual journey.** Give page-owned async session producers a generation/abort boundary and prove a delayed sample cannot commit after Draw Route or another import wins. |
| AG2-03 | Medium / High | `src/components/TimelineSelector.tsx:27-31,95-105,288-296,524-598` | **The distance-ratio timeline applies point-count and hard-coded percentage gaps.** Uneven tracks such as `[0,1,1000]` cannot select the first valid adjacent pair. Derive constraints in the same coordinate domain and cover uneven spacing plus plateaus. |
| AG2-04 | Medium / High | `src/lib/videoEncoder.ts:65-69,232-235`, `src/lib/useExportController.ts:125-127,268-309` | **Finalization has neither a deadline nor signal race.** Cancel/Escape cannot release the app from a never-settling `Output.finalize()`. Add bounded abort/timeout behavior, a distinct error contract, post-result abort checks, and never-resolving-finalizer tests while respecting Mediabunny's documented finalizing state. |
| AG2-05 | Medium / High | `src/components/SceneEditor.tsx:376-390`, `src/lib/camera.ts:25-49` | **Undoing a deleted scene can normalize away a newer range edit.** Restore into the currently available gap or reject the conflicting undo with feedback; never rewrite later work as an indirect side effect. |
| AG2-06 | Medium / High | `src/components/TimelineSelector.tsx:22-23,141-153,345-354` | **A three-second global key guard suppresses unrelated controls.** Remove the time-wide capture listener and contain keyboard events at the originating timeline handle. Add a cross-control focus regression. |
| AG2-07 | Medium / High | `src/components/SceneEditor.tsx:338-349,489-492,532-545,655-735` | **A normal leftward mobile slider drag dismisses the Scene Editor.** Scope swipe dismissal to a dedicated header/handle and verify every horizontal scene control remains open during real touch drags. |
| AG2-08 | Medium / High | `src/lib/useExportController.ts:63,84-92`; [React StrictMode effect behavior](https://react.dev/reference/react/StrictMode); [Next App Router default](https://nextjs.org/docs/app/api-reference/config/next-config-js/reactStrictMode) | **The export mounted flag stays false after Strict Mode's setup-cleanup-setup probe.** The cleanup sets `mountedRef.current = false`, but setup never restores it, so dev error/cancel cleanup is skipped. Mirror `usePlaybackController` by setting the flag true in effect setup and regression-test the lifecycle where practical. |
| AG2-09 | Low / High | `src/components/SceneEditor.tsx:124-181` | **Scene range drag lacks pointer-cancellation cleanup.** Route `pointerup`, `pointercancel`, lost capture, and blur through one idempotent finish/cancel boundary so a cancelled gesture cannot leave stale drag state. |
| AG2-10 | Low / High | `src/components/ExportPanel.tsx:176-203,287-300` | **Share can silently do nothing for the actual MP4.** If `canShare` rejects the real file after the tiny capability probe passed, surface the existing localized fallback instead of returning without feedback. |
| AG2-11 | Low / High | `src/lib/googleJsonParser.ts:317-345`, `src/lib/parser.test.ts:634-637` | **Valid JSON `null` leaks an accidental `TypeError`.** Validate the parsed root and return an intentional `ParseError` code in direct and worker paths; tighten the permissive test oracle. |
| AG2-12 | Low / High | `src/components/ExportPanel.tsx:241-303`, `src/components/ModalDialog.tsx:93-167` | **Export completion drops focus to `BODY`.** Focus the success heading or first result action when the form subtree is replaced and assert focus stays inside the dialog. |

### Static security and dependency baseline

| ID | Severity / confidence | Evidence | Finding and required outcome |
| --- | --- | --- | --- |
| AG2-13 | Medium / High | `src/app/layout.tsx:60-70`, `scripts/harden-static-export.mjs:125-173`, `scripts/smoke-static.mjs:135-195`, fresh `out/*.html` | **The emitted CSP meta appears after five to seven scripts.** Relocate the hardened meta to the earliest valid head position and assert it precedes active content in every emitted HTML document. |
| AG2-14 | Low / High | `package.json:24-45`, `package-lock.json` plus npm registry on 2026-07-16 | **The deterministic dependency baseline violates the repository's latest-stable rule.** Update compatible packages, align `@types/node` to Node 24, validate current stable TypeScript/ESLint/Lucide majors, refresh the lock, and rerun the complete gate matrix. This is maintenance freshness, not a vulnerability finding; the current audit is clean. |

### Product copy and executable documentation

| ID | Severity / confidence | Evidence | Finding and required outcome |
| --- | --- | --- | --- |
| AG2-15 | Medium / High | `.context/project/02-architecture.md:19,59-60,69,75-77,155-165`, `src/lib/videoEncoder.ts:99-107` | **The architecture reference materially misdescribes five current paths.** Correct the guide label, VideoSample/CPU-staging pipeline, repaint semantics, trail complexity, and trail-head inventory together with the stale source comment. The complexity correction must reflect AG2-01's implementation rather than merely relabeling the defect. |
| AG2-16 | Low / High | `src/lib/i18n.ts:186,546,906,1266,1626`; current official Google Takeout help | **All locales promise an unsupported Takeout completion window.** Replace the numeric estimate with an instruction to wait for Google's completion email. |
| AG2-17 | Low / High | `README.md:138`, `src/styles/vitro-base.css:1-5,225-245` | **README calls an adapted stylesheet an exact upstream copy.** Describe it as vendor-derived/adapted so maintainers do not overwrite Travelback-specific accessibility and theme work. |
| AG2-18 | Low / High | `src/lib/i18n.ts:478,974,1198` | **Three shipped locale strings contain duplicated or missing grammar.** Correct the Korean, Japanese, and Chinese phrases and keep locale-key parity green. |
| AG2-19 | Low / High | `README.md:222` | **The Mediabunny acknowledgement links to a 404.** Point it to the canonical `Vanilagy/mediabunny` repository. |

## Carried-forward authority, input, and evidence boundaries

These remain current but are not counted as new cycle-2 findings:

| ID | Original severity / confidence | Exact scope | Reason and exit criterion |
| --- | --- | --- | --- |
| CARRY-01 | High / High | `.github/workflows/deploy-pages.yml:26-32` | CI omits `npm test`. User-level destructive-action policy requires explicit confirmation before CI/CD modification. Exit: user authorizes the workflow edit; add the unit gate and validate without dispatch/deploy. |
| CARRY-02 | Medium / High | `.github/workflows/deploy-pages.yml:8-45` | Build inherits Pages/OIDC write permissions. Same CI/CD authority block. Exit: explicit authorization; narrow top-level/build permissions and grant writes only to deploy. |
| CARRY-03 | Medium / High | `README.md:224-226`, absent root `LICENSE` | Intended license, holder, and year/range are unknown. Exit: user supplies exact legal intent/attribution, then add the grant or explicitly correct the README claim. |
| CARRY-04 | Medium / Medium | `src/components/MapView.tsx:586-591` | `preserveDrawingBuffer` impact needs representative low-end/mobile hardware evidence; emulation cannot establish GPU, battery, or thermal cost. Exit: record comparative p50/p95 frame time and memory, then isolate export capture if material. |

No correctness, security, accessibility, or data-loss item is deferred for convenience. The four carryovers are separated only because repository authority/input/evidence rules prevent a responsible implementation in this cycle.

## Cross-review agreement

The strongest agreement was on the stale sample transaction, distance/index timeline mismatch, unbounded finalization, completed-prefix amplification, CSP ordering, scene undo conflict, mobile slider dismissal, parser null contract, and export focus loss. Actual browser evidence corroborated the mobile gesture and focus defects; fresh emitted artifacts corroborated CSP placement. The suspected stale manual-journey name was disproved by the component's conditional unmount/remount and is intentionally excluded.

## Agent failures

None. All twelve required role artifacts were produced at their exact paths.
