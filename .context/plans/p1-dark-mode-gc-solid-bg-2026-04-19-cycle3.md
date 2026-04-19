# P1 - Dark Mode `--gc-solid-bg` Missing (Cycle 3)

**Priority:** P1 — visual bug reducing readability of upload card in dark mode
**Source:** comprehensive-deep-code-review-2026-04-19-cycle3 (NEW-R3-1)
**Estimated effort:** 2 minutes

---

## Findings addressed

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| NEW-R3-1 | Missing `--gc-solid-bg` in dark mode CSS | MEDIUM | `src/styles/vitro-base.css:261-301` |

---

## Problem

The `[data-mode=dark]` block in `vitro-base.css` does not define `--gc-solid-bg`. This variable exists in:
- `[data-mode=light]` (line 219): `--gc-solid-bg: rgba(255, 255, 255, .88)`
- `:root:not([data-mode])` fallback (line 49): `--gc-solid-bg: rgba(255, 255, 255, .88)`

But NOT in `[data-mode=dark]`.

The variable is used in `FileUpload.tsx` line 146:
```tsx
background: 'var(--gc-solid-bg, var(--gc-bg))',
```

In dark mode, `--gc-solid-bg` is undefined, so the fallback `var(--gc-bg)` is used: `rgba(22, 26, 38, .52)` — a semi-transparent background. This makes the map grid visible through the upload card, reducing text readability.

---

## Implementation steps

### 1. Add `--gc-solid-bg` to the dark mode block

**File:** `src/styles/vitro-base.css`

Add `--gc-solid-bg: rgba(10, 13, 20, .92);` to the `[data-mode=dark]` block, after `--upload-overlay` (line 264).

The value `rgba(10, 13, 20, .92)` is chosen because:
- `10, 13, 20` matches the dark mode `--bg` color (`#0A0D14`)
- `.92` opacity provides near-opaque coverage while maintaining a subtle glass effect consistent with the design system

### 2. Verify build passes

```bash
npm run build
```

---

## Verification checklist

- [x] `npm run build` succeeds
- [x] `--gc-solid-bg` added to `[data-mode=dark]` block in `vitro-base.css`
- [ ] Upload card in dark mode has opaque/near-opaque background (needs manual browser verification)

---

## Deferred findings

NEW-R3-2 (Reference grid visible on empty map) overlaps with existing deferred F4. Deferring with same rationale: grid provides visual reference for empty map state; removing it is a design decision. The grid is less visually dominant with full 93-layer CARTO styles.
