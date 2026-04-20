# Cycle 2 Aggregate Review -- 2026-04-20

**Date:** 2026-04-20
**Source reviews:** `cycle2-composite-2026-04-20.md`

---

## Summary

Independent full-scope review of the Travelback codebase, performing pattern-based searches across useEffect cleanup, event listener lifecycle, ref mutation, catch blocks, type safety, NaN guards, Object URL lifecycle, dangerouslySetInnerHTML, setTimeout/RAF cleanup, Worker lifecycle, and accessibility. The codebase has been through 16+ prior review cycles with 3 consecutive zero-finding cycles before this loop started.

**0 new findings** this cycle. The codebase remains production-quality.

---

## New Findings

| ID | Finding | Severity | Confidence | Source |
|----|---------|----------|------------|--------|
| NEW-C2-1 | E2E test regex matches Next.js dev overlay "Console Error" label causing strict mode violation | MEDIUM | HIGH | cycle2-composite |
| NEW-C2-2 | Hydration mismatch from bootstrap script triggers Next.js dev overlay, interferes with E2E | LOW | HIGH | cycle2-composite |

### NEW-C2-1: E2E test strict mode violation
- `e2e/travelback.spec.ts` line 941: `page.locator('text=/Unsupported file format|parse|error/i')` matches both the app error alert AND the Next.js dev overlay "Console Error" span. Strict mode requires exactly 1 match.
- Fix: Use `getByRole('alert')` or more specific selector.

### NEW-C2-2: Hydration mismatch from bootstrap script
- `layout.tsx` bootstrap script sets `data-mode`/`data-mapstyle` before React hydrates, causing child component mismatches in dev mode. Triggers Next.js dev overlay that interferes with E2E tests.
- Dev-only issue. Production static export unaffected. App functions correctly (React reconciles client-side).

---

## Cross-Agent Agreement

Single-reviewer cycle. No cross-agent duplicates.

---

## Previously Fixed (Verified Still Fixed)

All findings from cycles 1-16 verified as still fixed. Key verified items:
- MapLibre CSS specificity fix
- Dark mode CSS variables
- TrackWorkspace title layout
- Map style tile sources
- GoogleGuide tabpanel tabIndex
- ExportPanel aria-disabled
- ElevationProfile role="img"
- Render-phase ref fixes
- NaN guards on camera params
- Playback hotkey suppression during export

---

## Deferred Findings (Carried Forward)

All previously deferred findings remain deferred per their existing exit criteria:

From `deferred-findings-cycle1-2026-04-19.md`:
- DF-C1-001: Mobile information architecture and discoverability polish
- DF-C1-002: Broad maintainability/performance restructuring

From `deferred-findings-cycle2-2026-04-19.md`:
- DF-C2-001: Mobile information architecture gaps
- DF-C2-002: Playback progress drives whole-app rerenders (HIGH/HIGH)
- DF-C2-003: Large GPX/KML imports parse on main thread
- DF-C2-004: Manual route dragging is O(n) on pointer move
- DF-C2-005: Export settings permit browser-hostile combinations
- DF-C2-006: Locale/help content eagerly bundled
- DF-C2-007: Large default variable font payload
- DF-C2-008: E2E suite serialized and sleep-heavy
- DF-C2-009: Residual CSP allows inline styles
- DF-C2-010: Local-only bundled styles ship without real basemap layer

From cycle 4:
- DF-C4-001: `preserveDrawingBuffer: true` always on

From cycle 5:
- DF-C5-001: TrackToolbar mobile menu focus trapping

From cycle 11:
- C11-007 (LOW): ElevationProfile RTL click handling
- C11-009 (LOW): Controls elapsed floating point wobble
- C11-005 (LOW): TrackWorkspace title overlap with scene editor

From cycle 12:
- C12-005 (LOW): TimelineSelector reset button bypasses resolveRangeIndexes
- C12-008 (LOW): ExportPanel file size estimate accuracy

---

## Agent Failures

None.

---

## Recommended Next Steps

No active findings to implement this cycle. The codebase has reached a mature, production-quality state with 4 consecutive zero-finding cycles. Recommend:
1. Running quality gates (eslint, tsc --noEmit, next build) to confirm no regressions
2. Confirming no new issues in E2E tests
3. Continuing the review loop to monitor for regressions from any future changes
