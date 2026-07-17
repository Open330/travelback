# Cycle 9 debugger review — 2026-07-17

## Result

**New confirmed defects: 1.** DB9-01 is the same root as CR9-01/ARCH9-01: scene transition output is discontinuous at touching boundaries and is reset at both ends of internal gaps. No second reproducible failure survived controlled source tracing.

## Reproduction basis

Exact HEAD is `342b8c13`. I read every current source/test/E2E/script/config/public-text file and traced all Cycle 8 changes from `81342b7`; all 913 tracked files were inventoried and historical reports/plans were searched for earlier versions of each hypothesis. The deterministic probes below use the existing straight test track defined at `src/lib/camera.test.ts:15-24`, whose travel bearing is 90°, and two flyover scenes with intentionally different parameters.

## DB9-01 — Boundary selection makes the camera jump backward and replay the blend

- **Location:** `src/lib/camera.ts:540-547,549-576,604-631`; weak regressions at `src/lib/camera.test.ts:255-265,285-295`.
- **Setup:** A has zoom/pitch/bearingOffset `10/20/0`; B has `18/70/90`; `transitionDuration=0.03`; `elapsedSec=0`.

### Touching scenes: A `[0,.5]`, B `[.5,1]`

| Progress | Branch selected | Approximate result |
| --- | --- | --- |
| `.499999` | A outgoing | approaches B-start: `18/70/180°` |
| `.5` | A outgoing, because the first inclusive match wins | exactly B-start: `18/70/180°` |
| `.500001` | B incoming | nearly A-end: `10.0000001/20.0000007/90.0000012°` |

At `.500001`, raw blend progress is `0.000001/0.015 = 1/15000`; smoothstep is about `1.3333e-8`. The camera therefore reverses by roughly 8 zoom levels, 50° pitch, and 90° bearing immediately after having reached B, then performs A→B again over the next 1.5% of global progress.

### Internal gap: A `[0,.4]`, B `[.6,1]`

| Progress | Branch selected | Center/state direction |
| --- | --- | --- |
| `.399999` / `.4` | A outgoing | approaches/is B-start at track `.6` |
| `.400001` | dedicated gap | resets to A-end at track `.4`, then goes A→B |
| `.599999` | dedicated gap | approaches B-start at track `.6` |
| `.6` / `.600001` | B incoming | resets to/nearly A-end at track `.4`, then goes A→B again |

The straight test track makes each `.6→.4` reset about 0.2° longitude, roughly 22 km. Thus the gap path is traversed three times with two backward snaps. Scene deletion/range editing can create this supported layout (`src/components/SceneEditor.tsx:356-405,444-490`).

- **User failure:** default Cinematic/Dynamic presets already expose the touching case with differing camera modes and parameters. Playback consumes the faulty state through `src/components/MapView.tsx:803-817`; export deterministically records it through `src/lib/videoEncoder.ts:228-237`. Internal gaps can cause much larger center jumps.
- **Fix:** resolve one transition interval once. Use a single centered blend for touching boundaries; when `next.start > previous.end`, let the gap branch exclusively own that interval and bypass outgoing/incoming scene zones. Define endpoint ownership explicitly and retain stable rotation endpoint sampling.
- **Tests:** replace existence-only checks with numeric before/at/after assertions using unequal scene parameters. Add monotonic continuity checks at both gap endpoints and a rotation-mode case. The browser scene-motion test selects the one-scene Simple preset at `e2e/travelback.spec.ts:1865-1884`, so it needs either a multi-scene authored path or lower-level numeric coverage.
- **Severity:** Medium.
- **Confidence:** High.
- **Status:** Confirmed by exact branch arithmetic.

## Cycle 8 repairs and rejected hypotheses

All five Cycle 8 fixes remain traceable and their regressions pass. In particular, the parser now retains A→B→A untimed observations, Journey Creator clears movement state and expires one shared 250 ms deadline, locale hydration starts from English, Spanish phrases are corrected, and MapView owns readiness retries until successful hydration.

The final debugger sweep rejected three apparent issues: cumulative-distance plateaus do not cross a disconnected segment under valid canonical arrays because binary search resolves the last plateau point and segment-local bearing clamps endpoints; export finalization retention is the already-documented Mediabunny cancellation limitation rather than a new changed-code bug; and MapView readiness callbacks remove their listener set synchronously after a successful/stale attempt, so no reproduced re-entrant hydration remained.

## Gates

ESLint passed; no-emit TypeScript passed; 17 suites/400 tests passed; worker parity passed; dependency audit reported zero vulnerabilities. No server, browser, build, export, or deployment process was started. Coverage included the complete current code/config/test surface and cross-consumer traces, not a sample.
