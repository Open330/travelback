# P1 Quality & Polish — Cycle 3 (2026-04-19)

**Priority:** P1 — UX quality and minor robustness improvements
**Source:** comprehensive-deep-code-review-2026-04-19-cycle3 (NEW-C3-4, NEW-C3-5)
**Estimated effort:** 15-20 minutes

---

## Findings addressed

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| NEW-C3-4 | commitScenes warns on raw scenes before normalization | LOW | SceneEditor.tsx |
| NEW-C3-5 | Unnecessary 200ms setTimeout before waitForIdle | LOW | useExportController.ts |

---

## Implementation steps

### 1. Generate SceneEditor warnings from normalized result (NEW-C3-4)

**File:** `src/components/SceneEditor.tsx:201-218`

**Current:** `commitScenes` generates warnings from raw input scenes, then normalizes. Warnings may describe conditions that no longer exist after normalization.

**Fix:** Normalize first, then generate warnings by comparing normalized boundaries to the original:

```ts
const commitScenes = useCallback((nextScenes: Scene[]) => {
  const normalized = normalizeScenes(nextScenes)
  const w: string[] = []
  const sorted = [...normalized].sort((a, b) => a.startPercent - b.startPercent)
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i]
    if (s.startPercent >= s.endPercent) {
      w.push(`"${s.name}" ${t('scenes.hasStartGteEnd')}`)
    }
    if (i > 0) {
      const prev = sorted[i - 1]
      if (s.startPercent < prev.endPercent) {
        w.push(`"${prev.name}" ${t('scenes.overlap')} "${s.name}" ${t('scenes.overlapSuffix')}`)
      }
    }
  }
  setNormalizationWarnings(w)
  onChange(normalized)
}, [onChange, t])
```

Note: After normalization, overlaps should be resolved, so warnings about overlap should be rare. The `startPercent >= endPercent` check remains valuable for detecting degenerate scenes.

**Verification:** Create two overlapping scenes. Confirm that after normalization, overlap warnings are gone (since normalization resolves them). Confirm degenerate scene warnings still appear.

---

### 2. Remove unnecessary 200ms setTimeout before waitForIdle (NEW-C3-5)

**File:** `src/lib/useExportController.ts:105`

**Current:**
```ts
mapHandle.resize(config.resolution.width, config.resolution.height)
await new Promise((resolve) => setTimeout(resolve, 200))
const mapSettledAfterResize = await mapHandle.waitForIdle(abortController.signal)
```

**Fix:** Remove the setTimeout — `waitForIdle` already waits for the map to finish rendering:

```ts
mapHandle.resize(config.resolution.width, config.resolution.height)
const mapSettledAfterResize = await mapHandle.waitForIdle(abortController.signal)
```

**Verification:** Export a video. Confirm it renders correctly without the 200ms delay. The `waitForIdle` call ensures the map has settled after the resize.

---

## Verification checklist

- [ ] `npm run build` succeeds
- [ ] SceneEditor warnings reflect normalized state (NEW-C3-4)
- [ ] Video export works without the 200ms setTimeout (NEW-C3-5)
