# Cycle 11 designer review

Target: `7273d464fdce24fc06350ce1444c3a2e8d26829d`.

## Scope and live evidence

The design inventory covered every production component/hook, shared types,
styles and five locales, visual assets, tests/fixtures, and the full landing ->
input -> preview/playback/trim -> Camera/scenes -> export path. Empty, error,
loaded, confirming, ready, desktop/mobile, keyboard focus, dark/light ownership,
reduced motion, touch geometry, and recovery states were reviewed.

Agent-browser core/config/interact/query/wait/network/visual/debug/state workflows
were used against only the supplied exact-HEAD static URL. Desktop was
`1440x900`; iPhone 15 emulation was `393x852`. Accessibility trees, focus styles,
computed rectangles, DOM state, console/errors, storage/network, screenshots,
unsupported input, sample/playback, Journey mutation, Camera Escape, and stubbed
export completion were captured. No server/session was stopped or deleted.

The landing and mobile workspace are visually coherent, have no document
horizontal overflow, retain one accessible H1, and use at least 44px visible
primary targets in the measured flow. Mobile controls ended near y=809 of 852.
The emulator exposed no nonzero iOS inset, so real Safari remains `M10-01`.

## Findings

### DESIGN11-01 — Confirmation looks final while the map still edits its route

- Severity / confidence: Medium / High
- History: Fresh
- Location: `src/components/JourneyCreator.tsx:336-369,705-721,925-962`

The naming card visually changes the panel into a final confirmation state, but
the still-bright map markers remain active delete targets. Deleting after Done
updates the summary to one or zero locations without disabling Create. Live,
the resulting `1 / 1` and `0 / 0` workspaces looked accepted even though they
had no meaningful distance; the zero-point map never hydrated track layers.

Design fix: confirmation must either freeze/dim/block map editing or visibly
return to editing as soon as the valid draft changes. Create must derive disabled
state from the same >=2 invariant and commit a copied, revalidated draft. Supply
localized feedback instead of silently accepting a broken route.

### DESIGN11-02 — Keyboard help advertises a close action that focus suppresses

- Severity / confidence: Medium / High
- History: Fresh
- WCAG relevance: keyboard operation/predictability (2.1.1, 3.2.2)
- Location: `src/lib/usePlaybackController.ts:199-249`;
  `src/components/KeyboardHelp.tsx:43-50`

Camera opens a nonmodal left panel and leaves focus on its highlighted toolbar
button. Escape did nothing; the panel and focus stayed put. Inputs/selects inside
it match the same early guard. This violates the app's own shortcut legend and
forces keyboard users to navigate to the small close button.

Design fix: resolve topmost/global Escape before playback-key suppression, retain
modal/export precedence, close the panel, and restore/retain a logical focus
target. Test actual hidden state from trigger and internal controls.

### DESIGN11-03 — A successful route is covered by a persistent red rejection

- Severity / confidence: Medium / High
- History: Fresh
- Location: `src/components/FileUpload.tsx:23-27,161-190,219-244`

Unsupported SVG -> Sample produced a correct map, title, and loaded live status,
but the red invalid-file card stayed indefinitely at top left, over the map
navigation area. This is a strong color/status contradiction and an anxiety
point: users cannot tell whether the demo actually succeeded.

Design fix: clear the local error at the start/success of every replacement
intent, including Sample. Preserve the useful recovery message only while its
rejected intent is current, and test the composed transition.

### DESIGN11-04 — A newer drop is visually replaced by an older sample

- Severity / confidence: Medium / High
- History: Reopened/incomplete Cycle 2 `AG2-02/P04`
- Location: `src/components/FileUpload.tsx:64-66,126-140`;
  `src/app/page.tsx:414-447,603-610`

With the sample response held, a newer unsupported `.txt` drop first showed its
specific recovery state. Releasing the older response then switched to the
sample workspace while retaining the red error. The interface has no consistent
"latest action wins" model. Invalidate parent sample ownership before drop
preflight and keep only the newest intent's state.

## Cross-cutting assessment

- Landing focus sequence reached sample, Browse, Draw, Help, units, language,
  and theme with visible outlines/rings. Heading hierarchy repaired in Cycle 10
  remained correct in accessibility snapshots.
- Mobile landing had clear primary choices; loaded toolbar, timeline, elevation,
  and playback fit without sideways scrolling. Physical iOS safe area/dynamic
  chrome is still manual, not claimed passed.
- Playback and active seek progressed correctly. The local developer export stub
  produced a well-contained dialog and truthful focused `Video ready` state with
  preview/recovery actions; this is not a real encode/save proof.
- Cycle 10 touch, localization, elevation segmentation, and export-copy fixes did
  not regress in reviewed sources/evidence. Scene range endpoint and zero-point
  immediate-crash hypotheses were not re-reported.

## Evidence and final sweep

Citable visual evidence includes `/tmp/cycle11-landing-desktop.png`,
`/tmp/cycle11-workspace-desktop.png`, `/tmp/cycle11-mobile-landing.png`,
`/tmp/cycle11-mobile-workspace.png`, `/tmp/cycle11-one-point-workspace-confirmed.png`,
`/tmp/cycle11-empty-track-after-settle.png`,
`/tmp/cycle11-scene-escape-stays-open.png`,
`/tmp/cycle11-sample-drop-race.png`, and both mobile export captures. The final
sweep revisited hierarchy, terminology, action ownership, feedback truth,
responsive containment, intrinsic widths, touch targets, focus order, motion,
safe areas, recovery, and the full primary journey. Only the four roots above
crossed the evidence threshold; existing manual/blocked/performance ledgers stay
separate.
