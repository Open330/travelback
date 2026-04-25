# Debugger - Cycle 5 (2026-04-25)

## Provenance
- Started from the existing partial cycle-5 debugger draft and re-reviewed the current repository snapshot end to end.
- Verified the repo still passes `npm run typecheck` and `npm run lint`.
- Preserved the prior draft context below instead of discarding it.

## Scope
- Reviewed the executable surface in `src/app`, `src/components`, and `src/lib`, plus root config and review artifacts needed to preserve provenance.
- Focused on latent bugs, lifecycle hazards, state inconsistencies, and crashy edge cases.

## Findings

### C5-DB4. Controlled theme toggle no longer tracks system theme changes
- Severity: MEDIUM
- Confidence: HIGH
- Files / regions:
  - `src/components/ThemeToggle.tsx:24`
  - `src/components/ThemeToggle.tsx:36`
  - `src/app/page.tsx:63`
  - `src/app/page.tsx:344`
- Symptom: if the OS theme changes while the app is open, the UI stays on the old theme until a manual user action or reload. On the first hydrated frame, the toggle can also show the wrong icon and label because `visualMode` is forced to `light` until the hydration flag flips.
- Root cause: `ThemeToggle` is used as a controlled component in `HomeInner`, but its `matchMedia` listener intentionally ignores system changes whenever `controlledMode` is present. `HomeInner` only applies the initial theme once on mount and does not subscribe to `prefers-color-scheme` changes.
- Failure scenario: a user opens the app in light mode, leaves it open, and the OS switches to dark mode. The app background, map style, and toggle semantics stay stale, which is visible and confusing in a long-lived tab.
- Concrete fix: move the `prefers-color-scheme` subscription into `HomeInner` and update `colorMode` / `mapStyleKey` when there is no explicit user override. Also derive the toggle label/icon from the actual effective mode immediately, or hide the control until hydration if you need to avoid mismatch.

### C5-DB5. New tracks inherit playback controls from the previous session
- Severity: MEDIUM
- Confidence: HIGH
- Files / regions:
  - `src/lib/usePlaybackController.ts:17`
  - `src/lib/usePlaybackController.ts:59`
  - `src/app/page.tsx:209`
  - `src/app/page.tsx:255`
- Symptom: loading a new trip resets progress, but it does not reset `speed`, `duration`, or `followCamera`.
- Root cause: `resetPlayback()` only clears progress and play/pause state. The callers in `page.tsx` use it as the session reset primitive, so playback preferences persist silently across track boundaries.
- Failure scenario: a user turns follow-camera off and sets a long animation duration on Trip A, then loads Trip B. Trip B starts with the previous camera behavior and timing, even though the session was treated as a fresh trip.
- Concrete fix: decide whether playback controls are sticky preferences or per-session state. If they are session-scoped, reset `speed`, `duration`, and `followCamera` when a new track or fresh journey is loaded. If they are preferences, persist them intentionally and expose that semantics in the UI.

### C5-DB6. File read failures are mapped to the wrong user-facing error
- Severity: LOW
- Confidence: HIGH
- Files / regions:
  - `src/lib/parser.ts:653`
  - `src/lib/parser.ts:672`
  - `src/components/FileUpload.tsx:63`
- Symptom: a real file-read failure is shown to the user as a parse failure.
- Root cause: `parseTrackFile()` emits `READ_FAILED` from `FileReader.onerror`, but `FileUpload` maps that code to `fileUpload.parseFailed` instead of the dedicated `fileUpload.readFailed` string that already exists in the locale table.
- Failure scenario: a browser storage glitch, sandbox restriction, or revoked file handle prevents the read from completing. The UI tells the user the file could not be parsed even though parsing never started.
- Concrete fix: map `READ_FAILED` to `fileUpload.readFailed` in `errorCodeMap` and keep `fileUpload.parseFailed` for actual parse errors.

### C5-DB7. Error boundary fallback drops the main landmark
- Severity: LOW
- Confidence: HIGH
- Files / regions:
  - `src/components/ErrorBoundary.tsx:37`
  - `src/components/ErrorBoundary.tsx:72`
  - `src/app/page.tsx:382`
- Symptom: if a child component throws, the fallback screen no longer exposes the app's main landmark.
- Root cause: the error fallback renders a plain `div` tree instead of a `<main>` or an element with `role="main"`. The normal app root is inside `<main id="app" data-travelback-app-root="true">`, so the fallback breaks the landmark contract.
- Failure scenario: a WebGL or parser crash lands the user on the error UI, but screen-reader users lose the primary region and have to tab through the whole fallback shell.
- Concrete fix: render the fallback inside `<main>` or add `role="main"` and a visible heading so the failure state preserves the same structural landmark contract as the happy path.

## Prior Draft Status
- `C5-DB1` remains a duplicate of the already-recorded coordinate-boundary inconsistency in the code-reviewer cycle-5 report, so I did not repeat it as a new finding here.
- `C5-DB2` remains a known memory tradeoff in the worker JSON fallback path, not a correctness defect.
- `C5-DB3` remains a low-confidence CSP / worker-constructor edge case and was not promoted into a new finding.

## Verification
- `npm run typecheck` passed.
- `npm run lint` passed.

## References
- `src/components/ThemeToggle.tsx:24`
- `src/app/page.tsx:63`
- `src/lib/usePlaybackController.ts:17`
- `src/app/page.tsx:209`
- `src/lib/parser.ts:653`
- `src/components/FileUpload.tsx:63`
- `src/components/ErrorBoundary.tsx:37`
- `src/app/page.tsx:382`
