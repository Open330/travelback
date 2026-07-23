# Cycle 6 architecture review — 2026-07-24

Baseline: `099e85d8860456dea5e59cfa293a12defb27bd99`

## Architecture coverage

I reviewed root/session orchestration, component ownership, imperative
MapLibre boundaries, playback and export controllers, parser/worker parity,
static-export and process boundaries, and the active architecture/history
records. The review traces all tracked production, test, script,
configuration, documentation, workflow, fixture, and public-asset surfaces
and is deduplicated against Cycles 1–5.

## ARCH6-01 — The scene-preview lease has no lifecycle terminal

- Severity: **Medium**
- Confidence: **High**
- Status: **Confirmed from source; same root as CR6-01**
- Regions:
  - `src/components/SceneEditor.tsx:436-650`
  - `src/components/TrackWorkspace.tsx:173-182`
  - `src/app/page.tsx:511-551`
  - `src/lib/usePlaybackController.ts:219-235`

Scene preview is an imperative mutation of the shared MapLibre camera, but
ownership is split across three layers:

```text
CameraParameterSlider event
  -> SceneEditor schedules/publishes midpoint preview
  -> page applies preview to MapView
  -> a later child event may request committed-camera restoration
```

There is no token or state saying that an applied preview is currently owned.
The boolean passed to `endPreview()` predicts whether another callback will
repair the camera. A net-zero pointer gesture predicts a commit, then skips
that commit. Panel unmount cancels future work but cannot identify or undo
work that already published. Global Escape is a valid lifecycle exit and
exposes the same missing terminal.

The durable boundary is a small preview lease:

```text
pending -> applied -> committed
                   \-> restored
                   \-> unmount-restored
```

Only `applied` needs camera restoration. A real commit transfers ownership to
the committed current-progress pose; cancel, no-op, Escape, and unmount
restore it exactly once. Closing an editor that never entered `applied` must
remain camera-neutral.

This differs from the historical preview defect: the parent now handles a
clear correctly. It also differs from export/Journey camera ownership; this
lease belongs to SceneEditor and ends while the same track and map remain
mounted.

## ARCH6-02 — Scene invalidation is keyed to publication, not semantic change

- Severity: **Medium**
- Confidence: **High**
- Status: **Confirmed from source; same root as CR6-02**
- Regions:
  - `src/components/SceneEditor.tsx:202-326,652-704,759-783`
  - `src/app/page.tsx:502-509`
  - `src/lib/useExportController.ts:113-126`

SceneEditor emits arrays as commands, while the page treats every emission as
proof of a domain edit. This couples React identity to export ownership:

```text
pointer moved at least once
  -> emit final scene array
  -> reset export result
  -> set scene state
```

The gesture can return to its exact origin, so the first condition does not
imply semantic change. A completed export is consequently revoked even
though its scene inputs remain byte-for-byte equivalent.

Make scene mutation an explicit transaction whose result is `changed` or
`unchanged`. The gesture layer should suppress an origin-equivalent commit,
and the session boundary should compare canonical scene values before
invalidating expensive artifacts. Export reset should be a consequence of a
real scene revision, not a callback invocation or new array reference.

This is a separate current SceneEditor root from the completed Timeline
no-op fix. The older deferred direct-boundary test item identified missing
coverage, not this concrete net-zero transaction.

## Final architecture sweep

Import replacement, track/session generation, playback and seek, style
hydration/retry, Journey ownership, export leases, parser/worker limits,
static serving/CSP, localization, and supervisor contracts produced no third
new architecture failure. The three explicit host/platform process limits
remain boundaries rather than findings.

Focused SceneEditor and hotkey Vitest coverage passed 30/30. No browser,
server, E2E, supervisor, or deployment command ran.
