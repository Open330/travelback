# P0 Critical Correctness Fixes — Cycle 2 (2026-04-19)

**Priority:** P0 — correctness bugs that produce wrong output
**Source:** comprehensive-deep-code-review-2026-04-19-cycle2 (NEW-1, NEW-2)
**Estimated effort:** 1-2 hours

---

## Findings addressed

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| NEW-1 | smoothCameraState uses old shortest-path longitude wrapping (not shifted-longitude) | HIGH | MapView.tsx |
| NEW-2 | JSON files bypass the 200MB size check | HIGH | parser.ts |

---

## Implementation steps

### 1. Fix smoothCameraState longitude interpolation near antimeridian (NEW-1)

**File:** `src/components/MapView.tsx:76-86`

**Current:** `smoothCameraState` uses the modulo-based shortest-path formula that was already identified as broken in `lerpCamera` (N-4) and fixed with shifted-longitude approach. This function was not updated at the same time.

```ts
center: [
  previous.center[0] + (((target.center[0] - previous.center[0] + 540) % 360) - 180) * factor,
  previous.center[1] + (target.center[1] - previous.center[1]) * factor,
],
```

**Fix:** Apply the same shifted-longitude approach used in `lerpCamera`:

```ts
function smoothCameraState(previous: CameraState, target: CameraState, factor: number, bearingFactor?: number): CameraState {
  const lngDiff = target.center[0] - previous.center[0]
  let lngResult: number
  if (Math.abs(lngDiff) > 180) {
    const aShifted = ((previous.center[0] + 180) % 360 + 360) % 360
    const bShifted = ((target.center[0] + 180) % 360 + 360) % 360
    lngResult = aShifted + (bShifted - aShifted) * factor
    lngResult = ((lngResult + 180) % 360) - 180
  } else {
    lngResult = previous.center[0] + lngDiff * factor
  }
  return {
    center: [lngResult, previous.center[1] + (target.center[1] - previous.center[1]) * factor],
    zoom: previous.zoom + (target.zoom - previous.zoom) * factor,
    pitch: previous.pitch + (target.pitch - previous.pitch) * factor,
    bearing: smoothAngle(previous.bearing, target.bearing, bearingFactor ?? factor),
  }
}
```

**Verification:** Create a test track from Tokyo to Anchorage. During playback, confirm the camera center stays in the Pacific (lng ~165-180) and never jumps to lng ~0.

---

### 2. Add size check for JSON files (NEW-2)

**File:** `src/lib/parser.ts:521`

**Current:** The size check explicitly skips JSON files:

```ts
if (ext !== 'json' && file.size > MAX_FILE_SIZE) {
```

A 2GB JSON file will be read entirely into memory, potentially crashing the browser tab.

**Fix:** Apply the size check to JSON files with a higher limit (500MB to accommodate legitimate large exports):

```ts
const JSON_MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB for JSON

export function parseTrackFile(file: File): Promise<Track> {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const maxForType = ext === 'json' ? JSON_MAX_FILE_SIZE : MAX_FILE_SIZE
    if (file.size > maxForType) {
      reject(new ParseError(
        `File is too large (${(file.size / 1024 / 1024).toFixed(0)}MB). Maximum size is ${(maxForType / 1024 / 1024).toFixed(0)}MB.`,
        'FILE_TOO_LARGE'
      ))
      return
    }
```

Also add `FILE_TOO_LARGE` to the `parserErrorMap` in `src/components/FileUpload.tsx`:

```ts
FILE_TOO_LARGE: 'fileUpload.fileTooLarge',
```

And add the i18n key to all 5 locales in `src/lib/i18n.ts`.

**Verification:** Attempt to import a JSON file larger than 500MB. Confirm it is rejected with a clear error message. Confirm normal JSON files up to 500MB still work.

---

## Verification checklist

- [x] `npm run build` succeeds
- [ ] `npm run test:e2e:static:ci` passes
- [x] Camera stays in Pacific for antimeridian-crossing routes (NEW-1) — 99f291a
- [x] Oversized JSON files rejected with clear error (NEW-2) — 91e7739
