# Architect -- Cycle 7 (2026-04-21)

## Methodology

Reviewed architectural patterns, coupling, layering, and design risks across the codebase.

## Architecture Assessment

The codebase follows a clean architecture for a single-page client app:

- **Presentation layer** (components/): React components with Tailwind CSS. Well-decomposed with clear responsibilities.
- **Business logic layer** (lib/): Parser, camera, interpolation, controllers. Pure functions and hooks.
- **Type definitions** (types.ts): Shared types and constants. Clean separation.

Key architectural decisions that are holding up well:
1. Client-side only approach (no server processing) - correct for privacy-sensitive location data
2. Hook extraction (usePlaybackController, useExportController) - keeps HomeInner manageable
3. MapView with imperative handle - correct pattern for canvas/camera control during export
4. ModalDialog portal with focus trap - correct accessibility pattern

## New Findings

### C7-AR-1: TrackWorkspace passes 25+ props -- prop drilling is significant [LOW/LOW]

**File:** src/components/TrackWorkspace.tsx:50-85
**Confidence:** LOW

TrackWorkspace receives 25 props, most of which are forwarded to child components. This is the expected consequence of not using React Context for the track workspace state (noted as DF-C4-001). The prop drilling is verbose but explicit, making data flow easy to trace.

**Verdict:** Defer to DF-C4-001. The current approach is acceptable. Context extraction would be a larger refactor with no functional benefit.

### C7-AR-2: i18n.ts is 1764 lines of flat translation objects [LOW/LOW]

**File:** src/lib/i18n.ts
**Confidence:** LOW

The i18n file contains all 5 locales inline as a single large object. This means all translations are bundled into the client bundle regardless of the user's locale. For 5 locales with moderate coverage, this adds ~30KB to the bundle (gzipped ~5KB), which is negligible.

**Verdict:** Acceptable. Code splitting by locale would add complexity for minimal savings.

## Convergence

No architectural regressions. The codebase architecture is stable and appropriate for the project scope.
