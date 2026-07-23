# Cycle 3 design review — 2026-07-23

Revision: `7f013a2`.

## Design outcome

The core visual system remains coherent across the landing, loaded-map,
timeline, scene, and export surfaces. The completed Cycle 2 work materially
improved compact landing order, short-landscape map-control clearance, export
truthfulness, and world-copy framing. This pass found two confirmed UX defects
and one responsive accessibility mismatch:

| Root | Severity | Confidence | Design failure | Recommended correction |
|---|---:|---:|---|---|
| C3-UX-01 | Medium | High / confirmed | At 844×390 the forced More popup needs at least 392px below a y≈68 origin, but only 322px exists. It has no internal scroll and the app/page suppress scrolling (`TrackToolbar.tsx:200-317`; `globals.css:19-25,351-363`; `page.tsx:604`). Language and Theme are therefore below the usable canvas; trapped keyboard focus can also travel off-screen. | Bound the popover to the visual viewport/safe area, make its content vertically scrollable, and verify last-item visibility/hit ownership at 320×480 and 844×390. |
| C3-STATE-02 | Low | High / confirmed | After Share fails, Export Again hides but never clears the warning. The next completed video opens with the old “Sharing failed” outcome (`ExportPanel.tsx:226-243,335-394`; `page.tsx:493-495,711-727`). On desktop the alert also sits in a non-wrapping flex action row even though it uses a grid-only `col-span-full` class. | Reset the message at the export-session boundary and place it in a deliberate full-width status region below the actions. |
| C3-A11Y-03 | Medium | Medium-high | A live breakpoint change can CSS-hide an open More dialog while `menuOpen`, its trap listener, and internal focus remain owned by that hidden branch (`TrackToolbar.tsx:53-122,200-223`; `globals.css:351-363`). The DOM/state mismatch is confirmed; exact UA focus behavior awaits a permitted browser check. | Reconcile `matchMedia` mode changes in component state, close the popup, and transfer focus to a visible toolbar target. Test a resize/orientation transition while open. |

## Coverage

- **Hierarchy and consistency:** Primary/secondary action hierarchy, glass
  layers, headings, panel widths, icon/text pairing, and loaded-vs-landing
  toolbar ownership were source-audited. No new hierarchy regression survived.
- **Responsive layouts:** 320×480, 320×568, 390×844, 844×390, and desktop test
  contracts were reviewed. C3-UX-01 is the uncovered open-popup state.
- **Accessibility:** Modal focus ownership, menu trapping, visible focus,
  touch-target minimums, labels/status regions, reduced motion, and keyboard
  Escape routes were checked. C3-A11Y-03 is distinct from historical trap fixes.
- **Themes:** Semantic tokens and both light/dark variants share the affected
  structures; no new theme-only contrast or styling defect was established.
- **i18n/RTL:** All five advertised locales (English, Korean, Japanese, Chinese,
  Spanish) use the same popup/status structures and can worsen vertical or
  horizontal pressure. None is RTL, so I did not invent an unsupported RTL
  product contract; direction-safe layout remains prudent.

## Browser feasibility and process hygiene

I read the complete agent-browser skill suite because this role normally
requires visual inspection. A browser session was not feasible within scope:
the repository's permanent instruction reserves one orchestrated Playwright
command and forbids additional browser-review sessions, while this specialist
assignment also said no browser/E2E. I therefore used deterministic DOM/CSS
geometry and existing test evidence and make no claim of a fresh screenshot
pass.

I launched no browser, Chrome, Playwright, profile, listener, or app server.
The reported agent-browser daemon/Chrome tree rooted at PID/PGID 11952 was not
mine, so I did not use `agent-browser close` or signal it. A final read-only
check found the supplied PIDs absent and no listener on 3099, 4173, or 4183.
No deployment, commit, push, or source edit occurred.

## Freshness sweep

Historical searches found old mobile-menu semantics/trapping and Share
silent-failure reports, but not these current roots: constrained popup height,
live responsive-mode reconciliation, or Share-warning lifecycle across Export
Again. Cycle 2 fixes and explicit P01 platform boundaries were excluded.
