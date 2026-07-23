# Cycle 3 critic review — 2026-07-23

Revision reviewed: `7f013a2` on `review-plan-fix/no-deploy-20260723`.

## Result

I found two confirmed, still-actionable roots and one source-confirmed
responsive-state mismatch whose focus consequence needs a browser check. None
duplicates the Cycle 2 aggregate, its 13 completed fixes, or the three explicit
P01 platform boundaries.

## Inventory and method

I inventoried the repository before reviewing: 66 files under `src/`, 11 under
`scripts/`, 21 under `e2e/`, the GitHub workflow, package/TypeScript/Next/Vitest
configuration, public fixtures/assets, current project rules, the Cycle 2
aggregate and implementation plan, the P01 deferral record, and relevant
historical reviews. I traced current import, playback, camera, scene, export,
worker, build, process-supervisor, and responsive-toolbar flows across their
callers and tests.

The repository's permanent next-cycle constraint permits only its single
orchestrated Playwright run, and this assignment expressly excluded
browser/E2E work. I therefore used source, CSS, DOM, unit/E2E-test coverage, and
accepted Cycle 2 gate evidence; I did not start a server or browser.

## Findings

### C3-UX-01 — More controls cannot fit in the supported 844×390 viewport

- Severity: Medium
- Confidence/status: High / Confirmed from deterministic layout constraints
- Evidence: `src/components/TrackToolbar.tsx:200-317`,
  `src/app/globals.css:19-25,351-363`, `src/app/page.tsx:604`,
  `e2e/travelback.spec.ts:1588-1645`

The 844×390 short-landscape rule intentionally hides the wide actions and
forces `.track-toolbar-overflow` back to `display: block`. Its popup opens below
the 44px trigger at approximately y=68, but it has no viewport-relative
`max-height` or vertical scrolling.

Even ignoring both visible labels and the screen-reader heading, the popup's
minimum content is 392px tall:

- four 44px action buttons plus three 8px gaps: 200px;
- units, locale, and theme controls at 44px each: 132px;
- 24px panel padding and at least 36px between the four visible sections: 60px.

Only 322px remains below y=68 in a 390px viewport. The actual panel is taller
because Units and Language labels also occupy space. The app root and page are
both `overflow: hidden`, so the bottom language/theme controls cannot be
recovered by page scrolling. Keyboard trapping can also move focus to controls
that are outside the visible viewport.

The short-landscape E2E matrix validates map controls and the bottom stack, but
does not open More and assert every terminal control's viewport/hit ownership.

Suggested fix: give the popup a safe-area-aware
`max-height: calc(100dvh - <measured top> - <bottom inset>)` and
`overflow-y: auto`/overscroll containment, or position it within a bounded
popover layer. Add 320×480 and 844×390 tests that open More and prove Help,
Language, Theme, and the last focusable item are visible, scrollable, and
hit-owned without document overflow.

### C3-STATE-02 — A failed Share warning survives Export Again and contaminates the next result

- Severity: Low
- Confidence/status: High / Confirmed by state and ownership trace
- Evidence: `src/components/ExportPanel.tsx:226-243,335-394`,
  `src/app/page.tsx:489-495,711-727`,
  `src/lib/useExportController.ts:120-125`,
  `e2e/travelback.spec.ts:3089-3140,3232-3260`

`shareError` is cleared only at the beginning of another Share attempt. After
an actual-file `canShare` failure, Export Again invokes the controller reset but
keeps the same open `ExportPanel` instance mounted. The idle form hides the
warning without clearing it. When the second export reaches `done`, the old
“Sharing failed” alert reappears before the user has tried to share the new
video.

The existing tests separately cover one Share failure and Export Again, so the
cross-state survivor is not asserted. On wider layouts, the alert is also a
fourth child of a non-wrapping flex row; `col-span-full` has no effect in flex
layout.

Suggested fix: clear the warning when leaving `done`, on reset/start, or when
the exported blob identity changes. Render the alert outside the action row (or
give that row an intentional wrapping/full-basis layout). Add a regression:
failed Share → Export Again → second successful export → no Share alert until
the second Share attempt.

### C3-A11Y-03 — An open More dialog is not reconciled when CSS switches toolbars

- Severity: Medium
- Confidence/status: Medium-high / State and DOM mismatch confirmed; exact
  browser focus outcome needs manual confirmation
- Evidence: `src/components/TrackToolbar.tsx:53-59,72-122,137-223`,
  `src/app/globals.css:351-363`, `src/components/TrackToolbar.test.ts:62-107`

`menuOpen` is changed only by the trigger, outside interaction, Escape, or an
action. There is no `matchMedia`/resize reconciliation. Moving from a mobile or
wide-short layout to a regular `sm`-and-up layout can apply `sm:hidden` to the
entire open-menu wrapper while `menuOpen` stays true and focus was deliberately
moved into its panel. The desktop actions appear, but no visible control
receives focus and the document-level trap/escape listener remains installed.

Suggested fix: make the responsive mode an owned input (for example,
`matchMedia`) and close the popup on a transition to the desktop toolbar,
handing focus to the corresponding visible action or another stable toolbar
control. Add a dynamic viewport test with the popup open, not just independent
static viewport cases.

## Missed-issue sweep

- I did not relabel prior mobile-menu semantics/focus-trap defects; those were
  already fixed. C3-A11Y-03 is specifically the unhandled live breakpoint
  transition.
- I did not relitigate supervisor identity erasure, pidfd signalling, or marker
  recovery. No new pre-fix regression or survivor evidence met the P01 bar.
- I found no new actionable survivor in parser ordering, worker parity,
  antimeridian geometry, preview/export target calculation, DPR restoration,
  MP4 structural validation, sample-load ownership, CI dev-graph auditing, or
  Korean Google Timeline guidance.

## Process hygiene

I launched no agent-browser, Chrome, Playwright, or app-server process. The
reported PID/PGID 11952 browser tree and its temporary profile were therefore
not mine and I did not signal or close it. A final read-only check found none of
the supplied PIDs and no listener on 3099, 4173, or 4183. No deployment,
commit, push, source edit, or test run was performed.
