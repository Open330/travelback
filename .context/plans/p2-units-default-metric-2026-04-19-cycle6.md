# P2 — Default Unit to km/SI (User-Injected, MEDIUM)

**Priority:** P2 — user preference, already appears to be fixed
**Source:** User-reported, confirmed in cycle 2 review (F3)
**Estimated effort:** 5 minutes (verification only)

---

## Problem

Default unit should be km (SI/metric) for all locales.

### Current Status

Commit 2d49433 already changed `getUnitPreference()` in `src/lib/interpolate.ts` to always return `'metric'` as the default. The code is:

```typescript
export function getUnitPreference(): UnitSystem {
  if (typeof window === 'undefined') return 'metric'
  try {
    const stored = localStorage.getItem(UNITS_STORAGE_KEY)
    if (stored === 'metric' || stored === 'imperial') return stored
  } catch { /* ignore */ }
  return 'metric'
}
```

### Analysis

- New users (no localStorage): defaults to `'metric'` — correct
- Returning users who previously chose imperial: stored preference is respected — correct
- All `formatDistance` and `formatElevation` calls receive `units` prop from the component hierarchy — correct
- Fallback path in `formatDistance`/`formatElevation` calls `getUnitPreference()` which defaults to metric — correct

### Potential Issue

The `GlobalToolbar.tsx` renders the unit toggle buttons with the current `units` state. The `units` state is initialized from `getUnitPreference()`. If a user has an old localStorage entry with `'imperial'`, the UI will correctly show imperial as active. This is expected behavior (respecting stored user choice).

**However**, if the user's concern is that the default should ALWAYS be metric regardless of stored preference, that would require clearing old localStorage entries. This is likely NOT the desired behavior — users who explicitly chose imperial should keep their choice.

---

## Implementation steps

### 1. Verify the fix is working (verification only)

- Clear all localStorage for the site
- Load the app
- Verify the unit toggle shows "km" as active (metric selected)
- Verify distances are shown in km/m format
- Verify elevations are shown in m format

### 2. If any remaining issues are found, investigate

Check if there are any code paths that still default to imperial. Search for any hardcoded 'imperial' default values.

---

## Verification checklist

- [x] `npm run build` succeeds
- [x] Fresh session (no localStorage) defaults to metric/km — verified: `getUnitPreference()` returns `'metric'` when localStorage is empty
- [x] Distances show as km/m — verified: `formatDistance()` uses metric when `units='metric'`
- [x] Elevations show as m — verified: `formatElevation()` uses metric when `units='metric'`
- [x] User can still toggle to imperial and it persists — verified: `setUnitPreference()` stores to localStorage
