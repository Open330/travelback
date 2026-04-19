# Cycle 2 Refresh Implementation Plan — 2026-04-19

Derived from `.context/reviews/_aggregate.md` (refresh).

## Active findings to address this cycle

### 1. C2-AGG-001 — CRITICAL — Fix CSP to allow CARTO raster tile requests

**Status:** DONE — committed as `b549922`

---

### 2. C2-AGG-002 — MEDIUM — Delete dead `public/theme-init.js`

**Status:** DONE — committed as `1607cea`

---

### 3. C2-AGG-003 — MEDIUM — Remove `navigator.webdriver` debug surface

**Status:** ALREADY FIXED — verified `navigator.webdriver` does not appear in `src/`. Was fixed in a prior cycle.

---

### 4. C2-AGG-004 — HIGH — Parallelize codec checks and cache results

**Status:** DONE — committed as `064f19d` (parallelize + cache) and `134e2a2` (fix lint warning by moving cache to useState initializer)

---

### 5. C2-AGG-005 — MEDIUM — Fix single-point `buildFitBounds`

**Status:** DONE — committed as `6f3d84f`

---

### 6. C2-AGG-006 — MEDIUM — Fix mobile menu ARIA

**Status:** DONE — committed as `9e6b6fe`

---

### 7. C2-AGG-007 — MEDIUM — Fix `<html lang>` SSR/client mismatch

**Status:** DONE — committed as `56951ab`

---

## Quality gates

- `eslint` — PASS (zero errors, zero warnings)
- `tsc --noEmit` — PASS (zero errors)
- `next build` — PASS (compiled successfully, static pages generated)

## Deferred findings (not scheduled this cycle)

See `.context/plans/deferred-findings-cycle2-2026-04-19.md` for the existing deferred list. No new deferred items from this review — all active findings are scheduled above.
