# Cycle 11 document-specialist review

Target: `7273d464fdce24fc06350ce1444c3a2e8d26829d`.

## Inventory and result

Compared `README.md`, all current `.context` project/architecture/development/
traveler guidance, active aggregate/plan/pending/blocked ledgers, manifests and
scripts, workflow, public guide assets, five locale dictionaries, and every
user-facing string consumer against the complete source/test inventory. Commands,
input families/limits, local-only privacy, bundled map behavior, camera/export
defaults, static base path, CSP delivery, and Cycle 10 completion claims remain
consistent with current implementation.

Two current UI copy contracts are false in ordinary states, and one confirmation
contract becomes nonsensical because its underlying invariant is not held. A
fourth behavior is a reopened historical lifecycle gap, not a documentation root.

## Findings

### DOC11-01 — Shortcut help promises `Esc — Close panels`, but focused panels do not close

- Severity / confidence: Medium / High
- History: Fresh
- Locations: `src/components/KeyboardHelp.tsx:43-50`;
  `src/lib/usePlaybackController.ts:199-249`; false-assurance comment
  `e2e/travelback.spec.ts:3004-3007`

The copy describes a global command. The handler returns for buttons, inputs,
selects, sliders, dialogs, and the map before reaching Escape. Live, Camera
remained focused and SceneEditor remained open. The correct root fix is command
routing, not weakening the help text: dismissal must precede playback-only
suppression, then tests must assert the panel is gone from focused controls.

### DOC11-02 — A loaded route can still be labelled as an invalid file

- Severity / confidence: Medium / High
- History: Fresh
- Locations: `src/components/FileUpload.tsx:23-27,161-190,219-244`;
  successful sample path `src/app/page.tsx:414-447`

After an unsupported upload, the Sample CTA succeeds without clearing FileUpload's
local rejection copy. The page simultaneously announces `Track loaded: Namsan
Tower Walk` and retains the assertive red sentence saying the file is not a
travel route. This is not translation nuance; mutually exclusive status claims
are visible together. Clear error state on the newer valid intent and add a
composed-state regression.

### DOC11-03 — Confirmation language continues after the route stops being confirmable

- Severity / confidence: Medium / High
- History: Fresh, same root as Journey validation
- Locations: `src/components/JourneyCreator.tsx:705-721,925-962`

While `Create this route?` remains displayed, live map deletion can reduce the
summary to grammatically wrong `1 locations · 0 m` or `0 locations · 0 m`, yet
`Create Route` remains enabled. Do not patch pluralization alone: freeze a valid
snapshot or invalidate confirmation below two points, use locale-aware singular/
plural copy in the remaining valid states, and revalidate at commit.

## Historical classification and non-findings

- The delayed sample/unsupported-drop failure reopens Cycle 2 `AG2-02/P04`; its
  fix belongs to intent ownership. Documentation should record it in the plan,
  but it is not a new copy root.
- Cycle 10 manufactured-name localization and ready/download-started/saved copy
  are correctly implemented across five dictionaries. The live export stub used
  `Video ready` and explicitly said it was not saved.
- README commands/scripts, supported input shapes, 4 MiB XML bound, point limits,
  local map/privacy statements, static deployment/base path, and CSP caveats
  matched source. The root LICENSE/legal intent remains blocked `B03`, not a
  rediscovered docs defect.
- `M10-01`, `M9-01`, `B01`/`B02`/`B04`, `D01`-`D04`, and final cleanup retain
  their exact evidence/authority exits.

## Coverage and final sweep

All 113 review-relevant product paths and current context/history inventories
were covered; binary/generated assets were checked by provenance. Fresh primary
test commands were unavailable due the incomplete existing install, so no fresh
gate claim is made. The final copy sweep covered landing, upload/help/errors,
Journey, playback/scenes, localization, export/cancel/ready/share, accessibility
labels, mobile actions, README/context claims, and test comments. No additional
authoritative mismatch survived source tracing and history comparison.
