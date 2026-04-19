# P0 — Theme Wrongly Rendered on First Visit (User-Injected, HIGH)

**Priority:** P0 — broken first-visit experience
**Source:** User-reported bug, confirmed in cycle 2 review (F2)
**Estimated effort:** 20 minutes

---

## Problem

Theme is incorrectly rendered on first visit. It only becomes correct after at least one toggle of dark/light mode. After toggling, theme renders normally.

### Root Cause

The inline theme-init script in `layout.tsx` correctly sets `data-mode` on `<html>` before first paint. However, the CSS variable system in `vitro-base.css` defines most variables ONLY inside `[data-mode=light]` or `[data-mode=dark]` selectors. If there is any timing gap between HTML parsing and the inline script executing (or if the script fails for any reason), the CSS variables are undefined, leading to broken rendering.

More specifically, the issue is that the `:root` block in `vitro-base.css` only defines a handful of variables (`--font`, `--accent`, `--ok`, `--err`, etc.), while ALL the visual variables (`--bg`, `--t1`, `--gc-bg`, `--gi-bg`, etc.) are defined exclusively inside `[data-mode=light]` or `[data-mode=dark]` blocks. If `data-mode` is momentarily absent, these variables resolve to their initial values or `unset`, producing broken styles.

The body element has inline styles `style={{ background: 'var(--bg)', color: 'var(--t1)' }}`, which means if `--bg` and `--t1` are undefined, the body renders with browser defaults (white background, black text) regardless of user preference.

### Why the inline script might not protect against this

1. **Static export context:** The HTML is pre-rendered without `data-mode`. The inline script is the only mechanism to set it.
2. **Browser optimization:** Some browsers may begin layout/paint before executing inline scripts, especially with aggressive pre-rendering.
3. **React hydration:** After the inline script runs, React takes over and may briefly remove/reset attributes during hydration.

---

## Implementation steps

### 1. Add CSS fallback values for when data-mode is absent

Add a new CSS block in `vitro-base.css` that provides fallback values for ALL theme variables when `[data-mode]` is not yet set. This ensures the page always renders correctly, even if the inline script is delayed.

**File:** `src/styles/vitro-base.css`

Add after the `:root` block (after line 42), before the `[data-mode=light]` block:

```css
/* ── Fallback: when data-mode is not yet set (before inline script runs) ── */
/* These match light-mode defaults so the page looks correct from first paint */
:root:not([data-mode]) {
  --bg: #EBEEF4;
  --bg2: #E5EAF3;
  --upload-overlay: rgba(180, 190, 210, .52);
  --gc-solid-bg: rgba(255, 255, 255, .88);
  --gs-bg: color-mix(in srgb, white 54%, transparent);
  --gs-bd: rgba(255, 255, 255, .56);
  --gs-sh: 0 4px 20px rgba(17, 24, 39, .10), inset 0 1px 0 rgba(255, 255, 255, .8);
  --t1: #050810;
  --t2: #1C2340;
  --t3: #424E6E;
  --t4: #5A6578;
  --div: rgba(17, 24, 39, .07);
  --gc-bg: color-mix(in srgb, white 72%, transparent);
  --gc-bd: rgba(255, 255, 255, .72);
  --gc-sh: 0 8px 32px rgba(17, 24, 39, .12), 0 2px 8px rgba(17, 24, 39, .06), inset 0 1px 0 rgba(255, 255, 255, .85);
  --gc-hsh: 0 16px 48px rgba(17, 24, 39, .16), 0 4px 12px rgba(17, 24, 39, .08), inset 0 1px 0 rgba(255, 255, 255, .9);
  --gi-bg: color-mix(in srgb, white 76%, transparent);
  --gi-bd: rgba(255, 255, 255, .68);
  --gi-hbg: color-mix(in srgb, white 90%, transparent);
  --go-bg: color-mix(in srgb, white 82%, transparent);
  --go-bd: rgba(255, 255, 255, .76);
  --gi-sh: 0 2px 8px rgba(17, 24, 39, .08), inset 0 1px 0 rgba(255, 255, 255, .8);
  --spec: linear-gradient(180deg, rgba(255, 255, 255, .24), rgba(255, 255, 255, .06) 34%, transparent);
  --mesh-op: .22;
  --mesh-op2: .16;
  --mesh-op3: .09;
  --chat-user: rgba(var(--gl), .12);
  --chat-ai: color-mix(in srgb, white 60%, transparent);
  --bp-bg: #FFF0DB; --bp-fg: var(--p700);
  --bs-bg: #D1FAE5; --bs-fg: #065F46;
  --bd-bg: #FFE4E6; --bd-fg: #9F1239;
  --bw-bg: #FEF3C7; --bw-fg: #92400E;
  --bi-bg: #E0F2FE; --bi-fg: #075985;
}
```

This ensures that when `data-mode` is NOT yet set on `<html>`, all CSS variables still have valid values matching the light mode defaults. Once the inline script runs and sets `data-mode`, the correct mode's variables will override these.

### 2. Fix duplicate CSS properties in [data-mode=light] block

**File:** `src/styles/vitro-base.css`

Remove the duplicate `--gs-bg` and `--gs-bd` declarations in the `[data-mode=light]` block. Lines 173-174 are overridden by lines 184-185. Keep only the second (54%, .56) values and remove the first (62%, .64) values.

### 3. Verify inline script execution order

The inline script in `layout.tsx` is already placed as the first child of `<head>`, which ensures it executes before any CSS or other scripts. Verify this is still the case and that the script is not being deferred or loaded asynchronously.

---

## Verification checklist

- [x] `npm run build` succeeds
- [x] `:root:not([data-mode])` fallback block added with all light-mode variable defaults
- [x] Duplicate `--gs-bg`/`--gs-bd` declarations in `[data-mode=light]` removed
- [ ] On first visit (clear localStorage), the page renders with correct light mode theme immediately (needs manual browser verification)
- [ ] On first visit with prefers-color-scheme: dark, the page renders with dark mode immediately (needs manual browser verification)
- [ ] After toggling theme, it switches correctly (needs manual browser verification)
- [ ] No flash of incorrect theme (FOUC) on page load (needs manual browser verification)
