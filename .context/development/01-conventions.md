# Conventions

## Project Configuration

- **Never use CLAUDE.md** for this project. All project rules and context live in `.context/`.
- Build: `npm run build` (must pass with zero errors before committing)
- Dev: `npm run dev` for local development

## Language & Runtime

- TypeScript with ESNext target, strict mode
- Node.js 24 LTS
- Next.js 16 App Router
- React 19 with hooks (no class components)
- All components use `'use client'` directive (client-side app)

## Naming

- **Components**: PascalCase with `.tsx` — `MapView.tsx`, `FileUpload.tsx`
- **Utilities**: camelCase with `.ts` — `parser.ts`, `interpolate.ts`
- **Types**: PascalCase — `TrackPoint`, `MapStyleKey`, `InterpolationResult`
- **Constants**: UPPER_SNAKE_CASE — `MAP_STYLES`, `ROUTE_COLOR`
- **Hooks**: `use` prefix — `useCallback`, `useRef`

## File Organization

- `src/app/` — Next.js App Router pages and layouts
- `src/components/` — React components (one primary component per file)
- `src/lib/` — Utility functions and business logic
- `src/types.ts` — Shared type definitions

## Code Style

- No semicolons (rely on ASI)
- Single quotes for strings
- 2-space indentation
- Prefer `const` over `let`
- Prefer named exports for utilities, default exports for components
- Use Tailwind CSS utility classes (no CSS modules or styled-components)
- Comments in English

## Git Rules

- GPG sign all commits (`git commit -S`)
- No `Co-Authored-By` lines
- Semantic commit messages with gitmoji: `<type>(<scope>): <gitmoji> <description>`
- Fine-grained commits: one commit per feature, fix, or enhancement
- Commit and push after every iteration

## Testing

- Build verification: `npm run build` must pass
- Lint: `npm run lint` must pass
- Manual testing with sample GPX/KML/JSON files

## Dependencies

- Always use latest stable versions
- Minimal dependency footprint
- MapLibre GL JS for maps (open-source, no API key)
- @tmcw/togeojson for GPX/KML parsing
- No external video encoding libraries (use browser APIs)
