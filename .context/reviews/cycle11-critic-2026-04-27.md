# Cycle 11 Critic — 2026-04-27

## Inventory of reviewed files

All major source files in `src/`, `scripts/`, and context docs.

## Findings

### CR11-01 — Failing unit tests represent a broken CI gate (cross-cutting with C11-01, TE11-01, DBG11-01)

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/parser.test.ts`, `src/lib/parser.ts`
- **Detail:** The DOCTYPE rejection tests fail because `stripXmlEntities` runs before `preflightXml`, as identified by code-reviewer, security-reviewer, debugger, and test-engineer. This is the most actionable finding in this cycle — it represents both a security posture issue and a broken test gate.
- **Suggested fix:** Swap the execution order in `parseXml` to check raw text first.

---

### CR11-02 — Carried deferred findings show diminishing returns from repeated review

- **Severity:** INFO
- **Confidence:** High
- **Detail:** 12 deferred findings from cycles 3-4 (Google parser duplication, scene normalization, map layer ownership, session state coupling, etc.) remain unchanged. These are all architectural refactors that require dedicated design work, not incremental fixes. Re-reviewing them each cycle adds noise without progress.
- **Suggested fix:** Accept these as "known technical debt" with documented exit criteria. Only re-evaluate if a specific trigger occurs (e.g., bug report, feature request that requires touching the code).

---

### CR11-03 — `ExportPanel` swipe dismiss already has horizontal-dominant check

- **Severity:** INFO
- **Confidence:** High
- **Files:** `src/components/ExportPanel.tsx:126`
- **Detail:** Finding N35 from cycle 2 suggested adding `Math.abs(dx) < Math.abs(dy) * 0.3` check for swipe-to-dismiss. The current code already has this: `if (dy > 80 && Math.abs(dx) < Math.abs(dy) * 0.3) onClose()`. This finding was resolved in a prior cycle but the aggregate still lists it. No action needed.
