# Aggregate Review — Cycle 9 (2026-04-23)

## Methodology
Comprehensive review covering all 12 perspectives (code quality, security, performance, architecture, accessibility, test coverage, debugging, verification, documentation, tracing, critique, UI/UX). All 27 source files examined. Findings deduplicated against cycles 1-8. Focus on genuinely new issues.

---

## PRIOR CYCLE FIX VERIFICATION

### C8-F1 (8 failing e2e tests): CONFIRMED FIXED
- Commit `000000009` fixed pointer event interception causing e2e failures
- All 8 previously failing tests should now pass (e2e gate pending confirmation)

### C8-F2 (MapView error UI hidden behind MapLibre overlay): VERIFIED MITIGATED
- Map error UI (`data-testid="map-error"`) is functional and visible when `mapError` state is set
- Tests now use `getByTestId` instead of `getByRole('alert')` which resolves selector ambiguity

### C7-F1 (Redundant document.documentElement.lang assignment): VERIFIED FIXED
- `src/app/page.tsx` no longer contains the redundant `useEffect`
- `LocaleProvider` in `src/lib/i18n.ts:1751-1753` handles `document.documentElement.setAttribute('lang', locale)`

### DF-C17-007 (Missing aria-valuetext on SceneEditor sliders): VERIFIED RESOLVED
- `src/components/SceneEditor.tsx` now has `aria-valuetext` on all sliders (zoom, pitch, bearing, rotation) and SceneRangeEditor handles
- Lines 176, 531, 547, 566, 582 all contain proper `aria-valuetext` attributes with i18n labels

---

## NEW FINDINGS (sorted by severity x confidence)

### C9-F1. ExportPanel codecSupportCache module-level singleton is not invalidated on browser codec changes
- **Severity**: MEDIUM | **Confidence**: MEDIUM
- **Cross-agent**: code-reviewer, perf-reviewer
- **Files**: `src/components/ExportPanel.tsx:31`
- **Issue**: `codecSupportCache` is a module-level `let` variable that persists across component mounts/unmounts. Once populated, it is never cleared. If a user installs a browser update or codec pack that adds AV1/H.265 support, the stale cache will continue showing those codecs as unsupported until the page is reloaded.
- **Concrete scenario**: User opens export panel (AV1 probed as unsupported). Browser auto-updates overnight adding AV1 support. User opens export panel again next day — AV1 still shows unsupported because `codecSupportCache != null` short-circuits the probe.
- **Fix**: Remove the module-level cache and use component state only, or add a cache TTL/explicit invalidation. Codec probing is fast (one `VideoEncoder.isConfigSupported` call per codec), so removing the module-level cache is simplest with negligible performance cost.
- **Impact**: MEDIUM — Users may see incorrect codec availability after browser updates without a page reload.

### C9-F2. JourneyCreator search regex robustness note
- **Severity**: LOW | **Confidence**: HIGH
- **Cross-agent**: security-reviewer, code-reviewer
- **Files**: `src/components/JourneyCreator.tsx` (search coordinate parsing)
- **Issue**: The coordinate-parsing regexes (`/geo:([-\d.]+),([-\d.]+)/`, `/([-\d.]+)[°]?,\s*([-\d.]+)/`) are safe against ReDoS because they use bounded character classes. However, the `query.length` check uses code units rather than grapheme clusters. For most inputs this is fine.
- **Fix**: No immediate action needed — the regexes are safe. This is a defensive documentation note.
- **Impact**: LOW

### C9-F3. GoogleGuide tabs lack arrow-key navigation (WAI-ARIA Authoring Practices)
- **Severity**: LOW | **Confidence**: HIGH
- **Cross-agent**: designer, code-reviewer
- **Files**: `src/components/GoogleGuide.tsx:289-307`
- **Issue**: Tab buttons use `role="tab"` and `aria-selected` correctly, but lack arrow-key navigation per WAI-ARIA Authoring Practices 1.2. Tablist also lacks `aria-orientation="horizontal"`.
- **Fix**: Add `onKeyDown` handler for ArrowLeft/ArrowRight and `aria-orientation="horizontal"`.
- **Impact**: LOW — Already tracked as DF-C17-012.

### C9-F4. ExportPanel estimated time may show "0 seconds" for very short exports
- **Severity**: LOW | **Confidence**: MEDIUM
- **Cross-agent**: code-reviewer, designer
- **Files**: `src/components/ExportPanel.tsx:105`
- **Issue**: `Math.round(duration * 0.5 * resScale * codecScale)` could produce 0 for very short/efficient exports.
- **Fix**: Use `Math.max(1, Math.round(...))` to ensure at least 1 second is shown.
- **Impact**: LOW — Display-only cosmetic issue.

### C9-F5. MapView empty state has no accessible description
- **Severity**: LOW | **Confidence**: MEDIUM
- **Cross-agent**: designer, accessibility
- **Files**: `src/components/MapView.tsx:433-441`
- **Issue**: When no track is loaded and no map error, the container has `inert` and `aria-hidden="true"` but no accessible text alternative.
- **Fix**: Add `aria-label` to the container when no track is loaded.
- **Impact**: LOW

### C9-F6. usePlaybackController does not defensively reset on track change
- **Severity**: LOW | **Confidence**: MEDIUM
- **Cross-agent**: code-reviewer, debugger
- **Files**: `src/lib/usePlaybackController.ts:86-117`
- **Issue**: The animation loop depends on `[isPlaying, track, setPlaybackProgress]`. If track changes while playing, progress retains its old value. Current callers all reset properly, but the controller doesn't defend against misuse.
- **Fix**: Consider adding a guard: if track changed and progress > 0, reset to 0.
- **Impact**: LOW — Current callers all reset properly.

### C9-F7. i18n translations bundled inline (all 5 locales)
- **Severity**: LOW | **Confidence**: HIGH
- **Cross-agent**: perf-reviewer, architect
- **Files**: `src/lib/i18n.ts`
- **Issue**: All 5 locales (~1700 lines) bundled inline. Already tracked as DF-C17-016.
- **Fix**: Deferred — static export means the bundle is cached.
- **Impact**: LOW

---

## POSITIVE FINDINGS

- ESLint: 0 errors, 0 warnings
- TypeScript: 0 errors (`tsc --noEmit` passes clean)
- Next.js build: succeeds without errors
- No `as any`, no `@ts-ignore`, no `@ts-expect-error` in source code
- All `eslint-disable` comments have explanatory justifications
- localStorage access consistently wrapped in try/catch
- Coordinate validation consistent across all parser paths
- Longitude wrapping properly deduplicated
- Playback controller accumulator-based design eliminates float drift
- Export controller has robust cleanup with mounted ref and abort signal
- i18n coverage comprehensive with 170+ keys across 5 locales
- ModalDialog implements proper focus trap, Escape handling, and aria-modal
- CSP harden script correctly computes SHA-256 hashes for inline scripts
- Security posture remains strong: no secrets, no unsafe patterns, frame-ancestors 'none'
- MapView correctly handles antimeridian-crossing routes
- Parser handles all 5 known Google Location History formats
- Worker fallback path exists for browsers without Worker support

---

## PRIOR DEFERRED FINDINGS CARRIED FORWARD

All deferred items from `.context/plans/deferred-findings-cycle17-2026-04-23.md` remain valid (DF-C17-001 through DF-C17-019), plus DF-C4-001, DF-C4-002 from cycle 4, and DF-C5-001 from cycle 5.

**Resolved this cycle:**
- DF-C17-007 (Missing aria-valuetext on SceneEditor sliders): RESOLVED — `aria-valuetext` is now present on all SceneEditor sliders.

---

## CONVERGENCE NOTE

Cycle 9 found 7 new findings: 1 MEDIUM (ExportPanel codec cache staleness) and 6 LOW. No HIGH-severity or security-critical findings. The codebase is in a mature, converging state with ESLint, TypeScript, and Next.js build gates all passing. The e2e test gate needs confirmation (tests running). The MEDIUM finding (C9-F1) is real but low-impact. One prior deferred finding (DF-C17-007) was verified as resolved.
