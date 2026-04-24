# UI / UX Review

Scope covered: landing state, track-loaded workspace, journey creator, scene editor, export dialog, keyboard navigation, and localized toolbar behavior at a desktop viewport.

## Findings

1. **Unlabeled journey search combobox**
   - **Location:** [`src/components/JourneyCreator.tsx:604-617`](/Users/hletrd/flash-shared/Travelback/src/components/JourneyCreator.tsx#L604)
   - **Severity:** Medium
   - **Confidence:** High
   - **Failure scenario:** When the "Open tool" search mode is enabled, the only text input is a `role="combobox"` with a placeholder but no accessible name. In the browser probe, this input exposed `role: "combobox"`, `ariaLabel: null`, `labels: []`, and only the placeholder text. Screen reader and voice-control users will get a generic nameless combobox, so they cannot reliably tell what the field is for or target it by label.
   - **Suggested fix:** Add an actual label for the field, either a visible `<label>` or a visually hidden label tied with `htmlFor`, or set `aria-label` / `aria-labelledby` to a stable, localized name.

2. **Unlabeled scene-name input in the camera editor**
   - **Location:** [`src/components/SceneEditor.tsx:478-483`](/Users/hletrd/flash-shared/Travelback/src/components/SceneEditor.tsx#L478)
   - **Severity:** Medium
   - **Confidence:** High
   - **Failure scenario:** After adding a scene, the first editable control is a bare text `<input>` with no `aria-label`, no placeholder, and no associated `<label>`. In the browser probe, it exposed an empty label list and no accessible name. This leaves the scene title field anonymous for screen readers and voice input, which is a direct WCAG 1.3.1 / 4.1.2 problem in the primary editing flow.
   - **Suggested fix:** Associate the input with a label that names the scene, such as "Scene name for Scene 1", or add a visually hidden label that remains stable as the user edits the title.

3. **Journey creation does not move keyboard focus into the active workflow**
   - **Location:** [`src/components/JourneyCreator.tsx:555-640`](/Users/hletrd/flash-shared/Travelback/src/components/JourneyCreator.tsx#L555) and [`src/components/GlobalToolbar.tsx:19-67`](/Users/hletrd/flash-shared/Travelback/src/components/GlobalToolbar.tsx#L19)
   - **Severity:** Medium
   - **Confidence:** High
   - **Failure scenario:** After activating "Draw a route on the map", the browser tab sequence did not enter the journey panel first. The first four Tab presses landed on unrelated global controls in the top-right toolbar (`Metric units`, `Imperial units`, `Language`, and theme toggle) before reaching the journey cancel/search controls. That makes the active workflow feel disconnected from keyboard focus and increases the chance of accidental state changes outside the task being performed.
   - **Suggested fix:** Move focus to the first meaningful control in the journey panel when it opens. If the creator is intended to behave like a modal task flow, also trap focus and inert the rest of the app while it is active.

## Final Sweep Note

I also checked the loaded-track workspace, modal dialogs, export flow, and reduced-motion-related controls at a desktop viewport. No additional reportable accessibility, contrast, or keyboard-navigation issues surfaced in those sampled states.
