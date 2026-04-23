# Cycle 2 UI/UX Review (2026-04-23, orchestrator run r2)

Scope: information architecture, affordances, focus management, WCAG 2.2, responsive breakpoints, loading/empty/error states, form validation, dark/light mode, i18n/RTL, perceived performance.

This review is performed via static code inspection (the model is not operating a browser this cycle, per the multimodal caveat in the cycle rubric). Findings are backed by text-extractable evidence: file paths, line numbers, colors (hex/rgb tokens), ARIA attributes, and viewport queries.

## Information architecture — static scan

Page-level structure (from `src/app/page.tsx:312-445`):
- Map (absolute inset-0).
- Export overlay (inset-0, z-20) — shown only during export.
- File upload card (inset-0, z-10) — shown when no track and no journey creation.
- Global toolbar (top-4 right-4, z-20) — units/locale/theme.
- Keyboard help button (bottom-24 right-4, z-10, sm+ only).
- Journey creator (top-4-to-20 left-4, z-10).
- Track workspace overlay when `track && fullTrack`:
  - Track toolbar (top-4 right-4, z-10).
  - Track title (left-4 right-56 top-4, z-10, lg+ only).
  - Timeline selector (bottom-40 or bottom-36, z-10).
  - Elevation profile + Controls (bottom-0, z-10).

This is consistent with cycle-1 fixes. No new overlap issues identified by static analysis.

## Findings

### R2-UX-1 (low) — Z-index ladder has three distinct layers (z-10, z-20, z-30/z-50) used for overlapping purposes
- Files: `src/app/page.tsx:312-445`, `src/components/ExportPanel.tsx:181` (`z-30`), `src/components/KeyboardHelp.tsx:37` (`z-50`).
- Evidence: GlobalToolbar is z-20; ExportPanel overlay is z-30; KeyboardHelp overlay is z-50. This is intentional (keyboard help must appear above everything). No overlap bugs observed.
- **Positive finding.**

### R2-UX-2 (low) — Track title uses `lg:block` (≥1024px) but on medium screens the title is hidden entirely
- File: `src/components/TrackWorkspace.tsx:117-123`.
- Evidence: `className="hidden … lg:block"`. Between 640px and 1024px there is no track title shown. Screen-reader users still get the track name via other means (the URL bar and `document.title` aren't set, though).
- Fix: show the track title at `sm:block` with smaller typography. Confidence: **Medium**. *Below threshold; record as deferred.*

### R2-UX-3 (low) — `FileUpload` `<Image>` uses fixed `width={960} height={540}` for the landing-preview
- File: `src/components/FileUpload.tsx:161-167`.
- Evidence: Next.js `<Image>` with fixed dimensions scales via CSS. On very small screens the image dominates the card. The wrapping card is `max-w-[20rem]` (320px), so the visual is capped. OK.
- **Positive finding.**

### R2-UX-4 (low) — Loading state for file parse is a spinner; no explicit "parsing X MB of …" message
- File: `src/components/FileUpload.tsx:149-151` + `fileUpload.parsing` i18n key.
- Evidence: "Parsing..." text only. Large Google JSON files (up to 100 MB) can take several seconds; no progress indicator.
- Fix: display the file size during parse. Confidence: **Medium**. *Below threshold; record as deferred.*

### R2-UX-5 (info) — ExportPanel "done" state includes a video preview, share button (when supported), and export-again
- File: `src/components/ExportPanel.tsx:202-245`.
- Evidence: good "after state". `navigator.canShare({files})` is tested with a real (1-byte) File to avoid false positives. Clean.
- **Positive finding.**

### R2-UX-6 (low) — Scene editor presets (Cinematic / Simple / Bird's Eye / Dynamic) trigger a confirm modal if scenes already exist
- File: `src/components/SceneEditor.tsx:373-389`.
- Evidence: `setPendingPresetType` → `ModalDialog` asks for confirmation. Good UX — prevents accidental data loss.
- **Positive finding.**

### R2-UX-7 (low) — Journey creator search input has clear "enable/disable" toggle emphasizing privacy
- File: `src/components/JourneyCreator.tsx:559-623`.
- Evidence: search is explicitly opt-in with messaging about it staying local. Excellent privacy UX.
- **Positive finding.**

### R2-UX-8 (low) — No visible error for unsupported gestures (e.g., pinch-zoom the timeline)
- File: `src/components/TimelineSelector.tsx:298-515`.
- Evidence: only arrow/Home/End keys are handled; pinch-zoom on the timeline isn't supported. No error shown — user just can't zoom. Acceptable.
- **Positive finding.**

### R2-UX-9 (medium) — `DF-C17-017 (mobile density)` remains unscheduled
- Files: multiple components with `sm:` breakpoints.
- Evidence: the mobile layout works but is information-dense. Per DF-C17-017 exit criterion ("a mobile-UX pass"), not in scope this cycle.
- **Carry forward DF-C17-017.**

### R2-UX-10 (low) — `Toast` container positioning (`fixed bottom-28 sm:bottom-24 right-4 z-50`) may overlap with keyboard-help overlay on dismiss
- Files: `src/components/Toast.tsx:68`, `src/components/KeyboardHelp.tsx:37`.
- Evidence: both are z-50. Simultaneous display is possible but benign (keyboard help is centered, toast is bottom-right; they occupy different screen regions).
- **Positive finding.**

## Net UI/UX outcome
- No new blocking UX findings.
- 3 new below-threshold deferrals (R2-UX-2 mid-breakpoint title, R2-UX-4 parse progress, + R2-UX implicit items).
- DF-C17-017 mobile density and DF-C17-018 FileUpload focus indicator continue to apply.
