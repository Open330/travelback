# Cycle r5 — architect (2026-04-23)

## Scope

Architectural review of repo structure after cycle-r4 landing `<main>` landmark, dropped meta `frame-ancestors`, drop-zone labeling. Look for boundary violations and cross-cutting drift.

## Findings

### AR-1 (INFO, HIGH) — Component tree boundary is sound

`src/app/page.tsx:312-451` holds a single `<ErrorBoundary><main>…</main></ErrorBoundary>`. Modal siblings (`GoogleGuide`, `ExportPanel`, `KeyboardHelp`, etc.) live outside the `<main>` conceptually via portals (`ModalDialog` uses `createPortal(…, document.body)`). This correctly separates app content (inside `<main>`) from overlays (portal'd to `<body>`). No change needed.

### AR-2 (LOW, MEDIUM) — `FileUpload` still renders inside `<main>` rather than inside `<header>`-type landmark; may be intentional

`FileUpload` is the landing interaction; rendering it inside `<main>` is correct (it is the primary content). No action.

### AR-3 (LOW, MEDIUM) — Scene editor and export panel ARIA roles

`ExportPanel` uses `ModalDialog` (`role="dialog" aria-modal="true"`). `SceneEditor` does NOT use `ModalDialog`; it is a panel absolutely positioned, not a dialog. It has no role assertion. On mobile it occupies up to 70vh and pushes content below; not an accessibility failure per se (panels can be plain landmarks), but a `role="region" aria-label={t('scenes.title')}` would help AT users understand what they landed in. This aligns with the general cycle direction of improving landmark coverage.

- **Schedule**: YES — add `role="region" aria-labelledby="scene-editor-title"` to the `<div data-testid="scene-editor-panel">` and give the existing `<h3>` an `id="scene-editor-title"`.

### AR-4 (LOW, MEDIUM) — `JourneyCreator` panel lacks region role

Same pattern as AR-3. `<div data-testid="journey-creator-panel" …>` at `JourneyCreator.tsx:537`. A dedicated region with aria-labelledby wired to the existing `{t('journey.title')}` span would be consistent.

- **Schedule**: YES — add `role="region" aria-labelledby="journey-creator-title"`; wire the existing span at L542-544 with `id="journey-creator-title"`.

### AR-5 (INFO, HIGH) — No stale references to `<div data-travelback-app-root>` outside the cycle-r4 change

Grep confirmed only `page.tsx:314` writes the attribute; only `ModalDialog.tsx:94` reads it. Tight coupling, and cycle-r4 migration to `<main>` keeps the attribute selector working as documented. No action.

## Confidence summary

Two new schedule items this cycle: AR-3 (scene-editor region) and AR-4 (journey-creator region). Both are small, low-risk, and consistent with the landmark-coverage direction.
