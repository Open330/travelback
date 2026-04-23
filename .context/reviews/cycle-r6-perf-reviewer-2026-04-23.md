## Cycle r6 — Performance reviewer

Source-side review against HEAD `0000000b72`.

### PR-1 (INFO, MEDIUM) — `Toast.tsx` ToastItem effect fires once but re-creates the 300ms leave timer

`src/components/Toast.tsx:25-36`. The dismiss-animation timer chain is ok. `dismissTimer` is captured in the closure and cleared only if the component is unmounted after `setTimeout(...300)` scheduled. Under normal user dismiss (clicking X at L52), the parent removes the toast from `messages` — the outer 5000ms `timer` still fires, flips `visible` to false, and schedules a dead `dismissTimer` that calls `onDismissRef.current()` on a toast that was already removed. Since `dismissToast` filter by id is idempotent on missing ids, no crash — but we schedule pointless work. Carry-over; same as cycle-r5 R5-AGG-D15.

No schedule. Confidence MEDIUM.

### PR-2 (INFO, MEDIUM) — `TimelineSelector.buckets` recomputes on every `points` reference change

`src/components/TimelineSelector.tsx:103-121`. Unchanged from cycle r5 (R5-AGG-D16). O(n) bucketing only runs at trim boundaries. Acceptable under the 250k-point max.

No schedule. Confidence MEDIUM.

### PR-3 (INFO, MEDIUM) — `buildReferenceGridData` rebuilds on every style reload

`src/components/MapView.tsx:224-324`. Unchanged from cycle-r5 (R5-AGG-D17). <1 ms cost on common tracks; style cycling is a rare event. Not scheduled.

No schedule. Confidence MEDIUM.

### PR-4 (INFO, HIGH) — `ElevationProfile` SVG recomputes both paths on every progress change

`src/components/ElevationProfile.tsx:30-60`. `pathD`/`areaD` are memoized on `[elevations, hasElevation, cumulDist]`, but the render-level `progressX`, `progressX`-based clipPath `rect`, and the vertical marker line all update on every frame during playback (60 fps for short durations). That is intentional — the clipPath is the render-cheapest way to paint the traveled shading — but the entire SVG re-runs React diff every frame. Same component is already wrapped in React.memo upstream (`TrackWorkspace` calls `ElevationProfile` directly). Not a hot path today; INFO.

No schedule. Confidence HIGH.

### PR-5 (INFO, MEDIUM) — MapView animation effect (L825-932) runs on every progress change

`src/components/MapView.tsx:825-932`. The effect is driven by `progress` so it fires per-frame during playback. Inside, `interpolateAlongTrack` + `buildTrackGeometry` for the trail run each frame. `buildTrackGeometry` rebuilds a GeoJSON LineString/MultiLineString from `0..segmentIndex` + the interpolated tail on every frame. At 60 fps + 10k points that is real work. Nothing has regressed here versus cycle r5; profile-driven followup if/when real-hw LCP/INP data arrives.

No schedule. Confidence MEDIUM.

---

Nothing new scheduled this cycle.
