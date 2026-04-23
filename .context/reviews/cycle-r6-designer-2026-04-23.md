## Cycle r6 — Designer (UI/UX)

Source-side review; no browser automation this cycle.

### UX-1 (LOW, HIGH) — ErrorBoundary fallback CTA row lacks focus-visible ring styling

`src/components/ErrorBoundary.tsx:51-64`. Both buttons (`tryAgain`, `reloadPage`) inherit whatever `.gi` and `.vitro-btn-primary` provide. Cycle r3/r4/r5 added explicit `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]` to other controls. ErrorBoundary buttons don't have it.

This is a failure-mode UI the user sees only when everything else has crashed. Keyboard navigation must work there — that's when the user most needs the reload escape hatch. Add explicit focus ring.

**Fix**: append `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]` to the tryAgain button and the reloadPage button classNames.

Schedule: YES. Confidence HIGH.

### UX-2 (LOW, MEDIUM) — MapView reload button in map-error view lacks focus-visible ring

`src/components/MapView.tsx:949-951`. `className="gi mt-4 min-h-11 px-4 py-2 text-sm cursor-pointer"` — no explicit focus ring. Same reasoning as UX-1: this button is rendered when the map fails, so keyboard-only recovery is the primary use case.

**Fix**: append `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]`.

Schedule: YES. Confidence HIGH.

### UX-3 (LOW, HIGH) — KeyboardHelp open button at KeyboardHelp.tsx:20 lacks focus-visible ring

`src/components/KeyboardHelp.tsx:20-30`. The help toggle (only shown when `hasTrack`) is a fixed-position button with `cursor-pointer`. No focus-visible utility. Keyboard users press Tab to reach it and get no visual feedback.

**Fix**: add `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]` to the button className.

Schedule: YES. Confidence HIGH.

### UX-4 (LOW, MEDIUM) — Primary action row buttons in TrackToolbar lack focus-visible rings

`src/components/TrackToolbar.tsx:90-132`. The four top-level buttons (New, Camera, Map style, Export) on desktop all use `.gi` or `.vitro-btn-primary` class and rely on the base style for focus. Spot-checking the rendered output against R3/R4/R5's pattern: the other `.gi` controls have explicit `focus-visible:outline-…` utility. These do not.

Risk: keyboard-only users can tab to these controls but the focus indicator is inconsistent with the rest of the app.

**Fix**: append `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]` to each of the four buttons + the mobile hamburger (L135-144) + the three mobile menu items (L161, L171, L180) + the units buttons (L196, L204).

Schedule: YES but bundle this with UX-1/UX-2/UX-3 as a single "focus ring coverage" landing. Confidence HIGH.

### UX-5 (LOW, MEDIUM) — SceneEditor close button lacks focus-visible ring

`src/components/SceneEditor.tsx:362-366`. `rounded-full cursor-pointer` without focus-visible utility.

**Fix**: append the standard focus-visible utility.

Schedule: YES.

### UX-6 (LOW, MEDIUM) — ExportPanel close button lacks focus-visible ring

`src/components/ExportPanel.tsx:190-199`. `rounded-full cursor-pointer` without focus-visible utility. Inside a modal with focus trap, but the first focusable target (body) doesn't visually indicate where focus lands on open.

**Fix**: append the standard focus-visible utility.

Schedule: YES.

### UX-7 (INFO, HIGH) — GoogleGuide close button already has focus ring inherited from ModalDialog focus trap

`src/components/GoogleGuide.tsx:278-287` — no explicit focus-visible utility but this button is inside a modal. Modal focus trap is working (per cycle-r4/5 e2e tests). Add a focus-visible utility for consistency.

Schedule: YES (bundle). Confidence MEDIUM.

### UX-8 (INFO, HIGH) — KeyboardHelp close-X button inside modal

`src/components/KeyboardHelp.tsx:49-57`. Same as UX-7 — works via focus trap but lacks explicit focus-visible. Bundle.

### UX-9 (INFO, HIGH) — ThemeToggle button

`src/components/ThemeToggle.tsx:59+`. Not read in this cycle's Read calls but listed under focus-visible grep. Spot-check would confirm. Not scheduled.

---

Scheduling recommendation: Bundle UX-1..UX-8 into one "focus-visible coverage across command surfaces" landing. This mirrors cycle r3's pattern of a single sweep.
