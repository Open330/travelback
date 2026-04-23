# Cycle 2 Accessibility Review (2026-04-23, orchestrator run r2)

Scope: WCAG 2.2, keyboard navigation, ARIA roles/states, focus management, live regions, motion preferences, color contrast, screen-reader labels.

## Verified still-good (from cycle 1 + prior cycles)
- GoogleGuide SVG illustrations and ElevationProfile SVG children use `aria-hidden="true"` (`src/components/GoogleGuide.tsx:26,42,59,76,89,102,115`; `src/components/ElevationProfile.tsx:104-125`).
- SceneEditor sliders have `aria-valuetext` (`src/components/SceneEditor.tsx:531,547,566,582`).
- GoogleGuide tablist has full arrow-key navigation (`src/components/GoogleGuide.tsx:289-311`), roving tabindex (`tabIndex={tab === i ? 0 : -1}`).
- Controls progress bar has `aria-valuetext` (`src/components/Controls.tsx:63`).
- Toast container has no redundant `role="log"`; uses `aria-live` with `assertive` for errors and `polite` otherwise (`src/components/Toast.tsx:63-68`).
- ExportPanel `readOnly` bitrate input does not conflict with `aria-disabled` (`src/components/ExportPanel.tsx:341`).
- MapView without a track uses `aria-hidden` + `aria-label` conditionally (`src/components/MapView.tsx:938-941`).
- `prefers-reduced-motion` is honored for pulse-ring and spinner (`src/app/globals.css:46-56`) and checkmark (`:67-71`).
- ErrorBoundary SVG is `aria-hidden` and the dialog has proper heading + action buttons.
- `<meta name="referrer" content="no-referrer" />`.
- All modal dialogs use `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.
- TimelineSelector handles have `role="slider"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label` plus arrow-key/Home/End keyboard support.

## Findings

### R2-A11Y-1 (low) — `Circle` icon in GoogleGuide tip bullets has no `aria-hidden`
- File: `src/components/GoogleGuide.tsx:389`.
- Evidence: `<Circle size={6} fill="currentColor" strokeWidth={0} className="mt-1.5 flex-shrink-0" />` renders as a bullet marker. It lacks `aria-hidden="true"`. lucide-react icons default to `aria-hidden="true"` on the rendered `<svg>` when no accessible name is inferred, but this is implementation-dependent; explicit `aria-hidden` is safer.
- Fix: add `aria-hidden="true"` to `<Circle …/>`. Confidence: **Medium** (minor).

### R2-A11Y-2 (low) — Landing-page heading structure skips levels
- Files: `src/app/page.tsx` (no `<h1>`), `src/components/FileUpload.tsx:191` uses `<h2>` as the first visible heading.
- Evidence: the visible page has an `<h2>` ("Upload Your Track") but no `<h1>`. Per WCAG 2.4.10 (Section Headings) a missing top-level heading is a common finding. The app has no page title as an `<h1>`; the `<title>` element (via Metadata) suffices for browser tab but not for the visual hierarchy.
- Fix: promote the FileUpload title to `<h1>` when on the landing view; when a track is loaded, the track name in `TrackWorkspace.tsx:117-123` can serve as the `<h1>`. Confidence: **Medium**. *Below scheduling threshold; record as deferred.*

### R2-A11Y-3 (low) — JourneyCreator cancel button uses plain `<button>` without explicit `aria-label` in the header
- File: `src/components/JourneyCreator.tsx:545-550`.
- Evidence: the "Cancel" button has visible text "Cancel" (via `t('journey.cancel')`). A screen reader announces "Cancel, button" which is unambiguous in context. No issue.
- **Positive finding.**

### R2-A11Y-4 (low) — `TimelineSelector` histogram bars don't have aria labels
- File: `src/components/TimelineSelector.tsx:306-323`.
- Evidence: histogram bars are decorative; the surrounding card has role=slider children for the actual range handles. Bars are `pointer-events-none`. Adding aria-hidden to the container is possible but redundant with the non-interactive nature.
- **Positive finding.**

### R2-A11Y-5 (low) — `FileUpload` drop-zone focus ring needs visible outline on keyboard focus
- File: `src/components/FileUpload.tsx:132-252`.
- Evidence: the outer drop-zone `<div>` is not keyboard-focusable (as it should be — the `<button>` inside is). DF-C17-018 ("FileUpload drop zone focus indicator") is already deferred for the browse button. This is unchanged.
- **Carry forward DF-C17-018.**

### R2-A11Y-6 (low) — `ExportPanel` swipe-down-to-close has no keyboard equivalent for pointer users with no physical swipe gesture
- File: `src/components/ExportPanel.tsx:86-95`.
- Evidence: the swipe gesture is a mobile convenience; keyboard users get `Escape` via the ModalDialog, and the close button is focusable. Keyboard accessibility is covered.
- **Positive finding.**

### R2-A11Y-7 (low) — `ElevationProfile` SVG has `tabIndex={0}` with arrow-key handler, but no `aria-valuenow` / `role="slider"`
- File: `src/components/ElevationProfile.tsx:94-102`.
- Evidence: the SVG uses `role="img"` and accepts `ArrowLeft/Right/Up/Down` keys to scrub. Because the behavior is seek-on-scrub (not label-a-graphic), `role="slider"` with `aria-valuenow={Math.round(progress*100)}` and `aria-valuemin=0`, `aria-valuemax=100` would better express the interaction to screen readers.
- Fix: change `role="img"` to `role="slider"` and add `aria-valuenow/min/max/text`. Confidence: **Medium**. *Below threshold; record as deferred.*

### R2-A11Y-8 (low) — `FileUpload` drag-over visual is not announced
- File: `src/components/FileUpload.tsx:138-147`.
- Evidence: during drag-over, the card animates with `transform: scale(1.02)` and border color change. No ARIA live region announces this to a screen reader. Drag-and-drop is not expected to be a primary accessibility path (click-to-browse is the primary). Acceptable.
- **Positive finding.**

### R2-A11Y-9 (info) — Color contrast of primary controls uses `rgb(var(--gl))` with white text
- Files: `src/app/globals.css:127-132` (vitro-btn-primary), various `style={{ background: 'rgb(var(--gl))', color: '#fff' }}` inline styles.
- Evidence: the design token `--gl` is defined in `src/styles/vitro-base.css` (not inspected this cycle) and varies by mode. Prior cycles' contrast checks passed. No regression observed.
- **Positive finding.**

## Net assessment
- One new low-severity finding (R2-A11Y-1 — add aria-hidden to Circle icons) is schedulable as a quick win this cycle.
- Two new below-threshold findings (R2-A11Y-2 heading structure, R2-A11Y-7 ElevationProfile role) to be deferred.
- DF-C17-018 remains active.
