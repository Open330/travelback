# Travelback UI/UX Review — Designer

**Scope:** `.context/**`, `package.json`, configs, `src/**`, `e2e/**`, `public/**`, and runtime inspection at `http://127.0.0.1:3105/travelback/`
**Runtime:** Chromium via Playwright on desktop and mobile viewports

## Summary

I found 4 UX/accessibility regressions worth fixing. The app is otherwise coherent and well-structured, but a few structural issues are hurting affordances and mobile clarity.

---

### 1) CSP blocks inline style attributes, stripping key visual affordances

- **File / region:** `src/app/layout.tsx:57-60` and the many `style={{...}}` usages across `src/components/GlobalToolbar.tsx`, `src/components/TrackToolbar.tsx`, `src/components/FileUpload.tsx`, `src/components/Controls.tsx`, etc.
- **Selector / evidence:** In runtime, the selected unit button (`button[aria-label="Metric units"]`) computes to `background-color: rgba(0, 0, 0, 0)` and `color: rgb(0, 0, 0)` instead of the accent-filled active state. Chromium also logs repeated CSP violations for `style-src-attr 'none'`.
- **User-visible problem:** Important active-state styling is lost, so selected controls look unselected. The browser console is also flooded with style violations on every load.
- **Reproduction:** Open the landing page or loaded workspace in Chromium at `http://127.0.0.1:3105/travelback/`. In the console, watch for repeated `Applying inline style violates...` errors. Inspect the units toggle; the selected state is visually flat instead of highlighted.
- **Suggested fix:** Either move critical inline styles to CSS classes / custom properties, or relax the static-export CSP so style attributes are allowed where the app depends on them. Verify the selected-state highlight survives on both landing and loaded states.
- **Confidence:** High
- **Status:** Confirmed

---

### 2) Landing page has no semantic `h1`

- **File / region:** `src/components/FileUpload.tsx:193-197`; `src/app/page.tsx` has no page-level heading.
- **Selector / evidence:** Runtime inspection on the landing page showed `document.querySelectorAll('h1').length === 0`.
- **User-visible problem:** The page’s primary identity (“Travelback”) is only an `h2` inside the upload card, so the document has no top-level heading for screen readers or IA.
- **Reproduction:** Load the landing page and inspect the heading tree. The first meaningful title is an `h2`, not an `h1`.
- **Suggested fix:** Promote the landing title to `h1` or add a visually hidden `h1` in the app shell and keep the card title as supporting content.
- **Confidence:** High
- **Status:** Confirmed

---

### 3) Loaded mobile workspace hides the current track name entirely

- **File / region:** `src/components/TrackWorkspace.tsx:115-121`
- **Selector / evidence:** The title block is `hidden lg:block`, and on a 390px viewport it has zero visible geometry. Runtime body text on mobile showed the workspace chrome but no route name.
- **User-visible problem:** After loading a track on a phone, users lose the current trip’s name and location count. The workspace becomes “anonymous,” which makes orientation and session switching harder.
- **Reproduction:** Load the sample trip on a 390px-wide viewport. The top chrome shows `Camera`, `Export`, and `More controls`, but no visible journey title.
- **Suggested fix:** Add a compact mobile title treatment — e.g. a one-line pill above the controls or inside the top toolbar — so the route name stays visible below `lg`.
- **Confidence:** High
- **Status:** Confirmed

---

### 4) Mobile session controls collapse to low-discoverability affordances

- **File / region:** `src/components/FileUpload.tsx:111-123`, `src/components/GlobalToolbar.tsx:23-26`, `src/components/TrackToolbar.tsx:123-220`
- **Selector / evidence:** On mobile after track load, the top-left session button is a 44×44 icon-only button (`button[aria-label="Load a new track file"]`), and locale/units/theme disappear from the visible toolbar into the `More controls` menu.
- **User-visible problem:** Common tasks become harder to discover on phones: switching files is visually reduced to an icon, and changing units/locale/theme requires an extra menu tap.
- **Reproduction:** Load the sample trip on a narrow viewport. The top-left file action is icon-only, and the only visible toolbar buttons are `Camera`, `Export`, and `More controls`.
- **Suggested fix:** Keep a short visible label for the file-switch action at mobile widths, and surface at least one preference control inline in the loaded toolbar instead of burying all of them in the menu.
- **Confidence:** High
- **Status:** Confirmed

---

## Notes

- Loading, export, dialogs, and i18n were broadly functional in runtime.
- The app’s visual system is cohesive, but the CSP/style-attribute mismatch is undermining some of the intended affordances.
