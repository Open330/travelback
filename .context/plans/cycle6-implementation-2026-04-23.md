# Cycle 6 Implementation Plan — 2026-04-23

## Scheduled Findings

### P0-1. C6-F1: SceneRangeEditor handle aria-valuetext and aria-label i18n
- **Source**: C6-F1 (code-reviewer C6-CR1, designer C6-D1, critic C6-CR1)
- **Severity / Confidence**: MEDIUM / HIGH
- **Files**: `src/components/SceneEditor.tsx:173, 175`, `src/lib/i18n.ts`

**Implementation steps:**
1. Add `scenes.rangeStart` and `scenes.rangeEnd` translation keys to all 5 locale objects in `src/lib/i18n.ts`
   - en: "start" / "end"
   - ko: "시작" / "끝"
   - ja: "開始" / "終了"
   - zh: "起始" / "结束"
   - es: "inicio" / "fin"
2. Update `src/components/SceneEditor.tsx` line 173: change `aria-label={type === 'start' ? \`${ariaLabel} start\` : \`${ariaLabel} end\`}` to use `t('scenes.rangeStart')` and `t('scenes.rangeEnd')`
3. Update `src/components/SceneEditor.tsx` line 175: change `aria-valuetext` to use `t('scenes.rangeStart')` and `t('scenes.rangeEnd')` instead of hardcoded "start"/"end"

**Verification:** `tsc --noEmit`, `eslint`, `next build`, screen reader announces range handle labels in the active locale

---

## Deferred Findings

C6 has no new deferred findings. All previously deferred items are carried forward:

- DF-C5-001: Worker ERROR_CODE and MAX_MESSAGE_SIZE constants not enforced (LOW/HIGH)
- DF-C4-001: SceneEditor normalizes on every name keystroke (MEDIUM/MEDIUM)
- DF-C4-002: ExportPanel estimated time multiplier inaccuracy (LOW/MEDIUM)
- DF-C17-001 through DF-C17-019: See `.context/plans/deferred-findings-cycle17-2026-04-23.md`

Note: DF-C17-007 ("Missing aria-valuetext on SceneEditor sliders") was previously resolved by C5-F1 in cycle 5. C6-F1 extends that fix to the SceneRangeEditor handles, which were missed.
