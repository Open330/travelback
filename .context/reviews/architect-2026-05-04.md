# Architect Review — Travelback (2026-05-04)

## Summary

The architecture is clean and well-layered for a client-side web application. The component hierarchy matches the data flow. Key architectural decisions (client-side only, WebCodecs export, local map styles) are consistently implemented.

## Findings

### 1. Controller pattern works but creates tight coupling — LOW risk, HIGH confidence
**Files**: `src/lib/usePlaybackController.ts`, `src/lib/useExportController.ts`, `src/app/page.tsx`
**Issue**: The playback and export controllers are custom hooks that own state but are orchestrated by page.tsx. `useExportController` depends on `pausePlayback` and `setPlaybackProgress` from `usePlaybackController`. This creates a dependency graph where the export controller must know about the playback controller's API.
**Suggestion**: Consider a mediator pattern where page.tsx owns progress state and both controllers receive it via options.

### 2. Types.ts mixes type definitions with runtime values — LOW risk, HIGH confidence
**File**: `src/types.ts`
**Issue**: The file contains both TypeScript interfaces/types and runtime constants (MAP_STYLES, DEFAULT_CAMERA_PARAMS, RESOLUTION_PRESETS, CODEC_LABELS, EXPORT_LIMITS). This is a common Next.js pattern but mixes concerns.
**Suggestion**: Low priority. The file is stable and well-organized with clear sections.

### 3. Component-per-file convention is well maintained — LOW risk, HIGH confidence
**Files**: All `src/components/*.tsx`
**Issue**: Each file exports one primary component. Naming follows PascalCase. This convention is consistently applied.
**Suggestion**: None needed.

### 4. Lib module responsibilities are clear — LOW risk, HIGH confidence
**Files**: `src/lib/`
**Issue**: Each lib module has a clear responsibility: parser.ts (file parsing), interpolate.ts (math), camera.ts (camera system), videoEncoder.ts (export), usePlaybackController.ts (playback), useExportController.ts (export lifecycle), i18n.ts (translations), env.ts (configuration), id.ts (ID generation), parse-utils.ts (shared parsing helpers), googleJsonParser.ts (Google JSON formats), test-stub.ts (test helpers).
**Suggestion**: Well-organized. The separation between parser.ts and googleJsonParser.ts is clean.

### 5. Forward ref pattern for MapView is appropriate — LOW risk, HIGH confidence
**File**: `src/components/MapView.tsx:476`
**Issue**: `forwardRef` with `useImperativeHandle` exposes a controlled API surface. This is the correct pattern for a child component that the parent needs to imperatively control (resize, render frame, etc.).
**Suggestion**: The API surface is wide (7 methods) but justified by the export pipeline requirements.

### 6. Static export architecture is sound — LOW risk, HIGH confidence
**Files**: `next.config.ts`, `scripts/harden-static-export.mjs`, `scripts/serve-static.mjs`
**Issue**: The app builds to static HTML/JS/CSS with no server-side runtime. The post-build CSP hardening script ensures security. The serve-static script provides a local preview server.
**Suggestion**: None needed — this is a well-designed deployment model.

### 7. No shared state management library — LOW risk, HIGH confidence
**Files**: `src/app/page.tsx`
**Issue**: The app uses React's built-in useState/useCallback/useRef without Redux, Zustand, or other state management. This is appropriate for the app's complexity level. State flows down from page.tsx as props.
**Suggestion**: The current prop drilling depth (page → TrackWorkspace → Controls → individual buttons) is manageable but approaching the threshold where context would reduce boilerplate.

### 8. CSS architecture uses Tailwind + CSS variables — LOW risk, HIGH confidence
**Files**: `src/app/globals.css`, `src/styles/vitro-base.css`
**Issue**: Tailwind utility classes handle layout and spacing. CSS custom properties (--t1, --bg, --gl, etc.) handle theming. This is a clean separation that enables dark/light mode without Tailwind's dark: prefix.
**Suggestion**: Well-implemented theming approach.

### 9. Worker isolation for large JSON parsing — LOW risk, HIGH confidence
**File**: `src/lib/parser.ts:239-336`
**Issue**: Large JSON files are parsed in a WebWorker with main-thread fallback for small files. The worker receives an ArrayBuffer via transfer (zero-copy). Error handling properly falls back to main-thread parsing for small files.
**Suggestion**: Well-designed with proper fallback chain.

### 10. No API layer or data fetching — N/A
**Issue**: The app is entirely client-side with no server communication. All data comes from user file uploads or the bundled sample GPX. This simplifies the architecture significantly.
**Suggestion**: None needed — this is a core design decision.