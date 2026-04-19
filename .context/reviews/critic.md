# Critic repo sweep — 2026-04-19

Reviewed inventory: root configs/scripts (`package.json`, `tsconfig.json`, `next.config.ts`, Playwright configs), CI workflow, `src/app/*`, major `src/components/*`, `src/lib/*`, `public/workers/trackParser.worker.js`, `scripts/*`, and `e2e/travelback.spec.ts`.

## Highest-signal issues

### 1) Static build artifact is not hermetic; current output already contains tool-state residue
- **Citations:** `package.json:5-17`, `.github/workflows/deploy-pages.yml:18-36`, `scripts/smoke-static.mjs:131-161`, `out/fonts/.omc/state/last-tool-error.json`
- **Failure scenario:** On the current tree, `npm run build && npm run smoke:static` fails with `Forbidden tool-state directory found in static assets: out/fonts/.omc`. If this gate is bypassed, Pages can publish stale internal metadata alongside real assets.
- **Suggested fix:** Make the export clean-room: delete `out/` before build, add a postbuild prune for hidden tool dirs, and keep tooling away from generated asset directories.
- **Severity:** high
- **Confidence:** high
- **Status:** reproduced

### 2) Typecheck is stateful/noisy because generated `.next/dev` validators are included in the main TS program
- **Citations:** `tsconfig.json:25-31`, `.next/dev/types/validator.ts:39-60`
- **Failure scenario:** `npm run typecheck` initially failed on this repo with generated-route errors (`Type '"/"' does not satisfy the constraint 'never'`) coming from `.next/dev/types/validator.ts`, not authored source. After a fresh production build it passed again, so local correctness depends on whatever stale dev artifacts happen to be in `.next/`.
- **Suggested fix:** Remove `.next/dev/types/**/*.ts` from the main `tsconfig` include list, or run typecheck against a clean/generated-only-specific config so developer checks are deterministic.
- **Severity:** medium
- **Confidence:** high
- **Status:** reproduced (state-coupled)

### 3) Export path can claim success even when the browser never actually saves the file
- **Citations:** `src/lib/videoEncoder.ts:153-180`, `src/lib/useExportController.ts:141-153`, `src/components/ExportPanel.tsx:186-200`
- **Failure scenario:** On browsers that fall back from `showSaveFilePicker()` to the synthetic `<a download>` path, `downloadVideo()` always returns `true` immediately after `a.click()`. If the browser blocks/ignores that download, the app still sets export state to `done` and tells the user the video was saved to Downloads.
- **Suggested fix:** Downgrade the fallback UX to “download started” instead of “saved”, or move the success state behind a browser flow that can actually confirm a save/share action.
- **Severity:** medium
- **Confidence:** medium
- **Status:** inferred from code path (no matching automated check found)
