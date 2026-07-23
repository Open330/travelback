# Cycle 3 tracer review — 2026-07-23

Revision traced: `7f013a2`.

## New cross-file traces

### C3-UX-01 — short-landscape More controls leave the viewport

```text
844×390 viewport
  → globals.css:355-363 hides wide toolbar actions and displays overflow trigger
  → TrackToolbar.tsx:200-223 opens a 288px-wide popup below the trigger
  → four actions + units + locale + theme impose >392px panel height
  → only ~322px exists below the popup's y≈68 origin
  → globals.css:19-25 and page.tsx:604 prevent document/app scrolling
  → terminal controls paint outside the usable viewport with no panel scroll
```

Status: **Confirmed**, severity Medium, confidence High.

The lower bound ignores visible labels, so it does not depend on font metrics:
four 44px buttons plus gaps are 200px; the three terminal controls contribute
132px; panel padding and visible-section gaps contribute at least 60px. The E2E
short-landscape geometry flow (`e2e/travelback.spec.ts:1588-1645`) traces map
controls but never opens this popup.

Fix boundary: `TrackToolbar` must own a safe-area-aware available height and an
internal scroll container. The regression should trace visibility, hit
ownership, document overflow, and keyboard focus through the last item at
320×480 and 844×390.

### C3-STATE-02 — Share failure crosses export-session ownership

```text
export 1 reaches done
  → Share actual-file capability fails
  → ExportPanel.tsx:226-243 sets local shareError=true
  → Export Again invokes page.tsx:493-495
  → useExportController.ts:120-125 resets export data only
  → showExport remains true, so page.tsx:711-727 preserves ExportPanel instance
  → idle branch merely hides shareError
  → export 2 reaches done
  → ExportPanel.tsx:389-393 renders export 1's warning before export 2 Share
```

Status: **Confirmed**, severity Low, confidence High.

The controller correctly owns media/session state, while the panel owns the
Share outcome. The missing lifecycle handoff is therefore in `ExportPanel`:
clear the local outcome on reset/start, on leaving `done`, or when blob identity
changes. Cross the existing Export Again and Share-failure tests in one
regression.

### C3-A11Y-03 — popup state outlives its responsive rendering mode

```text
menuOpen=true
  → useFocusFirstOnOpen moves focus into menuPanelRef
  → document keydown trap remains installed
  → viewport enters normal sm-and-up mode
  → sm:hidden removes the entire track-toolbar-overflow wrapper
  → no effect observes that media-query transition
  → menuOpen/aria ownership/listeners still describe an open popup
```

Status: **State/DOM mismatch confirmed; exact browser focus endpoint likely**,
severity Medium, confidence Medium-high.

This is narrower than the previously fixed mobile-menu focus trap and focus
return work. The missing owner is responsive-mode reconciliation. Close and
transfer focus to a visible toolbar target when the rendered mode changes, then
test a live resize with the popup open.

## Trace sweep

I inventoried and followed the 66 `src`, 11 `scripts`, and 21 `e2e` files plus
workflow/config/public inputs, current rules, Cycle 2 disposition, and P01
boundary plan. No additional new survivor cleared the evidence bar in:

- GPX/KML/Google import and worker parity;
- track trimming, playback, scenes, or shared camera targets;
- antimeridian/world-copy bounds and DPR restoration;
- export cancellation, blob URL cleanup, MP4 box/media validation;
- sample-load intent, CI graph audit, or supervised process cleanup.

I did not retry the explicit P01 platform boundaries without the required
pre-fix failing regression and exact post-fix survivor proof.

## Execution/process note

No browser or E2E execution was allowed or performed. I did not launch the
reported PID/PGID 11952 agent-browser tree, any Chrome profile, Playwright, or a
server and therefore did not touch that foreign ownership domain. The final
read-only process/listener check found the supplied PIDs absent and ports
3099/4173/4183 clear. There was no deployment or code mutation.
