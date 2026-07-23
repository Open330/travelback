# Cycle 12 UX and Critic Review

Date: 2026-07-24
Reviewed revision: `03df087d9befa3a6570f7eea17f2d4c6ba939a3c`
Branch: `review-plan-fix/no-deploy-20260723`

## Coverage

This static-only lane reviewed the complete product-facing React surface,
styles and theme tokens, all five locale tables and locale ownership, public
visual assets, component and browser-test catalogs, and the current
Cycle 1–11 review history. It traced landing and import, manual route creation,
loaded map/playback/trim/elevation, Camera authoring, export and recovery,
modal/nonmodal focus, dynamic announcements, responsive/safe-area behavior,
and keyboard-only paths.

No browser, server, Playwright, Chromium, full suite, process signal, commit,
push, or deployment was run. A narrow static component/i18n verification
passed: 9 Vitest files and 116 tests.

## New supported root

### UX12-01 — The Camera disclosure never exposes its open state

Severity: **Low**
Confidence: **High**

Evidence:

- `src/components/TrackToolbar.tsx:166-178`
- `src/components/SceneEditor.tsx:836-863`
- `src/components/TrackToolbar.tsx:52-69`

The toolbar Camera button toggles `showSceneEditor`, and the visual active
state changes its fill. The same button retains keyboard focus while the
nonmodal Scene Editor region is inserted. However, the trigger has no
`aria-expanded`, no `aria-controls`, and its `title` remains the localized
equivalent of “Open camera editor” in both states. The panel has no stable ID
for a disclosure relationship.

Consequently, a screen-reader user activates Camera and focus remains on an
apparently unchanged “Camera” button: neither the expanded state nor the newly
inserted region is announced through the trigger. Activating the same control
again closes the editor even though its exposed description still says
“Open.” Visual users receive the colored state and visible panel; the same
state change is not programmatically available at the point of operation.

Minimal fix:

- give the Scene Editor region a stable ID;
- expose `aria-expanded={showSceneEditor}` and `aria-controls` on the Camera
  trigger; and
- make any action description truthful in both states (or remove the
  state-inaccurate title).

Add a focused regression that opens and closes Camera while focus remains on
the trigger and asserts its expanded state and controlled region.

This is distinct from Cycle 10 retained-session hotkey isolation and Cycle
11 Escape routing/focus restoration. Those fixes govern which command closes
the panel and where focus returns; neither exposes the disclosure state or
relationship. Historical searches found Camera layout, focus rings, Escape
dismissal, and editor-control semantics, but no prior finding or plan for this
missing trigger state.

## Dedupe and final sweep

- Journey Creator waypoint announcements remain the explicit Cycle 8
  enhancement-only disposition, not a new blocker.
- Static English landing art, loaded-mobile settings discoverability, thin
  font weights, locale-code presentation, toast timing, canvas focus,
  safe-area device proof, and RTL hypotheses are historical or unsupported
  families.
- Cycle 9 duration eligibility/social metadata/export documentation, Cycle 10
  schema-owned names/paused camera/hotkey isolation, and Cycle 11 camera
  smoothing ownership remain applied.
- The exported video label, per-scene Customize context, fatal-fallback focus,
  and exact contrast/assistive speech questions did not meet the bar for a
  second source-proven root without runtime or AT evidence.

Final supported count: **1**.
