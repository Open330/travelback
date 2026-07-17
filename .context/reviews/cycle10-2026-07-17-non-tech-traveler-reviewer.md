# Mina's Travelback Review — Cycle 10 (2026-07-17)

## Overall impression — B+

The main journey is pleasantly direct: I clicked the sample, got a route immediately, saw the timeline and elevation, opened Camera, and edited a scene without signing up or sending my trip anywhere. The phone layout also fit in the screen I tested. Travelback still feels much calmer than a full social travel app.

Three trust details hold it back. The big “Travelback” title is not actually the page's main heading for a screen reader. An unnamed GPX, KML, or Google trip can suddenly get an English title after I chose another language. And the fallback export screen can say “Video saved!” even though the app itself only knows that a download was attempted. That last one is the most worrying: I could close the page and discover later that no file exists. A smaller phone annoyance is that Journey Creator's Cancel label has a finger target only about 21px wide.

## Flow walkthrough

1. **Land and choose:** Sample, Browse Files, Draw route, and the Google help path are clearly separate. I could Tab through all eight landing/global controls and see focus. The page title is visually obvious, but assistive heading navigation sees only a level-two heading.
2. **Preview and edit:** The Namsan sample loaded into the map, timeline, elevation view, and playback controls. Camera opened, Add created a scene, and I could change its range to cover the trip. The route sits on a privacy-friendly abstract grid rather than a road map; that is consistent with the local-only design, but first-time travelers may need the expectation stated earlier.
3. **Phone:** At 393×852 the loaded bottom controls fit, did not create sideways page scrolling, and retained about 43px beneath the lowest playback controls in this emulator. In Journey Creator, the mode icons were 44×44 but Cancel was only 20.75×44.09px and looked much smaller than the actions around it. A real iPhone home-indicator/Safari-chrome check is still needed because the emulator reported no safe-area inset.
4. **Language and import names:** Interface dictionaries are broad, but parser-created names `GPX Track`, `KML Track`, and `Google Location History` never enter them. An unnamed import therefore breaks the chosen-language experience at the most prominent label.
5. **Export trust:** Travelback distinguishes a ready video from download methods internally, but the fallback result still gets “Video saved!” even though the encoder returns `saved:false`. The smaller sentence only says the download started; the heading is what makes the promise too strong.

## Issue table

| Severity | Location | What I experience | Recommendation | Confidence |
| --- | --- | --- | --- | --- |
| 🟡 Medium | Landing / `src/components/FileUpload.tsx:259-261` | My screen reader starts with a level-two “Travelback” heading and has no page-level heading to orient me. | Make the existing title the single H1; keep its current look. | High / live confirmed |
| 🟡 Medium | Unnamed imports / `src/lib/parser.ts:214-230`; `src/lib/googleJsonParser.ts:377-380` | After I choose Korean, Japanese, Chinese, or Spanish, the trip title can still become English. | Keep parser names neutral and translate a source-specific fallback in the UI. | High / source confirmed |
| 🟡 Medium | Export fallback / `src/components/ExportPanel.tsx:302-310` | I am told “Video saved!” even when the app cannot confirm that the fallback download produced a file. | Say “Download started” or “Video ready,” keep Download available, and reserve “saved” for confirmation. | High / source confirmed |
| 🟢 Low | Mobile route creator / `src/components/JourneyCreator.tsx:740-750` | Cancel is a narrow, subdued text target—about 21×44px—beside controls that otherwise feel finger-sized. | Give it at least a 44px width/padding and keep the focus style. | High / live confirmed |

## What works well

- The sample-first path removes the question of which file to choose.
- Playback, trim, elevation, Camera, and export are discoverable without an account or tutorial.
- The desktop and tested phone viewport did not scroll sideways; primary controls remained on-screen.
- Landing keyboard focus was visible, and the loaded flow produced no application page error.
- Privacy is tangible: route parsing, maps, and video generation stay in the browser with bundled visual styles.

## Evidence and limitations

| Flow area | Evidence this review | Result |
| --- | --- | --- |
| Landing → sample → loaded route → Camera → scene range | Exact-HEAD isolated app via agent-browser, 1440×900 | Completed |
| Loaded phone layout | iPhone 15 emulation, 393×852 | Completed; no overflow |
| Mobile Journey Creator actions | Same emulation plus computed rectangles | Cancel width failure confirmed |
| Semantic heading and target geometry | Accessibility snapshot plus computed DOM rectangles | H1 failure confirmed; scene endpoint concern rejected |
| GPX, KML, flat JSON, Records, Semantic History, Timeline Edits, Semantic Segments | Fresh exact-HEAD Chromium slice, one worker/retries off | 7/7 representation cases passed |
| Complete KML and Google Records journeys | Same focused slice | 2/2 passed |
| Local export and picker-cancel recovery | Same focused slice | 2/2 passed |
| Nonzero iOS safe area/dynamic Safari chrome | Not representable in this emulator | Manual validation only |
| Final browser/OS save and external share destinations | Not claimed by this pass | Retain device/real-export release gates |

I did not press Share because that can open an external communication surface. I also do not treat a zero-inset emulator as proof of physical iPhone behavior.

## Priority recommendations

1. Make export completion language match what the browser actually confirmed.
2. Localize unnamed GPX, KML, and Google trip titles.
3. Give the landing page one real H1.
4. Make the Journey Creator Cancel action properly finger-sized.

The final Mina sweep covered landing choices, sample import, map/playback/trim/elevation, Camera/scenes, Journey Creator, desktop/mobile containment, keyboard focus, localization fallbacks, export trust, errors/empty states, theme/motion ownership, and recovery. Those four issues are the confirmed points most likely to cost a non-technical traveler confidence.
