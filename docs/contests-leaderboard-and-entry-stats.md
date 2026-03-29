# Contests: global leaderboard & per-user entry stats

This document describes how **platform-wide country leaderboard** and **per-user entry statistics** are computed, stored, and surfaced in the UI. Use it when refactoring, extending metrics, or aligning new features with the same rules.

---

## At a glance

| | **Global leaderboard** | **My entry stats** (`CountryStatsModal`) |
|---|------------------------|------------------------------------------|
| **Audience** | Anyone (public `GET`, no auth) | Signed-in user only (`GET` + JWT) |
| **Contest scope** | All **completed** contests on the platform (public + private) | Only contests **owned by** the current user |
| **Entities** | One row per **standard country** (aggregated) | One **entry** (country code or `custom-…`) |
| **Persistence** | Yes — MongoDB `leaderboard_snapshots`, refreshed by cron + on read | No snapshot collection — **computed on every request** |
| **Backend** | `LeaderboardService` | `ContestsService.getMyEntryStats` |
| **Primary FE** | `GlobalLeaderboardModal`, `usePublicLeaderboardQuery` | `CountryStatsModal`, `useMyEntryStatsQuery` |

Both features rely on the same underlying ideas: **contest completion**, **snapshot** `setup.stages[].participants`, and **Grand Final** rows in `simulation.countriesStateByStage` under a stage key whose name is **`GF`** (case-insensitive).

---

## 1. Global country leaderboard

### 1.1 “Completed contest”

A contest counts if:

- `winner` exists and `winner.code` is a non-empty string.

There is **no** filter on `isPublic` — private completed contests are included (true platform-wide stats).

Implementation: `COMPLETED_WINNER_FILTER` in `douze-points-backend/src/contests/leaderboard.service.ts`.

### 1.2 Standard countries only

Participant codes are taken from every stage’s `participants` array. Codes whose string starts with **`custom-`** are **excluded** from aggregation (custom entries are not part of the country leaderboard).

### 1.3 Per-contest merge (`mergeContestIntoAgg`)

For each **standard** country code that appears in any stage’s participants:

1. **Participations** += 1 (once per contest).
2. If `contest.winner.code === code`, **wins** += 1.
3. Grand Final:
   - Resolve the GF stage: first key in `countriesStateByStage` where `key.toUpperCase() === 'GF'`.
   - If the country has a row in that GF list:
     - **Finals** += 1.
     - **Points**: `juryPoints + televotePoints`, then **clamped** to `[LEADERBOARD_GF_MIN, LEADERBOARD_GF_MAX]` (defaults **0–1500** in `leaderboard.constants.ts`) before adding to **total** GF points and **average** (see below).
     - **Rank**: all GF rows sorted by total points **desc**, tie-break by `code` **asc** (lexicographic).
     - **Podiums / top5 / top10** from that rank.

If the country participated but has **no** GF row, they get participation (+ win if applicable) but **no** finals / GF-derived stats for that contest.

**Win rate**: `wins / finals` when `finals > 0`, else `null` (UI shows “—”).

**Average / total GF points**: average = `totalClampedGF / finals` when `finals > 0`, else `null`. Totals use **clamped** per-contest GF sums only.

### 1.4 Scopes: global vs calendar year

- **Global**: all completed contests.
- **Year `Y`**: completed contests with `contest.year === Y` (same merge logic).

### 1.5 MongoDB snapshots (`LeaderboardSnapshot`)

- Collection: `leaderboard_snapshots` (see `schemas/leaderboard-snapshot.schema.ts`).
- Fields: `scope` (`'global' | 'year'`), optional `year`, `computedAt`, `contestCount`, `rows` (array of metric rows).
- Unique index on `(scope, year)` (implementation detail for global vs per-year docs).

### 1.6 Staleness & cron

Constants in `douze-points-backend/src/contests/leaderboard.constants.ts`:

- **Hot window**: **six** UTC calendar years: `getHotYearWindow()` uses `i` from `-(PREV_YEAR_COUNT - 1)` to `NEXT_YEAR_COUNT` (i.e. **−4 … +1** relative to `getUTCFullYear()`), so **(current year − 4)** through **(current year + 1)** — e.g. 2022–2027 when the current UTC year is 2026 (see comment in `leaderboard.constants.ts`).
- **Hot staleness** (`LEADERBOARD_HOT_STALE_MS`): **6 hours** — applies to **global** and to **hot-window** year snapshots.
- **Cold staleness** (`LEADERBOARD_COLD_STALE_MS`): **24 hours** — years **outside** the hot window.

**Reads** (`getPublicLeaderboard`): load snapshot; if missing or stale, recompute and upsert, then return.

**Cron** (`@Cron` every 6 hours, `CronExpression.EVERY_6_HOURS`): **single pass** over all completed contests — updates **global** and **only hot-window years**. **Cold years** (e.g. 1978) are **not** updated by cron; they refresh only when a read finds them missing/stale (24h rule).

### 1.7 HTTP API

- `GET /contests/leaderboard/public` — **no auth** (register **before** `GET /contests/:id` so `leaderboard` is not captured as an id).
- Query: omit `year` or `year=global` → global; `year=<integer>` → that calendar year.
- Invalid non-integer year → `400` (see `LeaderboardService.getPublicLeaderboard`).

### 1.8 Frontend (`eurovision-scoreboard`)

- **API hook**: `usePublicLeaderboardQuery` in `src/api/contests.ts` — `queryKeys.public.leaderboard(year)`.
- **UI**: `GlobalLeaderboardModal.tsx` — sortable table, scope selector (`CustomSelect`), optional **custom year** via search with no matches → `emptyFilterContent` “Use year {year}” button (see `CustomSelect` `emptyFilterContent`).
- **Nullable columns** (`winRate`, `avgGrandFinalPoints`): sort uses **`compareMetricValue`** so **nulls sort last** in both asc and desc (avoid “—” floating to top on descending sort).

Entry point: e.g. **Public Contests** widget chart button opens the modal (`PublicContests.tsx`).

Strings: `widgets.contests.leaderboard` in locale files.

---

## 2. My entry stats (`CountryStatsModal`)

### 2.1 Scope

- **User**: JWT `userId`.
- **Contests**: `contestModel.find({ userId, …completed winner filter })` — only **your** completed contests.
- **Entry**: URL path segment after `/contests/me/entry-stats/` (URL-decoded, trimmed). Can be a **standard country code** or **`custom-<id>`** (and similar) — **not** filtered out; stats are for that exact participant string.

### 2.2 Behaviour (high level)

For each of the user’s completed contests:

1. If the entry **does not** appear in any stage’s `participants`, skip the contest.
2. If **winner.code === entry**, increment **victories**.
3. If there is **no** GF row for that entry → row in response with `status: 'NQ'`, still counts toward **participations** in the summary list logic (participations array length drives summary).
4. If there **is** a GF row → **finals**++, compute rank (same sort as leaderboard: points desc, `code` asc), append `status: 'FINAL'`, `gfRank`, `gfPoints` (raw sum — **not** clamped in this path; see note below).

Summary includes: participations count, finals, victories, nul points (GF total 0), last places, best GF result.

**Note:** Entry stats use **raw** `juryPoints + televotePoints` for display and nul/last-place checks; the **leaderboard** clamps GF for **aggregated** avg/total to cap abuse from custom points systems. If you ever need parity, decide explicitly whether to clamp in `getMyEntryStats` too.

### 2.3 HTTP API

- `GET /contests/me/entry-stats/:entryCode` — **JWT required** (`ContestsController`).
- Frontend: `useMyEntryStatsQuery` → `queryKeys.user.entryStats(entryCode)`.

### 2.4 Frontend

- `CountryStatsModal.tsx`: loads stats when `isOpen && entryCode`, shows summary + per-contest table, **Load** loads contest + snapshot into the app via `setContestToLoad`.

Picker / entry flow lives outside this doc (widget that sets `entryCode`).

Strings: `widgets.contests.entryStats` in locale files.

---

## 3. Shared algorithm detail (GF rank)

For both systems, GF ordering for rank is:

1. Sort rows by **total points** (jury + televote) **descending**.
2. If tied, sort by **`code` ascending** (string compare).

---

## 4. Refactoring / extension checklist

- **New leaderboard metric**: extend `CountryAgg` + `mergeContestIntoAgg` + `aggToRows` + Mongoose schema `rows` subdocument + `PublicLeaderboardRow` type + `GlobalLeaderboardModal` columns and sort keys (remember **nullable** sort via `compareMetricValue` pattern).
- **Change GF clamp bounds**: `LEADERBOARD_GF_MIN` / `LEADERBOARD_GF_MAX` only affect **leaderboard** aggregation.
- **Hot window size**: `PREV_YEAR_COUNT` / `NEXT_YEAR_COUNT` in `leaderboard.constants.ts`.
- **Cron frequency**: `@Cron` on `recomputeCronSnapshots` in `LeaderboardService`.
- **Entry stats metrics**: `contests.service.ts` `getMyEntryStats` + `EntryStatsResponse` DTO/types + `CountryStatsModal` UI.
- **Do not** confuse **platform** contest list (leaderboard) with **user-only** list (entry stats); ownership filter is the main distinction.

---

## 5. Key file map

| Area | Location |
|------|----------|
| Leaderboard aggregation & cron | `douze-points-backend/src/contests/leaderboard.service.ts` |
| Hot/cold constants | `douze-points-backend/src/contests/leaderboard.constants.ts` |
| Snapshot schema | `douze-points-backend/src/contests/schemas/leaderboard-snapshot.schema.ts` |
| Public route | `douze-points-backend/src/contests/contests.controller.ts` (`GET leaderboard/public`) |
| Entry stats | `douze-points-backend/src/contests/contests.service.ts` (`getMyEntryStats`) |
| Public leaderboard UI | `eurovision-scoreboard/src/components/setup/widgets-section/contests/GlobalLeaderboardModal.tsx` |
| Entry stats UI | `eurovision-scoreboard/src/components/setup/widgets-section/contests/CountryStatsModal.tsx` |
| API hooks | `eurovision-scoreboard/src/api/contests.ts` |
| Public row type | `eurovision-scoreboard/src/types/publicLeaderboard.ts` |
| Custom select (search + empty filter) | `eurovision-scoreboard/src/components/common/customSelect/CustomSelect.tsx` |
