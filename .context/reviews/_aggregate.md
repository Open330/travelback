# Aggregate Review — Cycle r6 (2026-04-23)

## Methodology

Cycle r6 ran a source-side multi-agent review on a repo whose last commit is cycle-r5's doc commit `0000000b72`. All six quality gates were green at cycle start. User-injected queue was empty.

Eleven lanes ran in this cycle: code-reviewer, perf, security, critic, verifier, test-engineer, tracer, architect, debugger, document-specialist, designer (UI/UX), accessibility. Per-agent reviews live in `.context/reviews/cycle-r6-*.md`.

---

## GATE STATUS — all green at the start of cycle r6

- ESLint (`npm run lint`): **PASS**
- TypeScript (`npm run typecheck`): **PASS**
- Next.js build (`npm run build`): **PASS** (harden-static-export ran on 3 HTML files)
- `npm run smoke:static`: **PASS**
- `npm run test:e2e:static:ci`: **PASS**
- `npm audit --audit-level=high`: **PASS** (0 vulnerabilities)

---

## NEW FINDINGS — SCHEDULED THIS CYCLE

### R6-AGG-1 (LOW, HIGH) — Focus-visible ring coverage sweep across command surfaces

- **Files** (per file + line):
  - `src/components/ThemeToggle.tsx:63`
  - `src/components/ErrorBoundary.tsx:53,60`
  - `src/components/MapView.tsx:949`
  - `src/components/KeyboardHelp.tsx:25,53`
  - `src/components/TrackToolbar.tsx:94,105,119,129,140,165,175,184,199,207`
  - `src/components/SceneEditor.tsx:358,362,374,378,382,386,450,474,608`
  - `src/components/ExportPanel.tsx:194,228,307`
  - `src/components/GoogleGuide.tsx:281`
  - `src/components/FileUpload.tsx:137`
  - `src/components/Controls.tsx:84,134`
  - `src/components/Toast.tsx:52`
  - `src/components/JourneyCreator.tsx:548,574,601,614,662,715,720,734,742,750,770,774`
  - `src/components/TimelineSelector.tsx:330`
- **Agreement**: designer (UX-1..UX-8), accessibility (A11Y-1..A11Y-13).
- **Evidence**: cycle r3/r4/r5 added `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]` to specific controls. Coverage is inconsistent: primary command surfaces (TrackToolbar action row, Controls play/pause, ThemeToggle, ErrorBoundary recovery) still lack the ring. Landing in one mechanical sweep per-file.
- **Fix**: append the focus-visible triple to each button's className.
- **Schedule**: YES.

### R6-AGG-2 (LOW, HIGH) — Defensive `type="button"` on non-submit buttons

- **Files** (per file + representative line):
  - `src/components/ErrorBoundary.tsx:51,58`
  - `src/components/Controls.tsx:80,130`
  - `src/components/Toast.tsx:52`
  - `src/components/TimelineSelector.tsx:328`
  - `src/components/FileUpload.tsx:132,178,227,249,261`
  - `src/components/SceneEditor.tsx:358,362,373,377,381,385,449,473,607,618,622`
  - `src/components/JourneyCreator.tsx:634,714,719,732,740,748,769,773`
  - `src/components/MapView.tsx:949`
  - `src/components/ThemeToggle.tsx:59`
  - `src/components/KeyboardHelp.tsx:20`
- **Agreement**: code-reviewer (CR-1), critic (CT-1).
- **Evidence**: cycle r5 landed `type="button"` for JourneyCreator cancel (R5-AGG-6). The same defensive posture applies to the other ~30 non-submit buttons in the repo. No present bug, but any future `<form>` wrap flips them into submit buttons.
- **Fix**: add `type="button"` to every non-submit button.
- **Schedule**: YES. Bundle with R6-AGG-1 per-file to minimize diff churn.

### R6-AGG-3 (LOW, MEDIUM) — E2E regression guard for SceneEditor / JourneyCreator region landmarks

- **Files**: `e2e/travelback.spec.ts`.
- **Agreement**: test-engineer (TE-2).
- **Evidence**: cycle r5 added `role="region" aria-labelledby=…` to both panels. Cycle r5 also added an e2e assertion for `<main>` but not for the new regions. A single-assertion-per-panel regression guard closes the loop, matching the pattern cycle-r5 used for `<main>`.
- **Fix**: inside the existing scene-editor test (around L834 or L860), add a `getByRole('region', { name: /Scenes/ })` assertion once the panel is visible. Same for the journey-creator test (around L583).
- **Schedule**: YES.

---

## NEW FINDINGS — DEFERRED

### R6-AGG-D1..R6-AGG-D17 — Cycle-r5 carryovers (unchanged)

All R4-AGG-D1..D13 and R5-AGG-D14..D17 carryovers remain unchanged. No exit criteria have been triggered this cycle.

### R6-AGG-D18 (INFO, MEDIUM) — FileUpload iOS tip appears for Windows touchscreens

- **Source**: critic CT-4.
- **File+line**: `src/components/FileUpload.tsx:242-246`.
- **Original severity / confidence**: INFO / MEDIUM.
- **Reason**: copy is iOS-specific (`fileUpload.iosTip`) but displayed on any touch device. Requires i18n + UA gating or copy rewrite — mid-scope.
- **Exit criterion**: copy-owner signs off on either removing the iOS reference or refining the detection.

### R6-AGG-D19 (INFO, MEDIUM) — TimelineSelector minGap effectively zero at 250k points

- **Source**: critic CT-3.
- **File+line**: `src/components/TimelineSelector.tsx:153-161`.
- **Original severity / confidence**: INFO / MEDIUM.
- **Reason**: not user-visible (downstream `endIdx <= startIdx` guard corrects). Refactor would complicate a hot path.
- **Exit criterion**: if trimming ever produces a 0-point slice from the 250k-point tier.

### R6-AGG-D20 (INFO, MEDIUM) — `seekNonce` ref updated on no-follow path

- **Source**: critic CT-2, tracer T-4.
- **File+line**: `src/components/MapView.tsx:927-930`.
- **Original severity / confidence**: INFO / MEDIUM.
- **Reason**: current behavior correct; refactor risk outweighs cleanliness gain.
- **Exit criterion**: a future design where follow-toggle drives a camera reset without an explicit seek.

---

## AGENT FAILURES

None this cycle.
