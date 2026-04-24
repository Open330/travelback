# Cycle C2 Verifier Review — 2026-04-24

## Methodology

Evidence-based verification of current source against stated behavior and prior-cycle fixes.
I read the repo rules first, then inspected the cycle-2 fix surface and the gates that prove
regression status:

- `.context/README.md`
- `.context/development/01-conventions.md`
- `.context/project/02-architecture.md`
- `src/lib/parser.ts`
- `public/workers/trackParser.worker.js`
- `src/components/SceneEditor.tsx`
- `src/components/ExportPanel.tsx`
- `src/lib/camera.ts`
- `src/components/JourneyCreator.tsx`
- `src/lib/interpolate.ts`
- `src/components/MapView.tsx`
- `src/components/FileUpload.tsx`
- `src/lib/videoEncoder.ts`
- `src/app/layout.tsx`
- `scripts/harden-static-export.mjs`
- `scripts/smoke-static.mjs`
- `public/map-styles/*.json`
- `e2e/travelback.spec.ts`
- `e2e/fixtures/*`

I also ran the current gates directly:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run smoke:static`
- `npm run test:e2e:static:ci`

## Gate Verification

- **Lint:** PASS
- **Typecheck:** PASS
- **Build:** PASS
- **Static smoke:** PASS
- **Static Playwright e2e:** PASS, 56 / 56 tests

Build output also confirmed the static hardening step ran:
`[harden-static-export] Hardened CSP across 3 HTML file(s)`

## Prior Cycle Fix Verification

Verified still in place:

1. **Parser segment remap fix**
   - `src/lib/parser.ts:399-407` keeps the first segment start out of the remap list by only pushing
     `points.length` after at least one prior point exists.
   - `public/workers/trackParser.worker.js:197-203` mirrors the same behavior in the worker path.

2. **SceneEditor `aria-valuetext`**
   - `src/components/SceneEditor.tsx:166-177, 521-583` includes `aria-valuetext` on the range handles
     and all parameter sliders.

3. **ExportPanel frame-count display clamp**
   - `src/components/ExportPanel.tsx:257-263` clamps duration/fps before computing `totalFrames`,
     matching the encoder limits from `src/types.ts:80-84`.

4. **Local-only map styles and CSP hardening**
   - `public/map-styles/voyager.json:1-29` and the other bundled styles have empty `sources`
     and no `sprite`/`glyphs`.
   - `scripts/smoke-static.mjs:122-145` still rejects remote sprite/glyph/source dependencies.
   - `src/app/layout.tsx:59-63` and `scripts/harden-static-export.mjs:14-29` still carry the
     hardened CSP posture.

## Findings

### C2-V1 — Antimeridian camera math still breaks overview zoom and scene interpolation

- **Severity:** Medium
- **Confidence:** High
- **Files:** `src/lib/camera.ts:53-117`

`computeBoundingBox()` detects antimeridian-crossing tracks, but it shifts longitudes with
`((p.lng + 180) % 360 + 360) % 360` and then computes `maxLngShifted - minLngShifted`
in `overviewZoomFromBox()`. For a simple crossing route at `170°E` and `170°W`, the current
math produces a shifted span of `340°`, which drives the overview zoom all the way down to `1`.
That is a real user-facing regression for Pacific/dateline routes: the route is framed as a near
world view instead of a route-level shot.

The same file also has a broken antimeridian path in `lerpCamera()`. The current implementation
does not preserve the start camera state when the centers straddle ±180. Reproducing the exact
formula from the source gives:

- `lerpCamera(170, -170, 0)` → `-10`
- `lerpCamera(170, -170, 0.25)` → `-63.125`
- `lerpCamera(170, -170, 0.5)` → `-180`

`t = 0` should preserve the start camera, so this is not just a cosmetic wrap issue; it changes
the first interpolated camera state and can sweep the export path through the wrong hemisphere.

The repo already has the correct shared primitives in `src/lib/interpolate.ts:5-6`
(`normalizeLng` / `shortestLngDelta`) and uses them in `src/components/MapView.tsx:112-166`.
`camera.ts` should use the same primitives or a shared helper instead of maintaining its own
shifted-domain math.

**Impact:** Dateline-crossing trips can export with visibly wrong overview framing and scene
transitions.

**Suggested fix:** Rework `camera.ts` to reuse the shared longitude helpers from
`src/lib/interpolate.ts`, and add a regression fixture for a route that crosses ±180°.

---

### C2-V2 — JourneyCreator duplicate suppression is not antimeridian-aware

- **Severity:** Low
- **Confidence:** High
- **Files:** `src/components/JourneyCreator.tsx:27-32, 253-259, 465-475`

`JourneyCreator` uses a local `approxDistanceMeters()` helper that subtracts raw longitudes:
`dLng = (b.lng - a.lng) ...`. That works for ordinary routes, but it fails open near the
antimeridian because points like `179.999°` and `-179.999°` are only a few hundred meters apart
geographically while the raw delta is almost `360°`.

Running the current formula with those values returns about `40,029,951 m`, so the 5 m
duplicate-suppression guard will never fire. That means accidental double-clicks or pasted
coordinates across the dateline can slip through even though the rest of the distance stack
already uses `shortestLngDelta()` correctly.

**Impact:** Rare, but real. Manual journey creation around the Aleutians / Fiji / Samoa can add
near-duplicate waypoints that the UI should have rejected.

**Suggested fix:** Reuse `shortestLngDelta()` or a shared geodesic helper from
`src/lib/interpolate.ts`, then add a dateline-crossing journey creator regression.

---

### C2-V3 — Default scene preset names remain English-only in localized UI

- **Severity:** Low
- **Confidence:** High
- **Files:** `src/lib/camera.ts:210-334`, `src/components/SceneEditor.tsx:443-450, 514-517`,
  `src/lib/i18n.ts:201-207`

Scene presets are generated in `camera.ts` with hardcoded English names such as
`Opening Overview`, `Bird's Eye`, `Flyover`, `Wide Open`, and `Street Level`.
`SceneEditor` renders `scene.name` directly and also uses it in aria labels and deletion prompts.

The i18n catalog already contains localized camera-mode labels (`camera.overview`,
`camera.flyover`, `camera.orbit`, `camera.ground`, `camera.closeup`, `camera.birdeye`),
but those strings are not used for the generated preset names. As a result, a non-English UI
shows English preset names immediately after the user creates a default or dynamic scene set.

**Impact:** Visible localization inconsistency; not a blocker, but it undermines the translated
experience for scene editing.

**Suggested fix:** Move preset-name generation to the UI boundary or map the generated names through
locale keys when presets are applied.

## Discarded Candidates

I checked and did **not** count two earlier low-risk notes from the generated cycle-2 review artifacts:

- `src/components/FileUpload.tsx:52-93` — the current `onTrackLoaded` path in
  `src/app/page.tsx:171-179` does not throw, so the theoretical parse-error mislabeling is not a
  current repro.
- `src/lib/videoEncoder.ts:191-211` — the fallback download path already removes the temporary
  anchor in `finally`, so the cleanup concern does not hold in the live code.

## Summary

- **Real current findings:** 3
- **Critical:** 0
- **High:** 0
- **Medium:** 1
- **Low:** 2
- **Gates:** all green

