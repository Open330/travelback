# Cycle 7 verifier review — 2026-07-24

Target: `216001ff2bc4ff8c31da333e50e6d0e982816b5b`

## Verification result

One new claim-to-code mismatch is confirmed. It is the same causal root as
`CR7-01` and `DOC7-01`; aggregate it once. No separate runtime behavior claim
failed verification.

## V7-01 — current source disproves two edges in the architecture overview

- **Severity / confidence / status:** Low / High / Confirmed
- **Claim:** `.context/project/02-architecture.md:17,27`
- **Implementation evidence:** `src/components/TrackToolbar.tsx:149-335`;
  `src/components/JourneyCreator.tsx:791-807`;
  `src/components/FileUpload.tsx:79-94`;
  `src/app/page.tsx:416-447`

| Documented claim | Source trace | Result |
| --- | --- | --- |
| `TrackToolbar` is the theme, locale, and reset toolbar | Desktop actions are New Route, Camera, map style, Help, and Export. Theme/locale are in the mobile overflow settings branch. No Reset control exists. | Contradicted |
| `File Upload / Journey Creator → parser.ts → Track` | FileUpload and sample loading call `parseTrackFile`; JourneyCreator directly assembles `Track` and `handleJourneyComplete` loads it into the session. | Contradicted |

### Failure scenario

The architecture file is repository-owned maintainer guidance. A future
change that assumes parser-wide validation coverage can omit Journey Creator,
because the manual path never enters the parser. The stale toolbar label also
misdirects ownership changes for loaded-session actions and mobile settings.

### Required correction

Show separate parsed-import and direct-creator ingress paths converging at
`loadTrackIntoSession`, and replace the obsolete toolbar description with its
current action/settings responsibility.

## Behavioral verification sweep

I traced the current landing-to-import, direct journey, track replacement,
trim, playback/hotkey, scene preview/commit, map hydration/retry,
export/cancel/save/share, error reset, locale/theme, and cleanup paths against
their tests and user-facing claims. Recent Cycle 6 fixes are represented by
focused regressions and were not refiled. No conflicting implementation
hypothesis survived the final pass.

This contradiction is statically decidable, so no runtime test was needed.
The parent workstream owns browser-capable verification; no server,
Playwright, browser, Chromium, supervisor, deployment, or kill command ran in
this workstream.
