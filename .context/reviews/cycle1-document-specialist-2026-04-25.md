# Cycle 1 Document Specialist Review — 2026-04-25

Scope: current working tree, with emphasis on `.context/**`, package scripts, and source files whose behavior is documented there.

## Summary

I found 4 doc/code mismatches or overclaims that should be corrected before the next cycle. The biggest ones are:

1. The conventions doc says every component is client-side, but `src/app/layout.tsx` is still a server component.
2. The project overview/architecture docs still imply the bundled map styles behave like real basemaps, while the shipped styles are flat background-only themes.
3. The input-format docs overstate GPX/KML/Google JSON compatibility now that XML is hard-capped at 1 MB and large Google JSON imports are worker-dependent.
4. The non-tech-traveler review guidance still describes the export pipeline as H.264-only, but the current exporter supports the selected codec (H.264 / H.265 / AV1).

## Findings

### 1) LOW — Conventions doc overstates a fully client-side component model

**Evidence**

- `.context/development/01-conventions.md:15` says: “All components use `'use client'` directive (client-side app)”.
- `src/app/layout.tsx:1-3` has no `'use client'` directive; it is a server layout component by default.
- `src/app/page.tsx:1` and `src/components/*.tsx` are client components, so the rule is only true for the interactive app shell, not for every component file in the repo.

**Failure scenario**

A future contributor reads the conventions doc and assumes `layout.tsx` can freely use browser-only hooks or DOM APIs. That turns into build errors or hydration bugs because the app layout is still server-rendered.

**Severity:** Low  
**Confidence:** High

**Concrete fix**

Tighten the wording to something like: “All interactive UI components under `src/components/` and `src/app/page.tsx` use `'use client'`; `src/app/layout.tsx` remains a server component.”

---

### 2) Medium — Map style docs still imply cartographic basemap context that the shipped styles do not provide

**Evidence**

- `.context/project/01-overview.md:11-14` describes “Map Assets” as “fully local bundled map themes”.
- `.context/project/01-overview.md:91-92` advertises “5 map styles”.
- `.context/project/02-architecture.md:109-112` says normal map display no longer needs third-party map requests.
- `public/map-styles/voyager.json:1-28` and the other bundled styles contain only `sources: {}` and a single `background` layer.

**Failure scenario**

Readers can reasonably assume Voyager/Positron/Dark/Liberty/Bright behave like real basemaps with roads, cities, and terrain. In reality the app renders abstract background colors plus its own route/grid overlays. That creates expectation debt and makes future docs or product copy easy to misread.

**Severity:** Medium  
**Confidence:** High

**Concrete fix**

Rename the doc wording from “map styles” / “map themes” to “background themes” or “abstract local styles” unless the repo ships actual cartographic basemap data. If the current wording is intentional, add one explicit sentence that these styles are background-only and do not include roads/cities/terrain.

---

### 3) Medium — Input-format docs overclaim GPX/KML/Google JSON compatibility without the new size and worker caveats

**Evidence**

- `.context/project/01-overview.md:33-45` lists GPX, KML, and Google Location History JSON as supported input formats, but it does not mention any size or worker constraints.
- `src/lib/parser.ts:544-545` caps XML imports at 1 MB.
- `src/lib/parser.ts:647-660` enforces that limit before parsing and rejects larger GPX/KML files up front.
- `src/lib/parser.ts:553-557` rejects Google JSON larger than 16 MB when the worker fallback is unavailable.
- `src/lib/parser.ts:158-163` and `src/lib/parser.ts:681-701` show GPX/KML still parse synchronously on the main thread via `DOMParser` / `FileReader`.

**Failure scenario**

A perfectly valid GPX export from Garmin/Komoot/AllTrails that happens to be >1 MB is rejected immediately. A large Google Takeout JSON file can also fail earlier than the doc suggests if the worker path is unavailable. The docs currently read like broad format support with no meaningful caveats.

**Severity:** Medium  
**Confidence:** High

**Concrete fix**

Add explicit size/behavior notes to the supported-input section: GPX/KML are limited to 1 MB in the current parser path, and large Google JSON imports depend on the worker path. If those limits are temporary, say so; if they are intentional, surface them in upload copy too.

---

### 4) Low — Non-tech-traveler export guidance still says “H.264 MP4” where the exporter now supports the selected codec

**Evidence**

- `.context/agents/non-tech-traveler-reviewer.md:96-100` says “The encoder writes H.264 MP4 to a `BufferTarget`”.
- `src/lib/videoEncoder.ts:71-85` maps the selected app codec to Mediabunny codecs and builds the MP4 output pipeline generically.
- `src/components/ExportPanel.tsx:371-377` exposes H.264, H.265/HEVC, and AV1 as selectable codecs.

**Failure scenario**

Future review/test authors may only exercise H.264 and miss regressions in H.265/AV1 capability probing or export behavior. The doc also makes the export pipeline sound more constrained than it is.

**Severity:** Low  
**Confidence:** High

**Concrete fix**

Change the sentence to “The encoder writes an MP4 to a `BufferTarget` using the selected codec” and, if needed, add a short note that the smoke path may still default to H.264 in environments where that is the safest choice.

## Net

- No source edits were made.
- The main docs drift is around terminology and compatibility scope, not core app architecture.
- Highest-priority doc updates are the map-style wording and the GPX/KML / Google JSON support caveats.
