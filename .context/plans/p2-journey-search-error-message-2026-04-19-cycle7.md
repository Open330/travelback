# P2 - JourneyCreator Search Error Message Improvement (Cycle 7)

**Priority:** P2 — UX improvement for a low-severity issue
**Source:** comprehensive-deep-code-review-2026-04-19-cycle7 (NEW-C7-4)
**Estimated effort:** 10 minutes

---

## Findings addressed

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| NEW-C7-4 | JourneyCreator search error message not helpful for place name queries | LOW | `src/components/JourneyCreator.tsx:66-102` |

---

## Problem

~~When a user enters a place name (e.g., "Paris") in the JourneyCreator search, `parseCoordinateQuery` returns null and the error message `journey.searchInvalid` is shown. This message says something generic like "Invalid search query" which doesn't help the user understand what format to use.~~

**UPDATE:** Upon inspection, the `journey.searchInvalid` key already provides helpful guidance with coordinate examples in all 5 locales. For example, the English version reads: "Could not read that location. Paste coordinates like 37.5665, 126.9780 or a supported map link." Similar helpful messages exist in Korean, Japanese, Chinese, and Spanish.

**No code change needed** -- the review finding was based on an incorrect assumption about the error message content. The existing implementation is already good.

---

## Implementation steps

### 1. Add a new i18n key for the improved search hint

**File:** `src/lib/i18n.ts`

Add a new key `journey.searchHint` to all 5 locales with a message like "Enter coordinates or a map link (e.g., 35.6762,139.6503 or geo:35.6762,139.6503)":

| Locale | Key | Value |
|--------|-----|-------|
| en | `journey.searchHint` | `Enter coordinates or a map link (e.g., 48.8566,2.3522 or geo:48.8566,2.3522)` |
| ko | `journey.searchHint` | `좌표나 지도 링크를 입력하세요 (예: 37.5665,126.9780 또는 geo:37.5665,126.9780)` |
| ja | `journey.searchHint` | `座標または地図リンクを入力してください (例: 35.6762,139.6503 または geo:35.6762,139.6503)` |
| zh | `journey.searchHint` | `请输入坐标或地图链接 (例如: 31.2304,121.4737 或 geo:31.2304,121.4737)` |
| es | `journey.searchHint` | `Introduce coordenadas o un enlace de mapa (ej: 40.4168,-3.7038 o geo:40.4168,-3.7038)` |

### 2. Update JourneyCreator to show the hint instead of generic error

**File:** `src/components/JourneyCreator.tsx`

In the `runSearch` callback, when `parseCoordinateQuery` returns null, show the hint message instead of the generic error:

Change:
```typescript
setSearchError(t('journey.searchInvalid'))
```

To:
```typescript
setSearchError(t('journey.searchHint'))
```

### 3. Verify build passes

```bash
npm run build
```

---

## Verification checklist

- [x] Reviewed `journey.searchInvalid` i18n key in all 5 locales -- already provides helpful guidance with coordinate examples
- [x] No code change needed -- review finding was based on incorrect assumption
- [x] Plan closed as no-op

---

## Deferred findings

NEW-C7-2 (`downloadVideo` fallback may silently fail) — LOW severity, latent risk not triggered in practice since the File System Access API handles most modern browsers and the video preview provides an alternative. Deferring with exit criterion: if users report downloads not starting in browsers without File System Access API, re-evaluate.
