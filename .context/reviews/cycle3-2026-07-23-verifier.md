# Cycle 3 verifier review — 2026-07-23

Revision: `7f013a2` (`review-plan-fix/no-deploy-20260723`).

## Verification verdict

Two current contracts fail by direct source/layout proof. A third responsive
focus contract has a confirmed state/visibility mismatch and needs a permitted
browser run to pin down the user-agent focus endpoint.

| Root | Contract | Verdict | Verification |
|---|---|---|---|
| C3-UX-01 | Every More-dialog control remains reachable at supported viewports. | **Fail — confirmed** | At 844×390, the popup starts near y=68 and has a conservative 392px minimum height, but only 322px remains. It has neither `max-height` nor `overflow-y`, while the page and app root suppress page scrolling (`TrackToolbar.tsx:200-317`; `globals.css:19-25,351-363`; `page.tsx:604`). |
| C3-STATE-02 | A new export begins with outcome messages belonging only to that export. | **Fail — confirmed** | `shareError` is set at `ExportPanel.tsx:226-243` and reset only by another Share. Export Again calls `resetExportSession` without unmounting the open panel (`page.tsx:493-495,711-727`), so the next `done` render exposes the previous warning (`ExportPanel.tsx:335-394`). |
| C3-A11Y-03 | Switching responsive toolbar modes cannot leave focus/state in hidden UI. | **Fail at state/DOM boundary; focus endpoint unverified** | `menuOpen` installs the focus trap at `TrackToolbar.tsx:53-122`, while visibility is independently changed by `sm:hidden` and the wide-short override (`TrackToolbar.tsx:200`; `globals.css:351-363`). No viewport listener closes or transfers ownership. |

## Reproduction specifications

### C3-UX-01

1. Load any track at 844×390.
2. Open More controls.
3. Inspect the Language selector and Theme control.
4. Assert each bounding box is inside the visual viewport and
   `elementFromPoint` resolves to the intended control.
5. Tab through every item and assert the focused item is visible; if the panel
   scrolls, assert its scroll position follows focus.

This should fail before the fix. The existing 844×390 coverage at
`e2e/travelback.spec.ts:1588-1645` never opens the popup.

### C3-STATE-02

1. Stub `canShare` so the one-byte capability probe passes but the exported MP4
   fails, matching `e2e/travelback.spec.ts:3232-3260`.
2. Export, press Share, and observe the warning.
3. Press Export Again and complete another export in the same open dialog.
4. Before pressing Share for export two, assert no Share warning exists.

This crosses two existing tests that currently stop before the survivor can be
observed (`travelback.spec.ts:3089-3140,3232-3260`).

### C3-A11Y-03

Open More at 390×844, focus an internal action, then change to a regular
`sm`-and-up viewport not covered by the wide-short override. Assert the popup
closes, `aria-expanded` becomes false, and a visible toolbar control owns focus.

## Coverage and exclusions

I inspected the complete repository inventory (66 `src`, 11 `scripts`, 21
`e2e` files), configuration/workflow/public inputs, current rules, Cycle 2
aggregate/plan, P01 deferrals, and historical reports. This avoided recycling
the completed Cycle 2 findings or old generic mobile-menu focus findings.

I did not execute tests: the repository permits only its one orchestrated
Playwright run for this next-cycle pass, and this review assignment forbids
browser/E2E work. The verdicts above are source/layout proofs, not claims of a
fresh runtime pass.

## Browser/process ownership

I started no browser, Playwright process, or server. PID/PGID 11952 and the
reported Chrome profile were not launched by this review, so I left that
foreign tree untouched. At final read-only inspection, the supplied PIDs were
absent and 3099/4173/4183 had no TCP listener. No cleanup action, deployment,
commit, push, or source mutation occurred.
