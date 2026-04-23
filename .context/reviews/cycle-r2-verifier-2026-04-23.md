# Cycle 2 Verifier Review (2026-04-23, orchestrator run r2)

Evidence-based verification of stated behaviors against actual code.

## 1. Offline/local-only product contract

Claim (`.context/project/02-architecture.md:107-113`): normal map display needs no third-party map requests.

Verification:
- `public/map-styles/voyager.json`, `positron.json`, `dark.json`, `liberty.json`, `bright.json` — all have `"sources": {}` and a single background layer only. Confirmed.
- `src/app/layout.tsx:62` dev CSP: `connect-src 'self'` with no external hosts. Confirmed.
- `scripts/harden-static-export.mjs:19` production CSP: `connect-src 'self'`. Confirmed.
- `scripts/smoke-static.mjs:105-129` `assertMapStylesPinnedLocally` would throw if sources re-appeared. **Verified green** this cycle.

**Verdict: CONSISTENT.**

## 2. Static export CSP hardening

Claim (`.context/project/02-architecture.md:114-118`): dev uses `unsafe-inline` placeholder; production replaces it with hash-based script-src via post-build script.

Verification:
- `src/app/layout.tsx:55-63` comment documents the dev CSP placeholder with `data-travelback-csp="placeholder"`.
- `scripts/harden-static-export.mjs:52-75` computes sha256 hashes of all inline `<script>` tags, replaces the CSP meta with `data-travelback-csp="static-export"`.
- `scripts/smoke-static.mjs:76-103` verifies the replacement happened and no `unsafe-inline` remains. **Verified green** this cycle.

**Verdict: CONSISTENT.**

## 3. Privacy note about frame-ancestors

Claim (architecture.md:117): "production deployments should still send host-level anti-framing headers because meta CSP alone is not sufficient for that control."

Verification:
- Mitigation: the inline bootstrap script at `layout.tsx:49` implements a JS-based frame-breaker (`if(window.top!==window.self){…window.top.location=…; …about:blank}`). Fires before React hydrates.
- Residual risk: a parent page using `sandbox="allow-scripts"` without `allow-top-navigation` would still see `about:blank` render, which is the safe fallback.

**Verdict: CONSISTENT with the documented mitigation.**

## 4. Accumulator-based playback

Claim (`src/lib/usePlaybackController.ts:86-117`): accumulator-based progress avoids floating-point drift and frame-rate dependency.

Verification:
- `startTimestampRef` and `startProgressRef` are set when play starts (:94-95).
- Each `animate(now)` frame computes `nextProgress = startProgress + (elapsedSec * speed) / duration` — uses wall-clock elapsed time, not dt accumulation.
- Complete and done at progress >= 1, stops RAF.

**Verdict: CONSISTENT.**

## 5. Export pipeline — frame capture waits for idle

Claim (`.context/project/02-architecture.md:55-60`): for each frame, apply camera → wait for idle → capture.

Verification:
- `src/lib/videoEncoder.ts:93-133`: loop body is `computeCameraForProgress → renderFrame (apply + setPlaybackProgress) → abort check → waitForIdle → videoSource.add(timestamp, frameDuration) → onProgress`.
- `src/lib/useExportController.ts:133-149`: passes `waitForStableMap` which wraps `mapHandle.waitForIdle` with a 2-timeout policy.
- `src/components/MapView.tsx:486-540`: `waitForIdle` with 5s timeout, abort signal, and "already idle" short-circuit.

**Verdict: CONSISTENT.**

## 6. Accessibility claims from cycle-1 fixes

Claim: GoogleGuide SVGs marked aria-hidden, Controls progress bar has aria-valuetext, etc.

Verification (re-scan of current code):
- `src/components/GoogleGuide.tsx:26,42,59,76,89,102,115` — `aria-hidden="true"` on the 7 illustration SVGs. Confirmed.
- `src/components/ElevationProfile.tsx:104,111,113,118,124` — `aria-hidden="true"` on defs/area/path/clip/line. Confirmed.
- `src/components/Controls.tsx:63` — `aria-valuetext` on progress input. Confirmed.
- `src/components/SceneEditor.tsx:531,547,566,582` — `aria-valuetext` on 4 sliders. Confirmed.
- `src/components/Toast.tsx:68` — no `role="log"`; uses `aria-live` only. Confirmed.
- `src/components/ExportPanel.tsx:341` — bitrate uses `readOnly` without `aria-disabled`. Confirmed.
- `src/components/MapView.tsx:938-941` — conditional `aria-hidden` + `aria-label` when no track. Confirmed.

**Verdict: CONSISTENT with cycle-1 claims.**

## 7. Gate status claims

Claims (cycle-1 aggregate, now this cycle): lint 0/0, typecheck 0 err, build OK, audit 0, smoke OK, e2e pass.

Verification (this cycle's run):
- `npm run lint`: PASS (0/0).
- `npm run typecheck`: PASS.
- `npm run build`: PASS; harden-static-export hardened 3 HTML files.
- `npm audit --audit-level=high`: 0 vulnerabilities.
- `npm run smoke:static`: PASS.
- `npm run test:e2e:static:ci`: PASS (exit 0).

**Verdict: CONSISTENT. Green this cycle.**

## Net verification outcome
All stated behaviors are accurately reflected in the current code and artifacts. No inconsistencies detected between docs and code.
