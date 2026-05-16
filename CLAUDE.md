# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js 16 frontend for **DouzePoints**, a Eurovision Song Contest scoreboard simulator. The backend lives in a separate private repo (`douze-points-backend`) — NestJS + MongoDB REST API.

Stack: React 19, Tailwind CSS, Zustand, GSAP animations, React Query, deployed to Cloudflare Workers via `opennextjs-cloudflare`.

## Commands

```bash
yarn dev              # Next.js dev server
yarn build            # Production build
yarn preview          # Cloudflare Workers local preview
yarn deploy           # Build + deploy to Cloudflare Workers
yarn lint             # JS + CSS + TypeScript type check + last-commit lint
yarn lint:js          # ESLint only
yarn lint:css         # Stylelint on styles.css
yarn lint:types-cli   # tsc --noEmit against tsconfig.production.json
yarn test             # Vitest (watch mode)
yarn test:run         # Vitest single run
yarn format           # Prettier write
```

## Architecture

### State

Zustand stores are the source of truth for all client-side state:
- `scoreboardStore.ts` — main orchestrator, delegates to sub-modules in `state/scoreboard/`
- `generalStore.ts` — themes, user settings, active contest references
- `countriesStore.ts` — countries list and filtering
- `useAuthStore.ts` — JWT tokens with automatic refresh

**Voting logic** lives in `state/scoreboard/votingActions.ts` (the largest file). Tiebreaker order: total points → televote → running order → alphabetical.

### API Layer

`src/api/`: Axios client with JWT injection and 401-triggered token refresh. React Query (`@tanstack/react-query`) handles server state caching. Query key factory is in `api/queryKeys.ts`.

### Theme System

`src/theme/`: Year-based themes (2004–2025) plus user-created custom themes stored in IndexedDB. Theme application uses CSS variables injected at runtime to prevent FOUC.

### Routing & Views

Next.js App Router. Main app lives under `app/(main)/`. Page-level React components are in `views/`.

### Deployment

`opennextjs-cloudflare` adapter wraps the Next.js build for Cloudflare Workers. `wrangler.toml` configures the target.

### Docs

Read `docs/` before touching non-obvious subsystems:
- `running-order-and-tiebreaking.md`
- `contests-leaderboard-and-entry-stats.md`
- `theme-animations-and-specifics.md`
- `USER_DATA_CLEARING.md`

## Code Style

Prettier: `singleQuote: true`, `trailingComma: 'all'`, `endOfLine: 'auto'`.

ESLint enforces import ordering: built-in → external → internal (`@/*`) → relative siblings → index. Run `yarn lint:js` after reorganizing imports.

`tsconfig.production.json` is stricter than `tsconfig.json` — `yarn lint:types-cli` catches type errors the dev build misses.
