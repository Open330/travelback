# Cycle 6 Designer Review — 2026-07-17

Reviewed revision `1d2755c` across landing, loaded route, timeline/elevation/playback, Camera, Export, error recovery, five locales, keyboard semantics, dark/light styling, and 390×844 plus 1440×1000 responsive layouts.

## Method

I followed the `agent-browser`, `agent-browser-config`, `agent-browser-interact`, `agent-browser-query`, `agent-browser-wait`, `agent-browser-network`, `agent-browser-visual`, `agent-browser-debug`, and `agent-browser-state` skill guidance before browser work. The actual-app pass used the isolated current static build, semantic snapshots, keyboard/file interactions, computed geometry, and `elementFromPoint` ownership. Exact geometry was more probative than a screenshot for the overlap; the full Playwright static suite supplied the broader browser pass. No authentication state was needed and no production/external mutation occurred.

## Findings

### DESIGN6-01 — Bottom controls visually and interactively overlap

- Severity: Medium
- Confidence: High
- Classification: Confirmed current static Chromium; WCAG 2.2 SC 2.5.8 failure
- File/region: `src/components/TrackWorkspace.tsx:142-159`; `src/components/TimelineSelector.tsx:683-700`; `src/components/ElevationProfile.tsx:91-105`
- Evidence: at 1440×1000, Timeline is `(16,754,1408,102)`, elevation is `(16,821.69,1408,40)`, and Reset is only `(844.34,843,10,10)`. At 390×844, Timeline is `(16,568.44,358,115.56)`, elevation `(16,634.39,358,40)`, and Reset is 10×45.77. In both cases its center hits the elevation SVG, not Reset. It fails the 24×24 minimum/spacing rule because another target occupies its center.
- Failure scenario: a mouse/touch user sees the reset icon, clicks it, and unexpectedly seeks playback while the range remains trimmed.
- Fix: compose all three bottom surfaces in a single responsive stack; retain visual hierarchy with small gaps, make Reset at least 24×24 (prefer 44px), and test box separation/hit ownership. Avoid solving this with z-index alone because that would leave elevation occluded.

### DESIGN6-02 — Detailed scene corrections are not fully localized

- Severity: Low
- Confidence: High
- Classification: Confirmed
- File/region: `src/components/SceneEditor.tsx:346-385,501-554,626-631`
- Evidence: hardcoded `start:` and `end:` appear in the visible amber warning and polite live status for KO/JA/ZH/ES.
- Failure scenario: an unfamiliar camera editor silently moves a range, then explains the correction in mixed language; this weakens comprehension at the highest-friction moment.
- Fix: localize the full adjustment sentence, not isolated fragments, so word order/punctuation are natural in each locale.

## What remains strong

Landing intent/actions, local-processing guidance, semantic modal focus, 44px primary actions, reduced-motion handling, current-locale loaded status, map attribution safe area, Journey readiness semantics, and vertical export defaults remain coherent. The current 94-pass browser run supports those observations; the opt-in real-WebCodecs case was not claimed.

## Sweep, dedupe, and skipped accounting

A second WCAG/UX sweep covered landmarks, names/roles, focus, keyboard, target geometry, reflow, motion, error/status text, and responsive obstruction. Previous attribution/live-status issues and B01-B04/D01-D04 were not re-reported. Artwork/fonts were visually/build checked rather than source-line reviewed; generated worker and archived context were parity/provenance checked.
