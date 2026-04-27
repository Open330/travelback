# Cycle 11 Architect — 2026-04-27

## Inventory of reviewed files

- All source files in `src/`, `scripts/`, context docs reviewed for architectural concerns.

## Findings

### ARCH11-01 — `parseXml` ordering issue is an architecture concern, not just a bug (same as C11-01)

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/parser.ts:188-198`
- **Detail:** The defense-in-depth model for XML parsing has two layers: `stripXmlEntities` (sanitization) and `preflightXml` (rejection). Currently they run in the wrong order: sanitize first, then reject. This means the rejection guard can never fire for simple DOCTYPE declarations (they're already stripped). The architectural intent was "reject first, then sanitize as defense-in-depth for anything the rejection check missed."
- **Suggested fix:** Restructure `parseXml` to: (1) `preflightXml(text)` — reject on raw input; (2) `stripXmlEntities(text)` — sanitize for DOMParser; (3) `DOMParser.parseFromString(safeText)`. This preserves both layers with correct semantics.

---

### ARCH11-02 — No architectural change since cycle 4; deferred items remain stable

- **Severity:** INFO
- **Confidence:** High
- **Detail:** All 12 deferred architectural findings from cycles 3-4 (Google parser duplication, scene normalization, map layer ownership, session state coupling, etc.) remain unchanged. No new architectural risks introduced. The codebase is stable.
