# Cycle 7 document-specialist review — 2026-07-24

Target: `216001ff2bc4ff8c31da333e50e6d0e982816b5b`

## Result

One new authoritative documentation mismatch is confirmed. `DOC7-01` is the
same causal root as `CR7-01` and `V7-01`; count it once in the aggregate.

## DOC7-01 — the architecture overview has stale component and ingress contracts

- **Severity:** Low
- **Confidence:** High
- **Status:** Confirmed current documentation defect
- **Documentation:** `.context/project/02-architecture.md:5-43`
- **Source of truth:** `src/components/TrackToolbar.tsx:149-335`;
  `src/components/JourneyCreator.tsx:791-807`;
  `src/components/FileUpload.tsx:79-94`;
  `src/app/page.tsx:416-447`

Two statements in the architecture diagram no longer describe the code:

1. Line 17 calls `TrackToolbar` a theme/locale/reset toolbar. Its current
   primary actions are New Route, Camera, map style, Help, and Export.
   Theme/locale appear only in its mobile overflow settings, and there is no
   Reset-labelled control.
2. Line 27 sends both File Upload and Journey Creator through `parser.ts`.
   FileUpload and sample GPX loading use `parseTrackFile`; JourneyCreator
   instead builds a typed `Track` directly from confirmed waypoints, and
   `handleJourneyComplete` sends it straight to the shared session loader.

### Reader impact

The false combined ingress edge makes `parser.ts` look like a universal
validation boundary. A maintainer can add a parser invariant and incorrectly
believe manually created routes receive it. The component label likewise
obscures the toolbar's actual loaded-session and responsive ownership.

### Fix

Document two ingress branches—parsed files/samples and direct validated
journey assembly—converging at `loadTrackIntoSession()`. Rename the toolbar
description to loaded-session actions and mobile settings, listing the
important actions rather than a nonexistent Reset control.

## Claim audit

| Documentation surface | Compared with | Result |
| --- | --- | --- |
| README stack, commands, supported formats, presets | package/config/parser/export/UI | Aligned |
| Project overview limits, privacy, local map assets | parser policy, styles, CSP/runtime paths | Aligned |
| Architecture component/data-flow overview | component and page call graph | `DOC7-01` |
| Export/camera/trail architecture | controllers, camera, encoder, MapView | Aligned |
| Development and E2E process guidance | package scripts, supervisor, Playwright config | Aligned |
| Locale and guide claims | dictionaries, consumers, text assets | Aligned |

## Deduplication and final consistency sweep

I read the active README/project/development context, package and root config,
workflow and scripts, all production source, locale dictionaries, authored
public assets, test catalogs, and the current/historical plan-review ledgers.
Previously recorded legal authority, platform support, copy, responsive,
parser, camera, export, and process-cleanup items were not refiled.

Cycle 6's four July 24 roots are fixed and separate. Searches across all prior
reviews/plans found no existing record for the direct JourneyCreator bypass in
the diagram or the stale toolbar responsibility label.

The final sweep found no other actionable documentation mismatch. This was a
static document-to-source review under the parent-owned browser constraint.
No server, E2E, Playwright, browser, Chromium, supervisor, deployment,
process-kill, source edit, or plan edit ran.
