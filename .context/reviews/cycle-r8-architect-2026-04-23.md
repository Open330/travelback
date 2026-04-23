# Cycle r8 — Architect (2026-04-23)

## Scope

Architectural review of the modal/overlay layer at cycle-r8 start.

## Observations

1. There remains a two-flavor modal pattern in the codebase:
   - Standard ModalDialog (`ExportPanel`, `GoogleGuide`,
     `KeyboardHelp`) — portals to `document.body`, inert+aria-hidden
     the app root, full focus-trap and Escape wiring.
   - Ad-hoc overlay (`src/app/page.tsx:345-369`) — non-portal, in-app-tree
     overlay that lives alongside the `<MapView>` canvas so that map
     renders are unaffected during capture. Escape-to-cancel added in
     cycle r7.
2. The ad-hoc overlay is intentional: it preserves canvas identity
   while MediaRecorder/WebCodecs hold a reference. Migrating it to
   `ModalDialog.createPortal` is tracked as R7-AGG-D21.

## Findings

### AR8-1 — No new architect findings (INFO)

The export-overlay divergence is understood and tracked; no new
architectural asks this cycle.

## Verdict

No action required this cycle.
