# Contests: global leaderboard & per-user entry stats

> **Storage (2026):** Leaderboard and entry-stats no longer read heavy fields from `contestsnapshots` after migration — they use denormalized `participantCodes` / `gfResults` / `customEntries` on `contests`. See [contest-snapshot-compression-and-stats-denormalization.md](./contest-snapshot-compression-and-stats-denormalization.md). Metric definitions below are unchanged.

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
     - **Rank**: position in the stored `gfResults`, which are in board order (§3).
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

`computeEntryStats` loads the contests (newest update first) and hands them to the pure `aggregateEntryStats` (`douze-points-backend/src/contests/entry-stats.ts`, unit-tested in `entry-stats.spec.ts`). For each completed contest:

1. If `contest.hostingCountryCode === entry`, the contest goes into **`hostedContests`**, whether or not the entry competed (`status: 'NOT_COMPETING'` when it didn't).
2. If the entry **does not** appear in any stage’s `participants`, it adds nothing else.
3. If **winner.code === entry**, increment **victories**.
4. **Semi-final**: the last stage before the GF (in `semiResults`, stage order) that lists the entry becomes `semi: { stageId, stageName, rank, size, points }`. A contest with a `semi` counts towards **semiFinals**, and towards **qualifiedFromSemis** when the entry also reached the GF.
5. If there is **no** GF row for that entry → row in response with `status: 'NQ'` (plus `semi`), still counts toward **participations** in the summary list logic (participations array length drives summary).
6. If there **is** a GF row → **finals**++, rank = position in `gfResults` (board order, §3), append `status: 'FINAL'`, `gfRank`, `gfPoints` (raw sum — **not** clamped in this path; see note below) and `gfSize` (entries in that final). Without a `semi` in a contest that has semi-finals, the row is **`preQualified`** (host, Big 5, any direct qualifier); in a final-only contest it is neither.
7. **Jury/televote split** (only when the GF's `gfVotingMode` is `JURY_AND_TELEVOTE`): `gfJury`, `gfTelevote` and shared ranks `gfJuryRank` / `gfTelevoteRank` (1 + entries with strictly more points, so ties share a place and a "win").

Summary includes: participations count, finals, victories, nul points (GF total 0), last places, **top 10** (GF rank ≤ 10), **averageRank** (mean GF rank, `null` without a final), **bestResult** and **worstResult** (lowest / highest GF rank; on ties, the first contest in the newest-first order), **semiFinals**, **qualifiedFromSemis**, **preQualified**, **juryWins**, **televoteWins**, **averageJuryRank** / **averageTelevoteRank** (over split finals, `null` without one).

**Qualification rate** = `qualifiedFromSemis / semiFinals` (`—` without a semi-final). Pre-qualified entries and final-only contests don't count; before 2026-11 it was finals ÷ participations, which gave Big 5 countries and final-only contests 100%. The personal leaderboard uses the same definition (`semiFinals` / `qualifiedFromSemis` on `MyLeaderboardRow`, from `semiQualifications()`), and its `qualifyingStreak` likewise only walks contests where the entry competed in a semi-final. Contests whose stored stats predate version 2 are left out of the leaderboard's qualification numbers until the backfill runs.

**Streaks are computed on the frontend** (`computeEntryStreaks` in `eurovision-scoreboard/src/helpers/entryStats.ts`), because they depend on the display order (`sortContestsNewestFirst`: year, then contest creation time, then name): current and longest qualifying streak, longest run without a final, longest top-10 run, longest win streak. Qualifying and non-qualifying runs only see rows with a `semi`; pre-qualified contests neither extend nor break them.

**Note:** Entry stats use **raw** `juryPoints + televotePoints` for display and nul/last-place checks; the **leaderboard** clamps GF for **aggregated** avg/total to cap abuse from custom points systems. If you ever need parity, decide explicitly whether to clamp in `getMyEntryStats` too.

### 2.3 HTTP API

- `GET /contests/me/entry-stats/:entryCode` — **JWT required** (`ContestsController`).
- Frontend: `useMyEntryStatsQuery` → `queryKeys.user.entryStats(entryCode)`.

### 2.4 Frontend

- `CountryStatsModal.tsx`: loads stats when `isOpen && entryCode`, shows the summary tiles (a tile can carry a detail line: “Most in a row” from the streaks, “N pre-qualified” under Finals, “q of s semi-finals” under the qualification rate; a fourth row of jury/televote tiles appears once a final had the split), the results chart (its tooltip adds the semi-final place and jury/televote places), then the per-contest table with a Semi-final column (“#14 Semi-Final 2”, “Pre-qualified” or “—”). When the entry hosted any contest, **All contests / Hosted** tabs switch the table to `hostedContests` with a home-wins line. **Load** loads contest + snapshot into the app via `setContestToLoad`.
- `EntryResultsChart.tsx`: grand final place per contest, oldest to newest, rank 1 at the top; non-qualifications sit in an `NQ` band and break the line; wins use the accent. Below 9px between contests it becomes a scatter of small dots. Pointer and arrow keys move a crosshair + tooltip; the table below is its table view. Shown from two participations with at least one final.

Picker / entry flow lives outside this doc (widget that sets `entryCode`).

Strings: `widgets.contests.entryStats` in locale files.

---

## 3. Shared algorithm detail (GF rank)

For both systems, GF rank is the position in the stored `gfResults`, which `extractContestStats` writes in the scoreboard's order:

1. **Total points** (jury + televote) **descending**.
2. If tied, the contest's recorded **winner** first (so rank 1 always matches `Contest.winner`).
3. Then **televote points** descending.
4. Then **running order** (the order the stage's rows are saved in).

Semi-final ranks use the same order without step 2. Contests whose stats predate stats version 2 still have the old points desc / `code` asc order until `npm run backfill:contest-stats -- --apply` runs (see `contest-snapshot-compression-and-stats-denormalization.md` §7b).

---

## 4. Refactoring / extension checklist

- **New leaderboard metric**: extend `CountryAgg` + `mergeContestIntoAgg` + `aggToRows` + Mongoose schema `rows` subdocument + `PublicLeaderboardRow` type + `GlobalLeaderboardModal` columns and sort keys (remember **nullable** sort via `compareMetricValue` pattern).
- **Change GF clamp bounds**: `LEADERBOARD_GF_MIN` / `LEADERBOARD_GF_MAX` only affect **leaderboard** aggregation.
- **Hot window size**: `PREV_YEAR_COUNT` / `NEXT_YEAR_COUNT` in `leaderboard.constants.ts`.
- **Cron frequency**: `@Cron` on `recomputeCronSnapshots` in `LeaderboardService`.
- **Entry stats metrics**: `entry-stats.ts` `aggregateEntryStats` (+ spec) + `EntryStatsResponse` DTO/types + `CountryStatsModal` UI. Order-dependent metrics (streaks) belong in `src/helpers/entryStats.ts` on the frontend. A metric that needs new per-contest data goes through `extractContestStats` + a `CONTEST_STATS_VERSION` bump + the backfill.
- **Do not** confuse **platform** contest list (leaderboard) with **user-only** list (entry stats); ownership filter is the main distinction.

---

## 5. Key file map

| Area | Location |
|------|----------|
| Leaderboard aggregation & cron | `douze-points-backend/src/contests/leaderboard.service.ts` |
| Hot/cold constants | `douze-points-backend/src/contests/leaderboard.constants.ts` |
| Snapshot schema | `douze-points-backend/src/contests/schemas/leaderboard-snapshot.schema.ts` |
| Public route | `douze-points-backend/src/contests/contests.controller.ts` (`GET leaderboard/public`) |
| Entry stats | `douze-points-backend/src/contests/contests.service.ts` (`getMyEntryStats`, `computeEntryStats`) → `entry-stats.ts` (`aggregateEntryStats`) |
| Public leaderboard UI | `eurovision-scoreboard/src/components/setup/widgets-section/contests/GlobalLeaderboardModal.tsx` |
| Entry stats UI | `eurovision-scoreboard/src/components/setup/widgets-section/contests/CountryStatsModal.tsx`, `EntryResultsChart.tsx` |
| Entry streaks + contest order | `eurovision-scoreboard/src/helpers/entryStats.ts` |
| API hooks | `eurovision-scoreboard/src/api/contests.ts` |
| Public row type | `eurovision-scoreboard/src/types/publicLeaderboard.ts` |
| Custom select (search + empty filter) | `eurovision-scoreboard/src/components/common/customSelect/CustomSelect.tsx` |
