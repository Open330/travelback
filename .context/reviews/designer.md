# Cycle 2 Designer Review

**Reviewed:** 2026-07-23
**HEAD:** `279f56764385eadd4d47801e08c5bfbbe118a530`
**Scope:** Current production UI, responsive CSS, interaction states, accessibility semantics, five locale dictionaries, UI/unit/E2E coverage, and the Cycle 1 implementation record.

## Outcome

The Cycle 1 visual and interaction fixes are present. The current interface is coherent in light and dark modes, the loaded workspace has a clear hierarchy, compact-height map controls no longer collide, and the Journey Creator's terminal actions remain reachable. I found **three new current-HEAD issues**: two medium onboarding/perceived-performance problems and one low-severity Korean copy inconsistency.

Previously fixed Cycle 1 findings and the three unchanged deferred items are intentionally excluded.

## Review method

- Inspected every production component involved in landing, import, map playback, scene editing, Journey Creator, export, dialogs, toasts, theme/language controls, and responsive layout.
- Inspected the relevant CSS tokens and breakpoints, translation dictionaries, UI tests, E2E scenarios, README/user-facing documentation, and the current Cycle 1 completion plan.
- Ran a focused isolated Chromium check against the current static output at `320 × 480`.
- Delayed `/sample-trip.gpx` for four seconds and inspected visible, disabled, busy, and live-region state after 500 ms.
- Did not rerun the full suite. The current-HEAD implementation record reports `113 passed, 1 skipped, 0 failed` for both dev-server and static-export E2E gates, plus `1 passed` for the required real-MP4 export gate.

## New findings

| ID | Severity | Confidence | Area | Finding |
|---|---|---:|---|---|
| DESIGN2-01 | Medium | High | Short-phone onboarding | The card is scrollable, but all own-file actions begin below the first viewport with no visible continuation cue. |
| DESIGN2-02 | Medium | High | Sample-trip loading | A delayed sample load produces no visible or announced pending state and leaves the trigger enabled. |
| DESIGN2-03 | Low | High | Korean error recovery | The rejected-file recovery sentence switches from `Google 타임라인` to the untranslated `Google Timeline`. |

### DESIGN2-01 — Own-file actions are hidden below an un-signposted internal fold

**Location:** `FileUpload`, landing layout at short heights
**Scenario:** A first-time traveler on a small phone wants to select their own GPX/KML/JSON file rather than open the demo.

At `320 × 480`, the upload card begins at `y=60`, ends at `y=472`, and has `410 px` of client height for `605 px` of content. The sample preview is visible (`y=85–220`), but:

- Browse Files is at `y=486–530`.
- Draw a route is at `y=546–590`.
- Need help finding your file? is at `y=598–642`.

The card deliberately uses internal scrolling, but the first paint ends in explanatory copy. On platforms with overlay scrollbars there is no persistent cue that the three task actions continue below it. The current short-layout E2E assertion verifies only that the toolbar and card do not overlap; it does not verify that a file action or continuation affordance is visible.

**Recommendation:** For `max-height: 40rem`, compress or progressively disclose the long format explanation and keep a compact action row sticky at the bottom of the card. At minimum, show Browse Files plus a clear “More options below” cue/gradient on first paint.

**Acceptance check:** At `320 × 480`, Browse Files is fully visible without scrolling, or an explicit continuation control is visible and keyboard/screen-reader users receive equivalent context.

### DESIGN2-02 — Sample loading has no pending feedback

**Location:** `FileUpload.handleLoadSample` and `page.handleLoadSample`
**Scenario:** The traveler taps the prominent demo preview on a slow or temporarily offline connection.

With the sample request held for four seconds, the UI after 500 ms had:

- no element with `aria-busy="true"`;
- no status/live-region message;
- no spinner;
- an enabled sample button;
- unchanged card text.

File parsing has a loading state, but the sample fetch/parser path does not expose one. Repeated taps can start replacement requests while the traveler sees no acknowledgement.

**Recommendation:** Own a `sampleLoading` state in the page, pass it into `FileUpload`, show “Loading sample trip…” in a visible `role="status"` region, set the relevant region to busy, and disable the sample trigger until completion or failure. Preserve the current generation/abort protection.

**Acceptance check:** An intercepted two-second sample request immediately shows and announces progress, prevents duplicate activation, and reliably restores the idle state after success, abort, and failure.

### DESIGN2-03 — Korean recovery copy breaks terminology consistency

**Location:** Korean `fileUpload.recoveryHint`
**Scenario:** A Korean-speaking traveler selects an unsupported file and reads the recovery advice.

The landing instructions consistently say `Google 타임라인`, while the recovery sentence says `Google Timeline`. Because both strings can appear in the same task, the switch looks unfinished and adds avoidable recognition work during an error.

**Recommendation:** Use `Google 타임라인` consistently in the Korean recovery message and add the exact recovery string to the locale regression test.

## Coverage sweep

| Area | Result |
|---|---|
| Visual hierarchy and typography | Clear hierarchy in landing, loaded workspace, panels, and dialogs; no new issue beyond the short-card fold. |
| Spacing, alignment, clipping, overlap | Current compact-height and toolbar fixes are present. Focused `320 × 480` geometry exposed DESIGN2-01. |
| Light and dark themes | Token usage and contrast-oriented fixes are consistent; no new current-HEAD defect found. |
| Loading, empty, and error states | Import, export, map-error, retry, and empty scene states are represented. Sample fetch feedback is the exception in DESIGN2-02. |
| Responsive behavior | Source/tests cover phone, tablet, desktop, short landscape, safe areas, and panel scrolling. |
| Accessibility | Main landmark, one-H1 rule, dialog focus handling, labels, keyboard paths, reduced motion, and common 44 px controls are covered. Sample progress lacks an announcement. |
| Localization and layout resilience | Five LTR locales are supported and tested for required format terms. No RTL locale is advertised, so no RTL defect is filed. Korean recovery terminology is inconsistent. |
| Perceived performance | Lazy/async work generally has feedback; the prominent sample fetch does not. |
| Documentation | User-facing import/export guidance agrees with the current product flow. |

## Process hygiene

`agent-browser` was not started because its documented cleanup operation is forbidden for this task. The focused check used an ephemeral Playwright Chromium context with no persistent profile and a repository-owned static server on unique port `43177`, contained in terminal session `20194`. Chromium closed naturally; the server was stopped through that owned terminal session. A post-run `lsof` and process scan found no listener or matching server/headless-browser process. Existing user Chrome and xylolabs processes were not signaled or modified. No protected port, deployment, commit, push, or branch change was used.
