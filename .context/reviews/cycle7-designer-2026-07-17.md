# Cycle 7 Designer Review — 2026-07-17

## Overall assessment

Travelback remains visually coherent and responsive after Cycle 6. At desktop and 390×844 mobile sizes, the landing hierarchy, loaded-track actions, bottom playback stack, map surface, More-controls sheet, dialogs, Korean guide, and export panel remained usable without horizontal overflow inside their composed layouts. Keyboard focus and screen-reader feedback have two meaningful rough edges, and the independently placed desktop Help affordance is covered by that otherwise-correct bottom stack.

## Surfaces reviewed

- Landing, sample/import affordances, error states, global theme/language/unit controls.
- Loaded-track workspace, toolbar, map controls, playback, timeline, elevation, camera scenes, journey creation, export, help, and Google import guide.
- Desktop/mobile geometry, target sizes, text truncation, dark/light tokens, reduced motion, hover/focus/pressed states, dialog focus containment, live feedback, and five locales in source.
- Current-source interactive pass: 1440×1000 and 390×844; GPX upload; map; playback; mobile controls; export; Korean locale; guide tab keyboard navigation.

## Findings

### DESIGN7-01 — Unit segmented controls hide most of their focus ring

- Severity / confidence: Medium / High
- Location: `GlobalToolbar.tsx:27-49`; `TrackToolbar.tsx:231-253`; `vitro-base.css:615-623`
- What happens: the rounded segmented container clips overflow while its buttons use the design system's outward-spreading shadow ring. Browser inspection confirms most of the focused button perimeter is painted outside and cut away.
- Why it matters: focus and selected state collapse into almost the same cyan fill on the selected segment. A keyboard user scanning the toolbar cannot reliably see which segment currently owns focus.
- Recommendation: keep the joined rounded silhouette, but add an inset, high-contrast `:focus-visible` treatment to segment buttons (or move the focus painting to a non-clipped inner element). Verify the selected/unselected buttons in both themes and both toolbar placements.

### DESIGN7-02 — Timeline's assistive value omits the date/time shown to sighted users

- Severity / confidence: Medium / High
- Location: `TimelineSelector.tsx:132-139,481-483,550-680`
- What happens: the visual feedback under the thumb is a localized date/time, while assistive feedback is only a percentage and endpoint label.
- Why it matters: a travel timeline is understood in dates, not abstract percentages. On a multi-day route, `42% End of range` does not tell a user whether the trip ends on Monday afternoon or Wednesday morning.
- Recommendation: announce the localized date/time together with concise endpoint context, use the percentage only as supplemental information or as the fallback when the file has no timestamps, and test keyboard updates.

### DESIGN7-03 — Desktop Help is visible underneath the bottom interaction surface

- Severity / confidence: Medium / High
- Location: `KeyboardHelp.tsx:18-31`; `TrackWorkspace.tsx:142-173`
- What happens: Help is independently fixed at `bottom-36`, while the composed timeline/elevation/playback stack now reaches above it. On the 1440×1000 current-source render, their intersection covers all 78.25×44 pixels of Help; the Elevation SVG owns the center hit.
- Why it matters: this is a false affordance. The label is fully visible, but clicking it edits playback position rather than opening help, making the app feel broken at the exact moment someone asks for guidance.
- Recommendation: move the desktop Help action into a shared non-overlapping layout surface (the top action toolbar is a natural owner) or export a tested bottom-clearance contract. Verify a real center click and unchanged elevation/progress.

## What works

- Primary targets are at least 44px and the mobile More-controls sheet is reachable, contained, and dismissible by Escape.
- Export and confirmation dialogs make the rest of the app inert and return focus to their opener.
- The Cycle 6 composed timeline/elevation/playback stack is separated at both inspected viewports.
- Korean switching updates controls, guide content, and the loaded-track live status; no English status leak was observed in the exercised path.
- Reduced-motion CSS disables transitions and animation globally; dark/light token usage remains consistent.

## Final missed-issue sweep

I retested the first/last tab stops, focused selected controls, narrow-screen overflow, fixed-corner affordances, bottom bands, status text, modal layering, color-independent state, and touch target geometry. Historical review search showed prior focus work and prior percentage labeling work, but neither the clipped segmented paint nor the missing timeline date/time was previously resolved. A final exact-current-source hit test promoted DESIGN7-03 from geometry suspicion to a confirmed wrong-owner failure. No other current design issue reached the actionable threshold.
