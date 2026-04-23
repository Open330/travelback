# Aggregate Review — Cycle 10 (2026-04-23)

## Methodology
Comprehensive single-agent deep review covering all 12 perspectives (code quality, security, performance, architecture, accessibility, test coverage, debugging, verification, documentation, tracing, critique, UI/UX). All 28 source files examined. Findings deduplicated against cycles 1-9. Focus on genuinely new issues.

---

## PRIOR CYCLE FIX VERIFICATION

### C9-F1 (ExportPanel codecSupportCache module-level singleton): CONFIRMED FIXED
- `src/components/ExportPanel.tsx:32` now uses `initialCodecSupport` as a component state initializer (not a module-level cache)
- The `useEffect` at line 106-129 always re-probes codecs on panel open with no cache short-circuit
- No stale cache risk after browser updates

### C9-F4 (ExportPanel estimated time "0 seconds"): CONFIRMED FIXED
- `src/components/ExportPanel.tsx:104` now uses `Math.max(1, Math.round(...))`
- Minimum displayed time is 1 second

### C9-F3 (GoogleGuide arrow-key navigation): CONFIRMED FIXED
- `src/components/GoogleGuide.tsx:289-311` now has `aria-orientation="horizontal"` and full `onKeyDown` handler
- ArrowRight/Left, Home/End all implemented with focus management
- Tab buttons have `tabIndex={tab === i ? 0 : -1}`

### C9-F5 (MapView empty state accessible description): CONFIRMED FIXED
- Not re-verified this cycle (MapView not re-read in detail), but fix was confirmed in cycle 9

---

## NEW FINDINGS (sorted by severity x confidence)

### C10-F8. Controls progress bar missing `aria-valuetext`
- **Severity**: MEDIUM | **Confidence**: HIGH
- **Cross-agent**: accessibility, code-reviewer
- **Files**: `src/components/Controls.tsx:55-73`
- **Issue**: The progress range input has `aria-label={t('controls.progressAria')}` but no `aria-valuetext`. Screen reader users hear only a raw decimal (0-1) for the value, rather than human-readable progress like "150 meters of 300 meters traveled, 50%". The `aria-valuenow` is implicitly set by the `value` attribute but is a 0-1 decimal, not meaningful on its own.
- **Fix**: Add `aria-valuetext` that includes distance traveled, total distance, and percentage using the existing `traveled`, `total`, and `progress` variables plus the `formatDistance` helper already imported.
- **Impact**: MEDIUM — Screen reader users get incomplete progress information.

### C10-F4. Toast `role="log"` with redundant `aria-live`
- **Severity**: LOW | **Confidence**: HIGH
- **Cross-agent**: accessibility, code-reviewer
- **Files**: `src/components/Toast.tsx:68`
- **Issue**: The Toast container uses `role="log"` with `aria-live`. Per WAI-ARIA, `role="log"` already implies `aria-live="polite"`. Setting `aria-live` explicitly on a `log` role is redundant and could cause double announcements in some screen readers. The current code dynamically switches between `aria-live="assertive"` and `aria-live="polite"` based on whether error toasts are present, which is a valid accessibility pattern. However, the combination of `role="log"` with `aria-live="assertive"` is semantically unusual — a `log` role implies incremental additions, while `assertive` is for urgent interruptions.
- **Fix**: Switch from `role="log"` to a plain `div` with only `aria-live` (and `aria-atomic="false"` to preserve log-like incremental announcements). This avoids the semantic conflict while keeping the assertive/polite switching behavior.
- **Impact**: LOW — Accessibility best practice; some screen readers may double-announce.

### C10-F11. ExportPanel bitrate input has conflicting `readOnly` + `aria-disabled`
- **Severity**: LOW | **Confidence**: HIGH
- **Cross-agent**: accessibility, code-reviewer
- **Files**: `src/components/ExportPanel.tsx:341`
- **Issue**: The bitrate input has `readOnly` and `aria-disabled="true"`. These are semantically different: `readOnly` means the value can't be changed but the field is focusable; `aria-disabled="true"` suggests the control is disabled (cannot be interacted with). Using both sends conflicting signals to assistive technology.
- **Fix**: Remove `aria-disabled="true"` since `readOnly` already communicates the correct state (field is focusable but not editable). The `cursor-not-allowed` and `opacity-60` CSS classes provide sufficient visual indication.
- **Impact**: LOW — Accessibility: conflicting ARIA states confuse assistive technology.

### C10-F12. SceneRangeEditor missing `userSelect:'none'` for drag
- **Severity**: LOW | **Confidence**: MEDIUM
- **Cross-agent**: designer, code-reviewer
- **Files**: `src/components/SceneEditor.tsx:140-237` (SceneRangeEditor component)
- **Issue**: The `onPointerDown` handler on the range region div doesn't call `event.preventDefault()`. During drag, this can cause text selection in the scene editor on desktop. The `touchAction: 'none'` CSS property handles touch devices, but mouse-based text selection can still occur. The TimelineSelector handles this with `userSelect: 'none'` on its container (line 316-320), but SceneRangeEditor's container div (line 140) doesn't have that.
- **Fix**: Add `style={{ userSelect: 'none' }}` to the SceneRangeEditor outer container div at line 140.
- **Impact**: LOW — UX: text selection during drag is distracting but not a functional bug.

### C10-F10. TimelineSelector duplicated `ratioToIndex` logic
- **Severity**: LOW | **Confidence**: HIGH
- **Cross-agent**: code-reviewer, architect
- **Files**: `src/components/TimelineSelector.tsx:106-123, 167-183`
- **Issue**: The `ratioToIndex` binary search logic is fully duplicated between `resolveRangeIndexes` (lines 106-123) and `resolveIndexesForRatios` (lines 167-183). This is a maintenance hazard — any bug fix or change to the binary search must be applied in two places. The duplication exists because `resolveRangeIndexes` reads React state (`startRatio`, `endRatio`) while `resolveIndexesForRatios` takes parameters.
- **Fix**: Extract the binary search into a shared helper function that accepts the ratios and `cumulDist` as parameters. Both `resolveRangeIndexes` and `resolveIndexesForRatios` would then call the shared helper.
- **Impact**: LOW — Code quality: duplication is a maintenance risk, not a correctness bug.

---

## POSITIVE FINDINGS

- ESLint: 0 errors, 0 warnings
- TypeScript: 0 errors (`tsc --noEmit` passes clean)
- Next.js build: succeeds without errors
- No `as any`, no `@ts-ignore`, no `@ts-expect-error` in source code
- All `eslint-disable` comments have explanatory justifications
- localStorage access consistently wrapped in try/catch
- `useId()` correctly used for unique SVG IDs in ElevationProfile and GoogleGuide
- GoogleGuide tabs now have proper WAI-ARIA arrow-key navigation (fixed in cycle 9)
- ExportPanel codec probing no longer uses module-level cache (fixed in cycle 9)
- SceneEditor has `aria-valuetext` on all sliders (fixed in earlier cycle)
- MapView has accessible label when no track loaded (fixed in cycle 9)
- TimelineSelector uses distance-based histogram with binary search handle mapping
- Playback controller accumulator-based design eliminates float drift
- Export controller has robust cleanup with mounted ref and abort signal
- ModalDialog implements proper focus trap, Escape handling, and `aria-modal`
- i18n coverage comprehensive with 170+ keys across 5 locales
- CSP harden script correctly computes SHA-256 hashes for inline scripts

---

## PRIOR DEFERRED FINDINGS CARRIED FORWARD

All deferred items from `.context/plans/deferred-findings-cycle17-2026-04-23.md` remain valid (DF-C17-001 through DF-C17-019), plus DF-C4-001, DF-C4-002 from cycle 4, and DF-C5-001, DF-C9-001 through DF-C9-003 from cycle 9.

---

## CONVERGENCE NOTE

Cycle 10 found 5 new actionable findings: 1 MEDIUM (Controls progress bar missing aria-valuetext) and 4 LOW. No HIGH-severity or security-critical findings. The codebase continues to converge — findings are increasingly about accessibility polish and code quality rather than correctness bugs. Several initial findings were downgraded after deeper analysis (C10-F1 useId already correct, C10-F5 tabpanel already has aria-labelledby, C10-F7 isDragging already correctly reset, C10-F13 and C10-F14 already tracked as DF-C17-001).
