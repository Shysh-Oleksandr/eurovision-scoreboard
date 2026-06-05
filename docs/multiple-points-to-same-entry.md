# Multiple Points to the Same Entry (pre-1975 voting)

This document describes the `allowMultiplePointsToSameEntry` feature — an opt-in jury voting
mode that lets a single voting country award more than one point token to the same entry.
It exists to simulate early Eurovision editions (1957–1961, 1967–1970, 1974) where juries
distributed ten equal tokens completely freely, including multiple tokens to the same country.

---

## Historical background

In the standard Eurovision format (1975 onwards) each jury awards a set of strictly distinct
point values (1, 2, 3 … 8, 10, 12) — every entry can receive at most one value from a given
voter. Before 1975 the system was different: each jury had **ten equal 1-point tokens** and
could hand out as many as they liked to any single entry. The predefined `old` preset
(`PREDEFINED_SYSTEMS_MAP.old` in `src/data/data.ts`) models this as ten `PointsItem` objects
all with `value: 1`.

---

## Setting

| Property | Location |
|---|---|
| Store field | `useGeneralStore().settings.allowMultiplePointsToSameEntry` (boolean, default `false`) |
| Interface | `Settings` in `src/state/generalStore.ts` |
| Default | `DEFAULT_SETTINGS.allowMultiplePointsToSameEntry = false` |
| Toggle | `setSettings({ allowMultiplePointsToSameEntry: … })` via the existing partial-merge action |

When `false` nothing changes from the standard behaviour — every code path that reads the
flag short-circuits to the original logic.

---

## UI

The checkbox lives at the **bottom of** `src/components/settings/pointsSystem/PointsSystemSelection.tsx`,
rendered below the points list (whether the split or single system variant is active). It is
accompanied by an info `Tooltip` on its left side (pattern matching other settings in
`VotingSettings.tsx`) that explains the pre-1975 historical context.

The **Eurovision Pre-1975 (1x10)** preset in the `predefinedSystemsOptions` array
(`src/components/settings/pointsSystem/PointsSystemHeader.tsx`) pairs naturally with this
checkbox. Selecting that preset also automatically enables `allowMultiplePointsToSameEntry`;
clicking the reset button sets it back to `false`.

Translation keys live under `settings.voting` in all `messages/*.json` locale files:
- `allowMultiplePointsToSameEntry` — checkbox label
- `allowMultiplePointsToSameEntryTooltip` — tooltip body

---

## Votes predefinition

**File:** `src/state/scoreboard/votesPredefinition.ts`

`generateVotesForSource` accepts an optional `allowMultiplePointsToSameEntry` parameter
(default `false`). When `true` it samples **with replacement** — the picked country is never
removed from `choices`, so the same entry can win multiple draws:

```
flag on  → for i in 0..pointsSystem.length: pick from full choices list (with replacement)
flag off → while winners.length < min(pointsSystem.length, choices.length): pick and remove
```

`numPointsToAward` is always `pointsSystem.length` when the flag is on (no cap by candidate
count), so every token is always distributed.

The flag is forwarded **only to the jury call** inside `predefineStageVotes`. The televote
call always passes `false` (without-replacement). `generateCombinedVotes` is untouched.

**Call sites** that must pass the flag:
- `src/state/scoreboard/predefinitionActions.ts` — destructures it from `useGeneralStore`
  settings alongside `splitPointsSystem`.
- `src/components/setup/voting-predefinition/useVotingPredefinition.ts` — same, for the
  setup-screen "Randomize all" preview.

---

## Critical invariant: each Vote keeps a unique `pointsId`

`Vote` objects are defined as `{ countryCode, points, pointsId, showDouzePointsAnimation }`.
Even when sampling with replacement produces duplicate `countryCode` values, every vote in
the array retains a **unique `pointsId`** (the index into `sortedPoints`). All downstream
readers — `givePredefinedJuryPoint`, `givePredefinedJuryPointsGrouped`,
`giveRandomJuryPoints`, `finishJuryVotingRandomly` — look up a vote by `pointsId` and then
**sum per country**, so duplicate `countryCode` entries accumulate correctly without any
further changes to those functions.

---

## Jury voting action (`giveJuryPoints`)

**File:** `src/state/scoreboard/votingActions.ts`

Three changes relative to the standard flow:

### 1. `lastReceivedPoints` accumulation

```ts
lastReceivedPoints: (baseCountry.lastReceivedPoints ?? 0) + votingPoints,
```

On re-click the displayed value grows (e.g. 1 → 2 → 3). Backward-compatible: when the flag
is off the clicked country's `lastReceivedPoints` is always `null` at this point (reset on
`isFirstPointOfSet` or never scored), so `?? 0` gives the same result as the old literal
`votingPoints`.

### 2. Predefined-vote bookkeeping (no swap-back)

When a user clicks a country that differs from the predefined vote for the current step, the
action normally swaps the two countries' votes to keep the assignment consistent. With the
flag on the swap-back is **omitted** — we only reassign the current step's vote to the
clicked country, leaving other votes for that country untouched:

```ts
if (allowMultiple) {
  updatedVotes[voteForPointsIndex] = { ...updatedVotes[voteForPointsIndex], countryCode };
  // no swap-back
} else {
  // original swap-with-swap-back
}
```

### 3. `shouldReset` is index-based when the flag is on

```ts
const shouldReset = allowMultiple
  ? isNextVotingCountry      // whole set just completed (index-based)
  : countriesWithPoints.length === pointsSystem.length;  // original distinct-count check
```

With duplicates the distinct count of countries that have `lastReceivedPoints !== null` can
never reach `pointsSystem.length`, so the original comparison must not be used.

---

## Clickability during jury voting

Two components track whether a scored country should stay clickable.

### `src/components/board/hooks/useVoting.ts` — `hasCountryFinishedVoting`

```ts
const hasCountryFinishedVoting = useMemo(
  () =>
    !allowMultiplePointsToSameEntry &&
    countriesWithPointsLength === MAX_COUNTRY_WITH_POINTS &&
    isJuryVoting,
  …
);
```

Forced to `false` when the flag is on so the "all slots filled" re-enable shortcut never
misfires when the same country holds multiple slots.

### `src/components/countryItem/hooks/useItemState.ts` — `isDisabled`

```ts
if (isVoted && !hasCountryFinishedVoting) {
  if (!(allowMultiplePointsToSameEntry && isJuryVoting && !isVotingCountry)) {
    return true;
  }
}
```

The outer guard (`isVoted && !hasCountryFinishedVoting`) still fires as usual when the flag
is off. When the flag is on and we are in jury voting and the country is not the active voter,
the `return true` is skipped — the entry stays clickable.

Scoping notes:
- `isJuryVoting` ensures televote branches (lines below) are unaffected.
- `!isVotingCountry` keeps the currently-voting country itself disabled.
- Re-enabling for the **next** voting country still happens via the existing
  `isFirstPointOfSet` reset (`lastReceivedPoints: null` for all countries at
  `votingPointsIndex === 0`).

---

## Breakdown stats table

**File:** `src/components/simulation/finalStats/useFinalStats.ts` — `getPointsFromVoter`

The function previously used `.find()` which returned only the first vote for a
`(participant, voter)` pair. It now uses `.filter().reduce()` to sum all votes with the same
`countryCode`:

```ts
const total = votes
  .filter((v) => v.countryCode === participantCode)
  .reduce((sum, v) => sum + v.points, 0);
```

This correctly shows `3` when a voting country gave three 1-point tokens to the same entry,
and is backward-compatible (a single match reduces to the same value as `.find().points`).

---

## Persistence

The setting is saved and restored with the contest snapshot exactly like `splitPointsSystem`.

| Location | What happens |
|---|---|
| `src/types/contestSnapshot.ts` | `setup.allowMultiplePointsToSameEntry?: boolean` |
| `src/helpers/contestSnapshot.ts` — save | Spread `{ allowMultiplePointsToSameEntry: true }` into `snapshot.setup` only when truthy (omit when false to keep snapshots compact) |
| `src/helpers/contestSnapshot.ts` — load (setup branch) | `generalSettingsUpdateSettings.allowMultiplePointsToSameEntry = !!snapshot.setup.allowMultiplePointsToSameEntry` |
| `src/helpers/contestSnapshot.ts` — load (simulation branch) | Same assignment, so the flag is restored regardless of whether the snapshot is loaded as setup-only or full simulation |

The compact vote format `[countryCode, pointsId]` already supports duplicate `countryCode`
values with distinct `pointsId`s, so the encoder/decoder requires no changes.

---

## What is intentionally NOT affected

- **Televote** — always sampled without replacement; totals and clickability unchanged.
- **`StageVotingMode.COMBINED`** — `generateCombinedVotes` is untouched; the combined
  ranking logic (sum of jury rank + televote rank) does not support with-replacement.
- **`givePredefinedJuryPointsGrouped` / `giveRandomJuryPoints` / `finishJuryVotingRandomly`**
  — these already read votes by `pointsId` and sum per country, so duplicate entries are
  handled correctly with zero code changes.
- **Douze animation** — `showDouzePointsAnimation` is per-step from `votingPointsItem.showDouzePoints`.
  The 1×10 pool has no value-12 token, so the animation never fires. Any re-click on a step
  whose `showDouzePoints` is `true` would animate correctly regardless.
