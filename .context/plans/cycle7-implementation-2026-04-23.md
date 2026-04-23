# Cycle 7 Implementation Plan — 2026-04-23

## Scheduled Findings

### P0-1. C7-F1: Remove redundant document.documentElement.lang useEffect in page.tsx
- **Source**: C7-F1 (code-reviewer C7-CR1)
- **Severity / Confidence**: LOW / HIGH
- **Files**: `src/app/page.tsx:71-73`, `src/lib/i18n.ts:1751-1753`

**Implementation steps:**
1. Remove the redundant useEffect from `src/app/page.tsx` lines 71-73:
   ```javascript
   useEffect(() => {
     document.documentElement.lang = locale
   }, [locale])
   ```
2. Verify that `LocaleProvider` in `src/lib/i18n.ts` already handles this at lines 1751-1753 via `document.documentElement.setAttribute('lang', locale)`.
3. Verify the `locale` variable is still used in the deps array of `usePlaybackHotkeys` (it is -- it's not being removed from the component, just the redundant DOM write).

**Verification:** `tsc --noEmit`, `eslint`, `next build`, `playwright test` (e2e)

---

## Deferred Findings

No new deferred findings in cycle 7. All previously deferred items are carried forward:

- DF-C5-001: Worker ERROR_CODE and MAX_MESSAGE_SIZE constants not enforced (LOW/HIGH)
- DF-C4-001: SceneEditor normalizes on every name keystroke (MEDIUM/MEDIUM)
- DF-C4-002: ExportPanel estimated time multiplier inaccuracy (LOW/MEDIUM)
- DF-C17-001 through DF-C17-019: See `.context/plans/deferred-findings-cycle17-2026-04-23.md`
