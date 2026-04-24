# Architect — Cycle r10 (2026-04-24)

**Scope:** Architecture review vs cycle-r9 tip `000000046`.

## Summary

No new architectural findings. The codebase architecture is stable after 9
prior review cycles.

## Architecture Status

### Component Hierarchy
- `HomeInner` (page.tsx) remains the central state orchestrator with 20+ hooks.
  This is an acknowledged pattern (deferred DF-C1-001 for potential reducer
  extraction). The current approach is functional and maintainable for the
  app's complexity level.
- Component decomposition is clean: MapView, FileUpload, ExportPanel,
  SceneEditor, JourneyCreator, GoogleGuide, TrackWorkspace, etc.
- State flows top-down via props; callbacks flow bottom-up. No prop drilling
  beyond the single HomeInner -> TrackWorkspace -> child chain.

### Cross-Cutting Concerns
- **i18n:** LocaleProvider context with `useLocale()` hook. Clean separation.
- **Theme:** CSS custom properties + data-mode attribute. No style prop
  conflicts with Tailwind utility classes.
- **Error handling:** ParseError codes for i18n mapping, ErrorBoundary at root,
  toast notifications for user-facing errors, console.error for dev diagnostics.

### Dependencies
- No new dependencies since r9.
- mediabunny for WebCodecs video encoding (stable, actively maintained).
- @tmcw/togeojson for GPX/KML parsing (well-established).

## Deferred (Carryforward)

- DF-C1-001: HomeInner state management refactor (LOW priority)
- DF-C1-002: Prop drilling reduction (LOW priority)

## Conclusion

No new findings this cycle. Architecture is stable and appropriate for the
application's scope.
