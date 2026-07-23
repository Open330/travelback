# Cycle 3 non-technical traveler review — Mina

Revision reviewed: `7f013a2`.

## Mina's verdict

**Grade: B+**

The main trip-story flow is much easier to understand than it was before: I can
start with a sample or my own file, play the route, add camera scenes, and get a
real MP4 with a clear saved/downloaded/ready result. The remaining problems in
this pass are concentrated in the little More panel on short screens and one
misleading message that carries over between exports.

## Journey check

| Traveler step | Evidence available in this constrained review | Verdict |
|---|---|---|
| First visit and sample trip | Current source plus accepted Cycle 2 compact-layout/sample-intent gates | Clear; no new issue |
| GPX, KML, and Google Timeline import | Parser/worker/source and test-catalog audit, including supported Google variants; not a fresh live upload | No new issue established |
| Playback, map styles, trimming, and camera scenes | Cross-file source trace and accepted viewport/unit coverage | Understandable and consistent |
| Video export and download | Export controller/panel/encoder trace plus accepted real-MP4 gate evidence | Works conceptually; C3-STATE-02 affects repeat export trust |
| Phone/short-landscape controls | Deterministic DOM/CSS measurement | C3-UX-01 blocks the bottom of More |

The table is explicit about evidence because I was not allowed to run another
browser/E2E session. It must not be read as a new hands-on pass of every file
format.

## What would confuse me

### 1. On a sideways phone, the bottom of More is out of reach

- Root: C3-UX-01
- Priority: P1 / Medium
- Confidence: High, confirmed by layout constraints

At 844×390, More opens downward with about 322px of room. Its controls need at
least 392px even before counting the Units and Language labels. Because neither
the panel nor the page can scroll, I may never reach Language or Theme. If I
use a keyboard, focus can move to something I cannot see.

Make this panel fit the remaining screen and scroll inside itself. Test the
very last control at 320×480 and 844×390, not just whether the More button is
visible.

### 2. My second video can begin with an error from my first video

- Root: C3-STATE-02
- Priority: P2 / Low
- Confidence: High, confirmed by state trace

If Share fails, I see useful advice. But if I choose Export Again and make a
second video, that old warning comes back as soon as the new video finishes,
before I have tried sharing it. I would wonder whether the new video itself is
bad.

Clear Share's result when I start over, and keep the warning on its own line
below Download, Export Again, and Share.

### 3. Resizing with More open can leave me in invisible controls

- Root: C3-A11Y-03
- Priority: P1 / Medium
- Confidence: Medium-high; state/visibility mismatch is confirmed, exact
  browser focus destination still needs the permitted runtime check

The mobile panel can be hidden by the desktop breakpoint without being closed
in the app's state. If I was using a keyboard, the visible desktop toolbar does
not intentionally receive my focus.

Close More when the layout switches and move focus to a control I can see.

## How it compares as a traveler tool

Travelback's strongest point versus the usual activity-map or trip-story flow
is local file handling plus direct MP4 ownership: I do not need an account to
turn a route into a video. Its map/playback controls now feel purposeful rather
than like an editor built only for experts. The short-screen overflow is the
main polish gap because mature mobile control drawers keep every terminal
setting reachable regardless of orientation. The stale Share warning is small,
but outcome messages are where a traveler decides whether a long render was
successful, so they must belong to the current video only.

## Top five priorities

1. Bound and scroll the More panel inside the visual viewport and safe area.
2. Add a short-landscape regression that reaches and hit-tests its final item.
3. Close More and hand off focus when the responsive toolbar mode changes.
4. Reset Share feedback at every new export-session boundary.
5. Preserve the now-clear sample/import and saved/downloaded/ready wording with
   cross-state tests rather than adding more controls or terminology.

## Review/process note

I audited the full current inventory (66 `src`, 11 `scripts`, 21 `e2e` files),
workflow/config/public inputs, Cycle 2 results, explicit P01 deferrals, and
relevant historical reviews. I did not recycle old generic menu-focus findings
or the previously fixed silent Share failure.

I read the browser skill instructions but did not launch a browser: the
permanent next-cycle constraint reserves one Playwright command and prohibits
extra browser-review sessions, and this assignment excluded browser/E2E work.
The reported PID/PGID 11952 Chrome tree was not mine and I left it untouched.
At final read-only inspection, those supplied PIDs were gone and
3099/4173/4183 had no listener. No deploy, code edit, commit, or push occurred.
