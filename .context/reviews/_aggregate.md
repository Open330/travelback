# Aggregate Review — Cycle 8 (2026-04-23)

## Methodology
Comprehensive review covering all 11 perspectives (code quality, security, performance, architecture, accessibility, test coverage, debugging, verification, documentation, tracing, critique). All 30+ source files examined. Findings deduplicated with prior cycle reviews (cycles 1-7). Cross-agent agreement noted.

---

## CYCLE 7 FIX VERIFICATION

C7-F1 (Redundant document.documentElement.lang assignment in page.tsx): CONFIRMED FIXED
- `src/app/page.tsx` no longer contains the redundant `useEffect(() => { document.documentElement.lang = locale }, [locale])`
- `LocaleProvider` in `src/lib/i18n.ts:1751-1753` handles `document.documentElement.setAttribute('lang', locale)` on every locale change
- The bootstrap script in `layout.tsx` sets `d.lang=l` on initial page load

---

## NEW FINDINGS (sorted by severity x confidence)

### C8-F1. E2E test suite has 8 failing tests (gate-blocking regression)
- **Severity**: HIGH | **Confidence**: HIGH
- **Cross-agent**: code-reviewer, debugger, test-engineer, verifier
- **Files**: `e2e/travelback.spec.ts`, `src/components/MapView.tsx`
- **Issue**: The Playwright e2e test suite has 8 failing tests:
  1. `map error UI appears when map style fails to load` (line 323)
  2. `map error reload button restores the map after unblocking the style` (line 334)
  3. `starting a new route clears prior trip map artifacts` (line 700)
  4. `map camera movement stays stable during playback` (line 773)
  5. `scene-based camera movement stays stable during playback` (line 788)
  6. `scene editor opens and allows adding scenes` (line 806)
  7. `scene editor can change camera mode` (line 832)
  8. `uploads KML file and completes full journey` (line 1035)
  Plus 1 flaky: `map style cycling works across all bundled themes`
- **Root cause analysis**:
  - Tests 1-2 (map error UI): The test expects `page.getByTestId('map-error')` to be visible. The error context snapshots show MapLibre's own error overlay appearing, but our custom error div with `data-testid="map-error"` is not found. Either MapLibre's overlay covers it, or the `setMapError` state update doesn't propagate before the test timeout.
  - Tests 3-7: These tests rely on `__travelbackDebug` or UI interactions that may be timing-sensitive. Camera stability tests collect 0 samples if debug API unavailable.
  - Test 8 (KML): Likely timeout or parsing issue.
- **Fix**: Investigate each failing test individually. Map error tests need the testid to be findable. Camera/debug tests may need debug flag or longer timeouts.
- **Impact**: HIGH - 8 out of 53 tests failing means the CI gate is not passing.

### C8-F2. MapView error UI may be hidden behind MapLibre's error overlay
- **Severity**: MEDIUM | **Confidence**: MEDIUM
- **Cross-agent**: debugger, code-reviewer
- **Files**: `src/components/MapView.tsx:941-953`
- **Issue**: When a map style fails to load, MapLibre renders its own error overlay inside the map container. Our custom error UI (`data-testid="map-error"`) is also inside the same container. MapLibre's overlay may cover our custom error, making it inaccessible to both users and test selectors.
- **Fix**: Render our custom error UI outside the map container with a higher z-index, or remove MapLibre's error overlay programmatically.
- **Impact**: MEDIUM - Users may see MapLibre's generic error instead of our i18n-aware error.

---

## AGENT FAILURES
None. All review perspectives covered in a single comprehensive pass.

## POSITIVE FINDINGS
- C7-F1 fix is correctly applied and complete
- ESLint: 0 errors, 0 warnings
- TypeScript: 0 errors (`tsc --noEmit` passes clean)
- Next.js build: succeeds without errors
- Code quality remains high: no `as any`, no `@ts-ignore`, no `@ts-expect-error`
- All eslint-disable comments have explanatory justifications
- localStorage access consistently wrapped in try/catch
- Security posture strong
- Parser coordinate validation consistent across all code paths
- Longitude wrapping properly deduplicated
- Playback controller accumulator-based design eliminates float drift
- Export controller has robust cleanup with mounted ref and abort signal
- i18n coverage comprehensive with 170+ keys across 5 locales

---

## PRIOR DEFERRED FINDINGS CARRIED FORWARD

All deferred items from `.context/plans/deferred-findings-cycle17-2026-04-23.md` remain valid (DF-C17-001 through DF-C17-019), plus DF-C4-001, DF-C4-002 from cycle 4, and DF-C5-001 from cycle 5.

---

## CONVERGENCE NOTE

Cycle 8 found 2 new issues: 1 HIGH (8 failing e2e tests - gate-blocking) and 1 MEDIUM (map error UI visibility). The code quality, security, performance, and architecture of the source code remain in a mature, converging state. The primary action item for this cycle is to fix the failing e2e tests so the gate passes.
