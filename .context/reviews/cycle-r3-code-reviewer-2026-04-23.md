# Cycle r3 — code-reviewer review (2026-04-23)

Scope: all of `src/` re-read; priors in `.context/reviews/` cross-checked; deferred lists reviewed.

## New findings

### R3-CR-1 (LOW, HIGH) — `FileUpload.handleDrop` can leak a `setTimeout` into a just-unmounted component
- **File**: `src/components/FileUpload.tsx:77-91`
- **Detail**: `handleDrop` calls `setTimeout(() => setIsDragging(false), 200)` unconditionally (twice in two branches). If the file parses quickly and `onTrackLoaded` unmounts `FileUpload` (the upload overlay is removed the moment `hasTrack` is true via `page.tsx:347`), the pending `setTimeout` fires `setIsDragging` on a disposed component. Does not crash (React tolerates setState on unmounted component), but can emit a dev warning and is an avoidable side-effect.
- **Fix**: use `useRef<ReturnType<typeof setTimeout>|null>` and clear it on cleanup; or gate with `if (mountedRef.current)`. Alternatively, rely on CSS transitions instead of a JS `setTimeout` for the visual drag-leave.
- **Confidence**: High. 

### R3-CR-2 (LOW, MEDIUM) — `videoEncoder.ts` uses `(window as unknown as …)` and `(handle as unknown as …)` casts around `showSaveFilePicker`
- **File**: `src/lib/videoEncoder.ts:173-183`.
- **Detail**: File System Access API now has TypeScript lib.dom types (`showSaveFilePicker`, `FileSystemFileHandle.createWritable`). The two `unknown`/cast shims can be replaced with typed access if `tsconfig.json` targets `ESNext` (it does). Minor typing-quality issue; behavior is correct. Note a similar pattern used only once in this file — good to clean up alongside any other videoEncoder change.
- **Fix**: define a narrow ambient interface for `showSaveFilePicker` in a single `.d.ts` or use TypeScript 5.9's built-in FS Access types (available in `lib: ["DOM"]` since TS 5.7+).
- **Confidence**: Medium — typing cleanup; no runtime impact.

### R3-CR-3 (LOW, HIGH) — `isCodecSupported` silently swallows dynamic-import errors
- **File**: `src/lib/videoEncoder.ts:205-212`.
- **Detail**: `isCodecSupported` wraps `await import('mediabunny')` in a bare `try { … } catch { return false }`. If the mediabunny module itself throws (not just `canEncode`), the user sees a "codec unavailable" message when the real cause is a module-load failure (network / CSP). Dev-only `console.debug` of the error would materially help debugging without changing user-facing behavior.
- **Fix**: add `console.debug('[Travelback] codec probe failed:', err)` inside the catch. Non-breaking.
- **Confidence**: High.

### R3-CR-4 (LOW, MEDIUM) — `parser.ts:546-567` still mixes `FileReader` (gpx/kml) with `file.arrayBuffer()` (json)
- **File**: `src/lib/parser.ts:538-567`.
- **Detail**: Already recorded as DF-R2-004 (deferred). Still active. Re-confirming in this cycle for traceability.
- **Confidence**: Medium — this is not a new finding; included only to confirm the deferred entry still applies. No action this cycle.

### R3-CR-5 (LOW, MEDIUM) — Inline longitude normalization in `smoothCameraState` persists
- **File**: `src/components/MapView.tsx:77-88`.
- **Detail**: Identical to DF-R2-003 (deferred in cycle r2). No change this cycle; still correct math. Confirming deferred entry.
- **Confidence**: Medium — carry-over.

### R3-CR-6 (LOW, MEDIUM) — `approxDistanceMeters` in `JourneyCreator` duplicates `centerDistanceMeters` in `MapView` but uses simple mean-lat (no antimeridian handling)
- **File**: `src/components/JourneyCreator.tsx:29-34` vs. `src/components/MapView.tsx:70-75`.
- **Detail**: Identical to DF-R2-001. Still active.
- **Confidence**: Medium — carry-over.

## Final sweep — commonly missed issues I checked and found clean

- No secrets, tokens, or API keys in `src/` or `scripts/` (grep confirmed).
- No `eval()`, `new Function()`, or `setInnerHTML` outside `layout.tsx`'s bootstrap script (which is a CSP-hashed, audited string).
- No `console.log` leaks in production code; all logging is `console.error`/`warn`/`debug` with structured context.
- No `any` casts in `src/**/*.ts(x)` (grep returns empty outside legitimate `unknown` narrowing).
- All component effect cleanups (`removeEventListener`, `clearTimeout`) present in the grep audit.

## Recommendations

- Schedule R3-CR-1 and R3-CR-3 this cycle (both one-line fixes, both HIGH confidence, both net-positive).
- Record R3-CR-2 in deferred (purely typing cleanup).
- R3-CR-4..6 stay deferred (carry-overs).
