# Verifier review — cycle 002

Date: 2026-07-16
Reviewed revision: `cc6f24f`
Deployment: **not run**, per the explicit constraint

## Inventory and coverage

I reviewed the current, review-relevant repository rather than only the cycle-1 diff: all 50 files under `src/` (including 12 Vitest files), the single Playwright specification and all 17 fixtures, all 7 scripts, public runtime assets/worker output, workflow and package/build/lint/type/test configuration, README, and current project/development instructions. Generated `.next/`, `out/`, `node_modules/`, and historical plan/review archives were excluded; the cycle-1 aggregate and implementation plan were read only to distinguish fixed, deferred, and new findings.

Current direct checks:

| Check | Result | Evidence |
| --- | --- | --- |
| `npm test -- --run` | Pass | 12 files, 266/266 tests, exit 0 |
| Targeted Playwright format imports | Pass | 7/7: GPX, KML, flat Google JSON, Records, Semantic Location History, Timeline Edits, Semantic Segments; existing dev server reused |
| Desktop app at 1440×900 | Pass for landing, sample import, playback entry, guide/dialog, dark presentation, wrong-file recovery | Manual browser/DOM/a11y/console inspection |
| iPhone 12 emulation | One reproduced interaction failure | Scene editor slider swipe below |
| Export test-stub journey | Completed, with one reproduced focus defect | `Start Export` → success UI and download action |
| Console/page errors | No application error reproduced in the reviewed journeys | Only normal development/HMR messages |
| Network/privacy spot check | No route-upload network request observed | Manual request inspection; source sweep also shows local parsers |
| Deployment | Not run | Explicit user constraint |

The cycle-1 plan records green lint, typecheck, 266-unit-test, build, smoke, 82/82 dev/static Playwright, and 1/1 real-MP4 gates on this post-fix line. Except for the fresh 7-format subset above, I did not relabel those historical results as newly executed cycle-2 checks.

## New confirmed findings

### VR-C2-01 — A normal mobile scene-slider drag dismisses the entire editor

- Severity: **Medium**
- Confidence: **High**
- Status: **Confirmed in the running app with a bubbling touch sequence**
- Source evidence: `src/components/SceneEditor.tsx:338-349` closes after any leftward, horizontal-dominant gesture over 80px. `src/components/SceneEditor.tsx:489-492` installs those handlers on the whole panel. The panel contains the blend slider at `src/components/SceneEditor.tsx:532-545`, scene-range input at `src/components/SceneEditor.tsx:655-662`, and zoom/pitch/bearing/orbit sliders at `src/components/SceneEditor.tsx:665-735`.
- Runtime evidence: on an emulated iPhone 12, I loaded the sample GPX, opened Camera, added a scene, chose Customize, and dispatched a real bubbling `TouchEvent` on the visible Zoom slider from x=181 to x=52 (149px-wide slider; dx=-129 at constant y). `scene-editor-panel` existed before the gesture and did not exist 300ms afterward.
- Failure scenario: a traveler drags Zoom, Direction, Orbit, scene range, or Blend to the left and unexpectedly loses the editor. The setting can change while the editing context closes, making the behavior look like data loss or a broken slider.
- Suggested fix: start dismissal only from a dedicated header/handle, or ignore gestures whose origin is an input/button/select/interactive descendant. `src/components/ExportPanel.tsx:115-130` and `:223-224` already demonstrate a handle-scoped pattern. Add a mobile touch regression that drags each horizontal control more than 80px and asserts the panel remains open.

### VR-C2-02 — Valid JSON `null` escapes the parser's stable error contract

- Severity: **Low**
- Confidence: **High**
- Status: **Confirmed by control flow and an existing test that explicitly accepts the raw exception**
- Source evidence: `src/lib/googleJsonParser.ts:321-329` casts `JSON.parse` to an object/array union without checking the runtime root. At `src/lib/googleJsonParser.ts:344`, `data.locations` is read when `data` can be `null`, producing `TypeError` before the intended unsupported-format error at `:366-368`. `src/lib/parser.test.ts:634-637` documents that TypeError and asserts only “throws.”
- Failure scenario: a malformed/empty Google export represented by valid JSON `null` produces an implementation exception rather than the same localized `ParseError` code used for other unsupported Google shapes. Main-thread/worker diagnostics become less predictable.
- Suggested fix: validate that the parsed root is a non-null object or array immediately after `JSON.parse`; throw a deliberate `ParseError` (`UNSUPPORTED_GOOGLE_FORMAT` or the chosen invalid-root code). Tighten the test to the exact error class/code and verify worker fallback parity.

### VR-C2-03 — Export completion drops keyboard focus to the document body

- Severity: **Low**
- Confidence: **High**
- Status: **Confirmed in the running app; success announcement itself remains available**
- Source evidence: `src/components/ExportPanel.tsx:241-303` replaces the form with the success subtree. The focused Start Export control is therefore removed. `src/components/ModalDialog.tsx:93-167` focuses on modal open and traps Tab, but does not re-home focus after an in-dialog state replacement. The existing completion test at `e2e/travelback.spec.ts:1587-1597` asserts the heading/download link but not `activeElement`; `e2e/travelback.spec.ts:1516-1530` covers only the static dialog tab loop.
- Runtime evidence: immediately before activation, the active element was the `BUTTON` labelled `Start Export`. After the local test-stub completed, the success heading/link were present but `document.activeElement` was `BODY`. The success toast/live region did contain “Video exported successfully!”, so this is a focus-context defect, not a claim that success is unannounced.
- Failure scenario: a keyboard or switch-device user completes export and loses their place. The next Tab happens to recover into the video element, but the immediate focus state no longer identifies the new Download/Export Again actions.
- Suggested fix: give the success heading `tabIndex={-1}` and focus it on the transition, or focus the first enabled download action. Add an E2E assertion that focus stays inside the dialog after export completes.

## Deferred/manual-validation items

- `src/components/MapView.tsx:586-591` still requires `preserveDrawingBuffer`; cycle-1 AG-21/P13 explicitly deferred its performance verdict pending representative low-end/mobile hardware profiling. I found no new measurement, so this remains **manual validation**, not a new confirmed defect.
- README's MIT declaration without a root license and CI policy/permissions remain the already-known cycle-1 legal/authorization items. They are not recounted as cycle-2 discoveries.
- The suspected stale manual-journey name did **not** reproduce: the creator remount behavior resets that state. It is not reported as a finding.

## Final missed-issue sweep

I rechecked import recovery, GPX load, playback entry, camera/scenes, export form/success, desktop/mobile geometry, dialog semantics, reduced-motion configuration, theme/i18n controls, console/page errors, and the parser/test boundaries after drafting the findings. No new confirmed defect was found in file acquisition, desktop landing layout, initial dialog focus containment, success announcement, or the journey-name reset. New confirmed count: **3** (1 Medium, 2 Low); manual/deferred count: **3 carried-forward scopes**.
