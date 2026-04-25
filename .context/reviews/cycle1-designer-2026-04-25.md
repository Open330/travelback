# Designer Review — Cycle 1 (2026-04-25)

Reviewer: UI/UX lane
Framework: Next.js + React + Tailwind
Scope: current working tree, including uncommitted changes
Rules read: `.context/README.md`, `.context/agents/non-tech-traveler-reviewer.md`, plus the touched UI/code paths below

## Inventory Reviewed

### Project / review rules
- `.context/README.md`
- `.context/agents/non-tech-traveler-reviewer.md`
- Existing UX review format in `.context/reviews/cycle7-designer-2026-04-25.md`
- Existing non-technical traveler review in `.context/reviews/cycle7-non-tech-traveler-reviewer-2026-04-25.md`

### Source surface reviewed
- `src/app/page.tsx`
- `src/components/FileUpload.tsx`
- `src/components/ExportPanel.tsx`
- `src/components/ThemeToggle.tsx`
- `src/components/TimelineSelector.tsx`
- `src/components/JourneyCreator.tsx`
- `src/lib/i18n.ts`
- `src/lib/parser.ts`
- `e2e/travelback.spec.ts`

### Live verification used
- Playwright/dev-server smoke checks against `http://localhost:3099/`
- Direct browser probes for focus state, export readiness, and file-size handling

## Overall Impression

Grade: B-

The current working tree is mostly moving in the right direction: the landing/upload language is clearer, the timeline and mobile layouts still behave well, and export guidance is more traveler-friendly than before. But there are two regressions that hurt trust: after loading a trip, keyboard focus drops to the document body instead of a visible control, and the parser now rejects valid GPX/KML files larger than 1 MB. The export dialog also flashes a fake codec error before its support probe finishes, which feels shaky and reads like a failure even on a healthy browser.

## Flow Walkthrough

### 1. Landing / upload

The landing page still has a clear, low-friction entry point. `FileUpload` keeps the call to action obvious, and the recovery hint now tells people what to try after a bad upload (`src/components/FileUpload.tsx:52-87`, `src/components/FileUpload.tsx:288-301`, `src/lib/i18n.ts:63-87`). That is better than a dead-end error. The CTA/button sizing is also solid on touch targets (`src/components/FileUpload.tsx:241-299`).

What changed here is mostly good, but the file-size regression below means the “works with GPX/KML” promise is less reliable for larger real-world files.

### 2. Load / keyboard handoff

This is the clearest accessibility regression in the tree. `loadTrackIntoSession` now sets the live-region announcement but does not move focus to any visible control after the landing surface unmounts (`src/app/page.tsx:253-262`). In the live browser, after loading a sample trip, `document.activeElement` was `BODY`, not a toolbar button or visible workspace control.

That means keyboard users get dropped into a focus void right after the primary action completes. It is disorienting and fails the “where am I now?” test.

### 3. Timeline / trimming / mobile

The timeline selector still works well on desktop and mobile, and the drag flush logic in `TimelineSelector` looks careful rather than buggy (`src/components/TimelineSelector.tsx:202-309`). The existing mobile E2E checks also passed during the live run, so the responsive layout itself looks intact.

### 4. Export

The export panel has a real UX problem now: it opens in a warning state before codec support is known. The current logic treats `codecSupport[codec] === null` as unavailable, so the panel shows the codec warning and disables Start Export until the async probe returns (`src/components/ExportPanel.tsx:108-111`, `src/components/ExportPanel.tsx:138-160`, `src/components/ExportPanel.tsx:409-423`). In the live browser probe, the alert was visible immediately, then disappeared a couple seconds later once the probe completed.

That means the dialog feels broken for a moment even when the browser is fine. Screen-reader users also get an unnecessary alert announcement.

### 5. Dark / light mode

The theme toggle is better than before. The button now reflects the actual mode immediately and uses a neutral label before hydration instead of lying about the icon (`src/components/ThemeToggle.tsx:24-68`). I did not find a new dark/light regression in the live checks.

### 6. i18n / traveler language

The new recovery hints and post-export tips are more traveler-friendly than the old terse errors (`src/lib/i18n.ts:63-87`, `src/lib/i18n.ts:128-137`). The Korean/locale plumbing itself still looks stable. No new locale regression stood out in this cycle.

### 7. Empty / error / loading states

The file-upload error path is stronger than before because it tells people what file type to use next. However, the new XML size cap turns some valid uploads into a hard error, which is a worse kind of empty state: the app refuses to start at all.

## Issue Table

| Severity | Location / selector | What Mina sees / feels | Scenario | Confidence | Concrete fix |
|---|---|---|---|---|---|
| 🟡 Medium | `src/app/page.tsx:253-262` and live probe (`document.activeElement === BODY` after loading) | After I load a trip, focus disappears. I’m on the page, but not on anything I can see. | I tap “Try with a sample trip” or upload a file. The landing UI unmounts, and keyboard focus lands on `body`, so the next Tab press feels random. | High | Move focus after load to a visible, persistent control in the loaded workspace — for example Play, the timeline, or a top-level toolbar button. Keep the live region for announcements only. |
| 🟡 Medium | `src/components/ExportPanel.tsx:108-111`, `src/components/ExportPanel.tsx:138-160`, `src/components/ExportPanel.tsx:409-423`; translation at `src/lib/i18n.ts:136-137`; live probe `dialog["Export Video"] [role=alert]` | The export dialog briefly tells me my browser cannot export, even when it actually can. | I open Export on a normal browser. The alert is shown immediately, Start Export is disabled, then both recover after the codec probe resolves. That feels like a failure flash and slows down perceived performance. | High | Split “probing” from “unsupported.” Show a neutral loading state while codecs are being checked, and only surface the alert if the selected codec actually fails the probe. Keep Start Export disabled only while the result is unknown or truly unsupported. |
| 🟡 Medium | `src/lib/parser.ts:545-659`; live upload of a valid 3.86 MB GPX returned `File is too large (4MB). Maximum size is 1MB.. Use an extracted .json Timeline export, .gpx, or .kml file. ZIP files must be extracted first.` | Real GPX/KML files that are only “moderately large” are now blocked. | I try a long walk/drive file with thousands of points. The app rejects it before parsing, even though it is a valid route export. | High | Restore a larger XML ceiling or move GPX/KML parsing off the main-thread DOMParser path instead of hard-limiting it to 1 MB. If the worker path is the reason for the limit, expose a worker-backed XML parse path rather than shrinking the supported file size. |

## What Works Well

- The landing page is still approachable for a non-technical traveler: big CTA, sample route preview, and a recovery hint for bad uploads (`src/components/FileUpload.tsx:164-301`).
- The mobile layout checks passed in the live browser run, so the responsive header/playback structure still holds.
- Theme toggling no longer lies about the current mode during hydration, which reduces visual mismatch (`src/components/ThemeToggle.tsx:24-68`).
- The export success copy is more useful than generic “done” language: it gives download/share guidance and social-platform tips (`src/components/ExportPanel.tsx:232-287`, `src/lib/i18n.ts:128-137`).
- The timeline selector and journey creator still appear stable under the existing E2E coverage; no new keyboard/touch regression was observed there.

## Verification

### Playwright / live browser results

Command:
- `npm run test:e2e:dev -- --grep "theme toggle persists across page reload|timeline trimming never collapses to a one-point track|timeline keyboard trimming updates the track without scrubbing playback|export panel uses dialog semantics and traps keyboard focus|export panel opens with resolution and codec options|export panel can complete the local export path|shows error for unsupported file format|mobile timeline date labels stay readable inside the range card|mobile header layout keeps the action bar compact after a track loads|landing keyboard flow prioritizes upload actions over the decorative map"`

Result:
- `9 passed, 1 failed`
- Failure: `e2e/travelback.spec.ts:1227` `export panel opens with resolution and codec options`
- Failure cause: `getByText('Codec')` collided with the new codec warning text in the same dialog; the live error snapshot confirmed the warning was present on open

Additional direct browser probes:
- After loading a sample trip, `document.activeElement` was `BODY`.
- Opening Export after loading a normal track showed the codec warning immediately, then it disappeared after the probe completed and Start Export enabled.
- Uploading a valid 3.86 MB GPX produced the size error above and did not proceed to parsing.

### Notes on coverage

- Desktop and mobile responsiveness: verified via the existing Playwright mobile checks plus the live run.
- WCAG 2.2 / keyboard: focus regression is present; other keyboard paths in the existing tests remained intact.
- Empty/error/loading: upload errors improved, but export loading/codec probing needs a clearer non-error state.

## Priority Recommendations

1. Restore a visible, deliberate focus target after track load.
2. Replace the export-panel codec flash with a true loading/probing state.
3. Undo the 1 MB XML cap or make XML parsing worker-backed so larger GPX/KML files still import.
4. Keep the improved recovery hints — they’re a real help — but make unsupported upload errors point users to the exact next step immediately.
5. Add a targeted regression test for “export panel opens without a false unsupported-codec alert” so this doesn’t come back.

## Final Check

- No source files were edited.
- Only this review file was written.
- Current working tree reviewed, live app inspected, and findings grounded in file/line and selector evidence.
