# Mina's Travelback Review — Cycle 11 (2026-07-17)

Review target: `7273d464fdce24fc06350ce1444c3a2e8d26829d`
Persona: Mina, a non-technical traveler who wants a trustworthy trip video

## Overall impression — B

Travelback still makes a strong first impression. I can try a sample without an
account, understand the map and timeline, play the trip, adjust scenes, and reach
an export-ready screen on my phone. The interface feels quieter than a social
fitness app, and the local-first promise is easy to appreciate. The Cycle 10
repairs are visible too: the page has a proper main heading, active seeking keeps
playing, mobile controls are comfortably sized in the tested viewport, imported
fallback names follow the selected language, and export completion no longer
pretends that an unsaved file was saved.

My confidence drops at the handoff between one action and the next. A rejected
file warning can remain after the sample succeeds, so the page says both
"loaded" and "failed." I can also confirm a hand-drawn route, delete its points,
and still create it. And when Camera is open, the documented Escape key does
nothing if focus is on a normal button. These are not decorative rough edges;
they make me ask, "어? 지금 성공한 거야, 실패한 거야?" That ambiguity is the
main reason this is a B rather than an A-range experience.

## Flow walkthrough

1. **Landing and choosing a route:** The page gives me four understandable
   directions: try the sample, browse for a file, draw a route, or read the
   Google import help. I found all landing/global controls by keyboard, saw a
   focus indication, and the accessibility tree exposed one clear H1.
2. **Uploading and recovering:** An unsupported SVG produced useful, specific
   recovery guidance. But when I then clicked the sample, Namsan loaded while
   the red rejection alert stayed on top of the map. A successful new choice
   should replace the old failure, not sit beside it.
3. **Previewing and editing:** The sample opened into a readable workspace with
   the route, progress, elevation, playback, Camera, and export controls. On the
   tested phone, playback advanced and an active seek continued rather than
   snapping back. Camera and scene editing were discoverable without a tutorial.
4. **Drawing my own route:** Two points correctly let me reach the confirmation
   card, but that card is not really a frozen confirmation. I could still delete
   a marker, see the count fall to one or zero, and press an enabled Create
   button. One point became a `1 / 1` zero-distance trip; zero points became a
   mounted `0 / 0` workspace that could not hydrate a real track. It did **not**
   crash in this review, but it was still a meaningless accepted journey.
5. **Keyboard dismissal:** Camera opened with focus still on the Camera button.
   Escape left the panel open even though the shortcut help advertises Escape as
   the way to close panels. From a traveler perspective, "Esc" is a promise, not
   an optional shortcut.
6. **Export and share:** The mobile export panel fit in the viewport. A local
   developer-only completion stub reached a focused `Video ready` heading,
   truthful "not saved yet" text, a preview, Download MP4, Export Again, and
   Share. I did not activate Share or claim a fresh real file save; both cross
   into device/browser behavior that this pass did not verify.
7. **Phone layout:** At `393x852`, the landing and loaded workspace stayed within
   the document width, the bottom controls remained visible, and the measured
   primary targets were at least 44px high. The emulator reported no nonzero iOS
   safe-area inset, so this is not proof for a physical iPhone with Safari chrome
   and a home indicator.
8. **Language:** The current source retains the Cycle 10 localized imported-name
   repair. I did not freshly replay every locale in this pass, so I treat the
   prior exact-code matrix as historical support rather than saying I saw every
   translation live today.

## Issue table

| Severity | Location | What I experience | Recommendation | Confidence / history |
| --- | --- | --- | --- | --- |
| 🟡 Medium | Journey confirmation / `src/components/JourneyCreator.tsx:336-369,705-721,925-962`; `src/app/page.tsx:332-347,409-412` | I confirm two points, delete one or both while the card is open, and Create still accepts a zero-distance `1 / 1` or non-hydrated `0 / 0` journey. | Freeze the valid confirmation snapshot or revalidate and copy it at Create; disable Create below two points and explain why. | High / fresh, live + source |
| 🟡 Medium | Global keyboard handling / `src/lib/usePlaybackController.ts:199-249`; `src/app/page.tsx:237-259` | Escape does not close Camera when focus is on the Camera button or another ordinary interactive control. | Dispatch topmost-panel dismissal before suppressing playback hotkeys for interactive targets; test the final hidden state. | High / fresh, live + source |
| 🟡 Medium | Import recovery / `src/components/FileUpload.tsx:23-27,64-80,161-190,219-244` | After a rejected file, the sample loads successfully but the red failure alert remains indefinitely. | Clear FileUpload's local rejection state whenever a newer valid sample or import intent succeeds. | High / fresh, live + source |
| 🟡 Medium | Sample/drop ordering / `src/components/FileUpload.tsx:64-66,126-140`; `src/app/page.tsx:414-447,603-610` | I start the sample, then make a newer unsupported drop; the old delayed sample later wins and loads under the newer error. | Invalidate older work before extension preflight, or make one parser path own rejection and intent ordering. | High / reopened incomplete Cycle 2 `AG2-02/P04` |

## What works well

- I can understand and try the product before giving it data or creating an
  account.
- The sample-to-playback path is quick, and the map, elevation, progress, and
  scene controls tell one coherent story.
- Landing and loaded views each expose one accessible main heading; keyboard
  focus is visible on the landing controls.
- The tested mobile viewport has no horizontal page overflow, keeps the core
  controls visible, and preserves finger-sized target heights.
- Active playback survives a seek, confirming the most important Cycle 10
  timeline repair in a current live session.
- Export's completion copy now distinguishes "ready" from "saved," which is the
  right trust model for a browser tool.
- Unsupported-file guidance itself is useful and recoverable; the defect is its
  stale lifetime after a later success.
- Route parsing, bundled map visuals, playback, and video preparation retain the
  clear local-first product direction.

## E2E and journey evidence

| Journey or check | Cycle 11 result | What I am willing to claim |
| --- | --- | --- |
| Landing accessibility and keyboard traversal | Live exact-HEAD Chromium, desktop | One accessible H1; landing/global controls reachable with visible focus |
| Unsupported input -> sample -> loaded workspace | Live exact-HEAD Chromium, desktop | Route succeeds but stale rejection alert remains |
| Journey two points -> confirmation -> point deletion -> Create | Live exact-HEAD Chromium, desktop | Invalid `1 / 1` and `0 / 0` journeys are accepted; zero points did not immediately crash |
| Camera -> Escape with focused trigger | Live exact-HEAD Chromium, desktop | Camera remains open; terminal close behavior fails |
| Delayed sample -> newer unsupported drop | Live exact-HEAD Chromium with page-local fetch delay | Older sample later wins; reopened async edge reproduced |
| Mobile landing, workspace, playback, active seek | Live exact-HEAD Chromium, `393x852` | No horizontal overflow observed; playback and active seek work |
| Mobile export completion | Localhost-only developer stub | Dialog/result UI and truthful unsaved state work; not a real-MP4/save claim |
| Fresh full Playwright, unit, lint, typecheck, worker check | Not runnable from the primary worktree's incomplete existing dependency install | No fresh full-suite pass claimed; commands were not repaired by installing dependencies |
| Cycle 10 accepted matrix on identical application code (`cc720a2`) | Historical: 18 test files / 431 unit tests, 106 development E2E + 106 static E2E, build and real-MP4 evidence | Useful regression provenance only, not relabeled as Cycle 11 execution |
| Physical iOS safe area, browser save picker, external share destination | Not represented here | Keep as manual/device release gates |

## Competitive perspective

This is a positioning comparison, not a fresh feature-by-feature audit of the
other products. Relive represents the expectation of an effortless polished
route story; Strava represents deep activity context and a familiar route
workflow; Polarsteps represents a trip journal that is easy to revisit and
share. Travelback's appealing difference is a focused, private, browser-local
creator without an account. To make that difference convincing, it must be more
deterministic than those broader products: one action should produce one clear
result, confirmation should actually lock a valid trip, and success must erase
obsolete failure language. 지금은 그 마지막 신뢰 한 끗이 부족하다.

## Priority recommendations

1. Enforce the two-point Journey invariant again at Create, using a stable copy
   of the confirmed route.
2. Make every newer file/sample intent invalidate older work and clear obsolete
   local errors, including rejected drops.
3. Make Escape close the topmost advertised panel even when an ordinary control
   has focus, then assert that the panel is actually hidden.
4. Add one composed regression journey for "failure -> newer success" and one
   for "confirm -> mutate -> create"; component-only happy paths will miss both.
5. Keep real iPhone safe-area, real MP4/save, and external-share checks as
   explicit release gates rather than inferring them from desktop emulation.

## Coverage, history, and final sweep

I reviewed the complete 113-path product surface: 56 `src/` source/test paths,
the E2E specification and 19 fixtures, 19 public assets, seven scripts, workflow,
README, manifests/lockfile, and authored configuration. I also read the current
project/development context, Cycle 10 aggregate and completion plan, pending and
deferred ledgers, and the previous role reviews before calling anything new.
That history makes the delayed-sample/unsupported-drop branch a reopened part of
`AG2-02`, while the Journey commit, Escape routing, and stale-success alert are
fresh Cycle 11 roots.

My closing traveler sweep covered landing choices, upload/drop/sample recovery,
all represented import families in source and historical tests, map/style
readiness, timeline/elevation/playback/seek, Camera and scene dismissal, Journey
creation, language ownership, desktop/mobile containment, export truth, save and
share boundaries, empty/single-point behavior, and prior manual/deferred gates.
`M10-01`, `M9-01`, `B01`-`B04`, `D01`-`D04`, and cleanup
`U-2026-07-17-01` keep their existing owners and exits. No fifth distinct
traveler-facing root survived the final deduplication and evidence check.
