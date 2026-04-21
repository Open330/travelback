# Designer -- Cycle 4 (2026-04-21)

## Summary
The UI design is polished and consistent with the Vitro glass design system. Found 3 UX issues.

## Findings

### DN4-001: Mobile users lose theme/locale/units access when track is loaded [MEDIUM] (Carried: DF-C3-002)
- **File:** `src/components/GlobalToolbar.tsx` line 25
- **Issue:** When `hasTrack` is true, GlobalToolbar is hidden on mobile (`hidden sm:flex`). The only access to theme, locale, and units settings is through the GlobalToolbar. Mobile users with a loaded track have no way to access these settings.
- **Impact:** Medium. Mobile users cannot change theme, locale, or units after loading a track without refreshing the page.
- **Status:** Already deferred as DF-C3-002 / DF-C2-001.

### DN4-002: Select dropdown doesn't match dark theme [LOW] (Carried: DF-C3-006)
- **Issue:** Native `<select>` dropdowns use OS-native rendering which doesn't respect the app's dark theme. The dropdown options appear in the OS's light theme even when the app is in dark mode.
- **Status:** Already deferred as DF-C3-006.

### DN4-003: Export time estimate can be misleading for fast exports [LOW]
- **File:** `src/components/ExportPanel.tsx` lines 105, 352-356
- **Issue:** The estimated export time (`estimatedSeconds = duration * 0.5 * resScale * codecScale`) is a rough heuristic. For short durations (5s) at low resolution with H.264, the estimate might say "~2s" while the actual export takes 10s due to map rendering overhead. The estimate doesn't account for map tile loading time, which is often the dominant factor.
- **Impact:** Low. Users understand that estimates are approximate. But for very short exports, the discrepancy is noticeable.

## Positive Observations
- The Vitro glass design system is consistently applied
- Responsive layout adapts well between mobile and desktop
- Touch-friendly button sizes (min-h-11 = 44px) meet accessibility guidelines
- The modal backdrop blur and overlay create a professional feel
- The export panel's swipe-to-dismiss gesture on mobile is a nice touch
- The error UI in MapView with expandable technical details is user-friendly
