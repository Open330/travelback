# Cycle 12 Architect Review — 2026-04-27

Reviewer: architect
Scope: Architectural/design risks, coupling, layering

## Findings

### ARCH12-01 — `downloadVideo` user activation guard violates separation of concerns

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/videoEncoder.ts:206-207`
- **Detail:** The `downloadVideo` function couples download behavior to transient browser state (`navigator.userActivation.isActive`) that cannot be predicted by the caller. The caller (`useExportController`) has no way to know whether the save dialog will be shown or not. This creates an implicit contract where the same function call produces different UX outcomes depending on how long the preceding async work took. The architectural intent (honor user activation) conflicts with the practical reality (async operations always invalidate activation).
- **Suggested fix:** Move the `hasUserActivation` check to the caller, where the timing context is known. Or remove it entirely and rely on the browser's own enforcement — the `catch` block already handles the fallback.

### ARCH12-02 — Deferred architectural debt remains stable (same as C11-F05)

- **Severity:** INFO
- **Confidence:** High
- **Detail:** The 12+ deferred findings from cycles 3-4 (C3-03 through C3-19) remain unchanged. These are architectural refactors that require dedicated design work. No new architectural risks have emerged this cycle.
- **Suggested fix:** Accept as known technical debt. Re-evaluate only if a specific trigger occurs (e.g., adding new features that would benefit from the refactored architecture).

## Architectural health

- **Coupling:** `page.tsx` (HomeInner) remains the central orchestrator with 30+ state variables. This is a known deferred item (C3-08).
- **Layering:** The parser/interpolate/camera pipeline is well-layered. The export pipeline (useExportController -> videoEncoder -> mediabunny) is properly separated.
- **State management:** React state + refs pattern is consistent across components. The `tRef` pattern for avoiding stale closures is well-applied.
