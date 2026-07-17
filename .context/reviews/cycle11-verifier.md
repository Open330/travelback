# Cycle 11 verifier review

Review target: `7273d464fdce24fc06350ce1444c3a2e8d26829d`.

## Verdict

The ordinary sample -> playback -> mobile export-ready journey works at the
target revision, and Cycle 10's heading, active-seek, touch-target, localization,
and truthful completion repairs are visible. Verification nevertheless found
three fresh product failures and one reopened race: Journey can commit a route
after its point count becomes invalid, focused Escape does not close
SceneEditor, a successful sample preserves a stale rejected-file alert, and an
unsupported drop does not invalidate a delayed sample.

## Independent inventory and evidence scope

- Enumerated all 113 review-relevant product paths: every `src/` production and
  unit-test file, the complete E2E specification and 19 fixtures, public worker/
  maps/sample/guide/assets, all scripts, workflow, README, lock/manifests, and
  authored Next/TypeScript/ESLint/Vitest/Playwright/PostCSS configuration.
- Read current project/architecture/development/traveler context, Cycle 10
  aggregate and completion plan, pending resource inventory, blocked/deferred
  ledgers, and prior role reports. Historical text searches were used to mark
  the sample/drop race as reopened `AG2-02` and the other three as fresh.
- Used the parent-inventoried physical exact-HEAD copy and static URL only. No
  mirror/server/process was created, reused, stopped, or deleted by this role.
- Desktop evidence: accessibility tree, focus sequence and computed styles,
  unsupported input, sample import, loaded map/timeline/elevation, playback,
  SceneEditor, Journey confirmation mutation, network/storage, console/errors.
- Mobile evidence at iPhone 15 emulation (`393x852`): landing, sample workspace,
  playback and active seek, geometry/overflow, export configuration and local
  developer-stub completion. Chromium exposed no nonzero iOS safe-area inset;
  this does not close `M10-01`.

## Confirmed findings

### VR11-01 — Create accepts a Journey that is no longer a valid route

- Severity / confidence: Medium / High
- History: Fresh
- Locations: `src/components/JourneyCreator.tsx:336-369,705-721,925-962`;
  `src/app/page.tsx:332-347,409-412`; `src/lib/parser.ts:518-520`

Live sequence: add exactly two points, press Done, delete a still-active map
marker, then inspect the confirmation card. It changed to `1 location` and
`1 locations · 0 m`, but Create remained enabled. Create produced a loaded
`1 / 1 locations` workspace with `0 m / 0 m`. Deleting both points and creating
produced `0 / 0 locations`.

The zero-point app did not immediately crash. It stayed mounted after settling
and a style change; `MapView.tsx:848-856` refuses hydration when cumulative
distances are empty, leaving a claimed loaded journey with no valid track
render. Fix the validation/commit boundary, not an imagined exception: freeze
or revalidate/copy the draft, disable Create under two points, and keep every
Track producer under the same cardinality invariant.

### VR11-02 — Escape leaves Camera open when focus is on Camera

- Severity / confidence: Medium / High
- History: Fresh
- Locations: `src/lib/usePlaybackController.ts:199-249`;
  `src/components/KeyboardHelp.tsx:43-50`; `src/app/page.tsx:243-259`

In clean session `cycle11-escape`, Camera opened with `document.activeElement`
still the Camera button. Pressing Escape yielded `panel:true` and focus still
`Camera`. The target matches the interactive guard at lines 203-209, so the
Escape branch at 246-248 is unreachable. Route dismissal before the playback
guard and add a terminal hidden assertion; the existing KML case merely clicks
Export after Escape.

### VR11-03 — Loaded success and rejected-file alert coexist

- Severity / confidence: Medium / High
- History: Fresh
- Locations: `src/components/FileUpload.tsx:23-27,64-80,161-190,219-244`

After uploading `favicon.svg`, the landing showed the expected recovery alert.
Clicking the sample then loaded Namsan and moved focus into the workspace, but
the same alert remained in the loaded FileUpload overlay after additional waits.
The desktop capture shows the red rejection copy over the map/navigation area
while the title and status both announce success. `onLoadSample` bypasses the
only `setError(null)` path. Clear local rejection state at every newer valid
intent and assert no alert after success.

### VR11-04 — Newer unsupported drop does not defeat held sample

- Severity / confidence: Medium / High
- History: Reopened/incomplete `AG2-02/P04`, not fresh
- Locations: `src/components/FileUpload.tsx:64-66,126-140`;
  `src/app/page.tsx:414-447,603-610`

The browser held the fixed sample fetch for about 2.5 seconds, clicked Sample,
then dispatched an unsupported `.txt` drop. The newer intent first showed its
error on the landing. When the old response was released, `data-has-track`
became true and Namsan loaded; the error remained. Invalidating the page-owned
generation before child extension preflight fixes both ordering and wasted work.

## Verified positive behavior and limitations

- Landing and loaded accessibility snapshots each exposed one visible/accessibly
  named H1. Eight landing/global controls were keyboard reachable with visible
  authored focus indications.
- Unsupported input recovery was actionable before the stale-success sequence.
- Mobile document width stayed `393 == clientWidth`; no horizontal overflow was
  observed. The primary controls ended near y=809 in an 852px viewport, and
  measured visible buttons were at least 44px high. This emulation is not real
  Safari safe-area/dynamic-chrome evidence.
- Playback progressed `0 -> 0.049`; while playing, a slider seek advanced
  `0.083 -> 0.13`, corroborating Cycle 10's active-seek repair.
- The mobile export dialog fit without internal overflow. The localhost-only
  developer stub reached a focused `Video ready` heading, accurate unsaved copy,
  video preview, Download, Export Again, and Share. It is UI-state evidence, not
  a fresh real-MP4 encoding/save claim.
- No application page errors were captured in the valid sample/export flow.
  The primary lint/type/unit/worker tools were unavailable because its existing
  dependency install is incomplete. High-level audit reported zero vulnerabilities.
  Cycle 10's accepted exact-code 431-unit/106+106-E2E/real-MP4 matrix remains
  historical rather than being relabeled fresh.

## Evidence inventory

- Sessions: `cycle11-experience-desktop`, `cycle11-experience-desktop-2`,
  `cycle11-journey-confirm`, `cycle11-escape`,
  `cycle11-sample-drop-race`, `cycle11-experience-mobile`. Two desktop sessions
  became slow/nonresponsive and were left untouched.
- Citable captures: `/tmp/cycle11-landing-desktop.png`,
  `/tmp/cycle11-workspace-desktop.png`, `/tmp/cycle11-mobile-landing.png`,
  `/tmp/cycle11-mobile-workspace.png`, `/tmp/cycle11-one-point-workspace-confirmed.png`,
  `/tmp/cycle11-empty-track-after-settle.png`,
  `/tmp/cycle11-scene-escape-stays-open.png`,
  `/tmp/cycle11-sample-drop-race.png`, `/tmp/cycle11-mobile-export-panel.png`,
  `/tmp/cycle11-mobile-export-done.png`, and
  `/tmp/cycle11-browser-a11y-baseline.txt`.
- Provenance-only/non-citable for their filenames' implied states:
  `/tmp/cycle11-journey-confirm-one-point.png`,
  `/tmp/cycle11-one-point-workspace.png`, and
  `/tmp/cycle11-empty-track-crash.png`.

## Final verification sweep

The final sweep challenged import families/limits, stale async intent, heading
hierarchy, localization ownership, map readiness/style replacement, playback
seek, Journey cardinality, scene commands, modal focus, export result truth,
mobile containment and target geometry, console errors, and historical
carryovers. `M10-01`, `M9-01`, `B01`-`B04`, `D01`-`D04`, and final cleanup retain
their existing exits. No fifth current product root was verified.
