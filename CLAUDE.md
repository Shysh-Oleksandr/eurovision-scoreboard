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
yarn dev:native       # Dev server with the native app's code paths (IS_NATIVE_APP)
yarn build:native     # Static export for Capacitor into out/
yarn cap:sync         # build:native + copy into ios/ and android/
yarn cap:dev ios|android [--lan]  # Live reload inside the native shell
yarn assets:native    # Regenerate app icons + splash screens from assets/
yarn live-update publish|store|status  # Live update: web bundles for the apps (--mode prompt|required), store-version gate
yarn store-screenshots          # App Store / Play screenshots from out/ (after yarn build:native)
yarn fastlane release version:X  # Bump, build, upload both apps to TestFlight / Play internal, tag (docs/store-builds.md)
yarn fastlane ios|android screenshots|metadata|submit|promote  # Store listings, screenshots, review
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

### Native Apps

The same frontend ships to iOS/Android via Capacitor 8 as a static export (`NATIVE_EXPORT`, `IS_NATIVE_APP` in `src/native/platform.ts`). The apps have no server: no API routes, `cookies()`/`headers()` or server actions. See `docs/native-apps.md` before touching anything that fetches same-origin `/api/*`, the locale flow, or export image loading.

### Docs

**UI work:** read `DESIGN.md` (package root) first. It holds the visual rules every screen follows (theme-derived colours only, flat surfaces, board-row country tiles, sentence case, layouts fitted by measuring with `useFitStep`, the AI-design tells to avoid) and is the reference for redesigning the rest of the app. `PRODUCT.md` says who the users are.

Read `docs/` before touching non-obvious subsystems:
- `general-app-features-overview.md`
- `final-televote-reveal.md`
- `jury-scale-reveal.md` — the opt-in JESC 2024 jury presentation (bar board, scale countdown then spokespersons)
- `running-order-and-tiebreaking.md`
- `contests-leaderboard-and-entry-stats.md`
- `theme-animations-and-specifics.md`
- `rounded-country-layout-and-2026-theme.md`
- `custom-fonts-and-font-library.md` — uploaded fonts, the per-user font library (fork-on-use, content-addressed R2 blobs), UI vs scoreboard font slots, weight fallback, FOUC script contract, R2 CORS prerequisite
- `voting-simulation-engine-and-diaspora.md` — the random-vote (Plackett–Luce) engine, the diaspora/affinity layer, and the Phase 2 (v2) plan
- `voting-predefinition.md` — hand-authoring a stage's votes (Detailed/Rank/Totals modes), the totals best-fit algorithm, sharing, presets
- `allocation-draw.md` — the semi-final allocation draw: `TO_BE_DRAWN` bucket, draw store, pure engine (pots / even split / halves / seeded codes), the GSAP ceremony contract, Apply, running-order halves, snapshot fields
- `voter-channels.md` — per-voter jury/televote eligibility (`EventStage.voterChannels`), the Rest of the World default, and the channel-aware `getStageVotingCountries`
- `event-setup-hub-and-design-tokens.md` — the Event Setup modal (hue-derived OKLCH tokens `--prim-hue`/`--p-*`/`--accent`, hand-picked accents in `interfaceAccents.ts` + the dev-only Palette Lab at `/dev/palette-lab` and `?palette` panel, `dp-*` classes, Button `cta`/`surface` variants, lineup ListIds + setupUiStore, lazy dnd-kit, contest dirty fingerprint, sync-theme setting, profile summary endpoint)
- `adding-contest-editions.md` — adding a new ESC/JESC/ESC Asia year or a new contest series to the Contest select: `ContestType`, lineup JSON format and field rules, hosting logos, cache-busting, odds/spokesperson updates, verification checklist
- `graphics-studio.md` — the design document model, element registry, deterministic export (snapdom + html-to-image fallback) and the share-image templates; read before touching share images or the graphics editor
- `native-apps.md` — the Capacitor iOS/Android build: static-export flags, commands (Xcode 27 caveat), live reload, rules for native-aware code, client-side locale, native image fetching for exports, saving/sharing files (`fileActions`, Android MediaStore plugin), native Google sign-in + Sign in with Apple (iOS + website) + Keychain/Keystore refresh tokens, icons/splash, system bars + `--safe-*` vars, Android back button (`useBackHandler`), haptics, per-app languages, live updates (`yarn live-update publish`, native runtime fingerprints, signed bundles on R2), universal links / Android App Links (share links only, `.well-known` files, Android 15+ query matching), promoting the store apps on the website (§13: `NEXT_PUBLIC_APP_STORES_LIVE` release-date flag, Smart App Banner, setup hub card + winner reminder rules, `/get-app`, Android install check + "Open the app" intent link), what doesn't work yet, emulator/simulator testing recipes. Roadmap, research and phase status: `plans/native-apps-plan.md`
- `haptics.md` — the native apps' haptics: the cue catalog (`src/native/haptics/cues.ts`) and where each cue fires, the neutral pattern format and its iOS (Core Haptics) / Android (composition primitives) / fallback renderers, priorities, the `DouzeHaptics` plugins (`ios/App/App/DouzeHapticsPlugin.swift`, `android/.../DouzeHapticsPlugin.java`), the dev-only Haptics lab at `/dev/haptics-lab` and the `dp-haptics-debug` log; read before adding or moving a haptic
- `email-sign-in.md` — passwordless email sign-in (website + apps): the code dialog and `loginWithEmailCode`, the `/auth/email/*` API and error codes, account linking and normalized addresses, code storage and rate limits, sliding refresh-token rotation, Cloudflare Email Service sending (env, owner setup, review account); read before touching sign-in, sessions or sending email
- `sign-in-methods.md` — one account, up to three sign-in methods (Google, Apple, email codes): the profile fields and sparse indexes, the connect/remove rules (`in_use`, `already_connected`, `last_method`, no merging), `/auth/methods/*`, the website's redirect connects (link cookie, Google `state`, Apple `.link` mark, `?link=` landing), the apps' sheets, Edit profile → Sign-in methods and the email dialog's link mode; read before touching sign-in, account linking or the Google/Apple callbacks
- `moderation-and-account-deletion.md` — reports (all content types + users, the app-wide `openReportDialog`), blocking (both directions, server-side list filtering), the admin queue at `/admin/reports`, in-app account deletion (what is deleted, in which order, Apple token revocation), the legal pages and the Terms agreement under the sign-in buttons
- `store-builds.md` — the iOS and Android store builds with fastlane (`fastlane/Fastfile`, `yarn fastlane …`: credentials wizard `scripts/fastlane-credentials.sh`, `release`, TestFlight / Play internal uploads, submit / promote, listing texts and screenshot uploads per language) and the same steps by hand; what a later update needs
- `store-submission.md` — what the apps collect and the matching App Store privacy labels and Play Data safety answers, age rating and content forms, trademark rules for the listings, review notes and the demo account, the store screenshots (`yarn store-screenshots`: sizes, scenes, upload slots); update it with the privacy policy whenever data collection changes
- `USER_DATA_CLEARING.md`

## Releasing to the apps (live updates)

**Never run `yarn live-update publish` or `yarn live-update store`, in any form (`--dry-run` and `--out` included).** The owner runs them by hand. `yarn live-update status` is read-only and fine.

Instead, suggest the release. Do it when a task that changes what app users get is finished: frontend code that ships in the native bundle, or a backend change the apps depend on. In multi-step work, suggest it at the first step where the change could ship on its own. If more steps have to land first, say which ones and hold the suggestion until they're done. End with one line:

> Live update: `yarn live-update publish --mode <mode>` (<one-line reason>)

Pick the mode:

- **No live update.** Website-only changes (`*.web.tsx`, admin, API routes, SEO), docs, scripts and tests need none. Native changes (a plugin or its version, `capacitor.config.ts`, `Info.plist`, entitlements, `AndroidManifest.xml`, Swift/Java) need a store build instead: bundles from the new tree won't reach older binaries. Once that build is live in the store, suggest `yarn live-update store <ios|android> --recommended <version>`. Suggest `--required <version>` only if older binaries would break.
- **`silent`** (the default) for fixes and improvements that can wait for the next launch.
- **`prompt`** when users would want it now: a fix for a crash or broken flow on a common path, a big new feature or redesign.
- **`required`** only when the old bundle would break or damage data alongside the new state: an incompatible backend API change, a persisted-state or storage format the old bundle can't read, a security fix. First say whether keeping the backend backward compatible would avoid it, which is the better fix.

Also mention anything the release depends on: deploy the backend first, commit (publish needs a clean tree), or set an env var. The levels and the store gate are explained in `docs/native-apps.md` §11.

## Code Style

Prettier: `singleQuote: true`, `trailingComma: 'all'`, `endOfLine: 'auto'`.

ESLint enforces import ordering: built-in → external → internal (`@/*`) → relative siblings → index. Run `yarn lint:js` after reorganizing imports.

`tsconfig.production.json` is stricter than `tsconfig.json` — `yarn lint:types-cli` catches type errors the dev build misses.

## Agent skills

### Issue tracker

Local markdown under `.scratch/<feature>/` in the frontend repo (gitignored), covering frontend and backend work. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), recorded as `Status:` lines in issue files. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` + `docs/adr/` in the frontend repo, covering the backend too. See `docs/agents/domain.md`.
