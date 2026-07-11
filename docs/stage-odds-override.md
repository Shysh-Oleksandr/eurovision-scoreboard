# Per-Stage Odds Override (Odds tab)

This document describes the architecture for overriding the global **odds configuration**
on a per-stage basis. The override is configured via the **Odds** tab of the stage
post-setup modal (`PostSetupModal.tsx`) and mirrors the per-stage points-system override
(`stage-points-system-override.md`) — both live in the same scalable `StageOverrides`
container on `EventStage`.

---

## Overview

Every simulation normally uses one global odds configuration:

- per-country **odds** (`countriesStore.countryOdds` — `{ juryOdds, televoteOdds }` by code),
- the **Randomness** slider (`generalStore.settings.randomnessLevel`), and
- the **Points Spread** slider (`generalStore.settings.pointsSpread`).

These feed the Plackett–Luce random-vote engine (see `voting-simulation-engine-and-diaspora.md`)
for every stage equally. A stage override lets a specific stage substitute its own complete
odds configuration — **all three** of the above — while all other stages continue to use the
global one. Users set the global, persistent odds in **Settings → Odds**; the per-stage tab
reuses the same UI to capture stage-only tweaks.

The override is **all-or-nothing**: the whole configuration (every stage country's odds +
randomness + spread) is either present or absent on the stage. There is no partial merging of
individual fields. It is captured as a **draft** and only committed on the modal's Start/Save
(exactly like the points-system override), returning `undefined` when the draft matches the
globals so no override is stored.

---

## Data model

### `src/models/index.ts`

```ts
export interface StageOddsOverride {
  countryOdds: Record<string, { juryOdds?: number; televoteOdds?: number }>;
  randomnessLevel: number;
  pointsSpread: number;
}

export interface StageOverrides {
  pointsSystem?: StagePointsSystemOverride;
  enablePredefinedVotes?: boolean;
  odds?: StageOddsOverride; // this feature
}

// In EventStage:
overrides?: StageOverrides;
```

`countryOdds` in the override holds an entry for **every country in the stage** (not a sparse
diff), so the override resolves correctly even if the global odds later change.

---

## Runtime resolution

### `src/state/scoreboard/stageOverrides.ts`

`resolveStageOdds` is the single resolver, a sibling of `resolveStagePointsSystem`. It is a
pure function:

```ts
const { countryOdds, randomnessLevel, pointsSpread } = resolveStageOdds(stage, {
  countryOdds: globalCountryOdds,          // countriesStore.countryOdds
  randomnessLevel: settings.randomnessLevel,
  pointsSpread: settings.pointsSpread,
});
```

Resolution rules:
- If `stage.overrides?.odds` is present → `countryOdds` is the override **merged over** the
  global map (`{ ...global, ...override.countryOdds }`, so the override wins for the stage's
  countries), and `randomnessLevel` / `pointsSpread` come from the override.
- Otherwise → the passed-in globals are returned unchanged.

**Why a merge, not a replacement:** the engine reads odds by code from a flat map
(`countryOdds[code]?.juryOdds ?? 50` in `buildTheta`) — odds are **never** attached to the
country objects on `stage.countries`. So a per-stage override has to be injected as a
merged/replacement map passed into `predefineStageVotes`, not by mutating countries.

### Call sites (simulation engine)

Both places that predefine random votes now resolve odds per stage:

| File | Function | Notes |
|---|---|---|
| `src/state/scoreboard/predefinitionActions.ts` | `predefineVotesForStage` | Auto-random votes on stage start (the only predefinition path; reached from `eventActions.ts` for the first and subsequent stages). Uses `resolveStageOdds`. |
| `src/components/setup/voting-predefinition/useVotingPredefinition.ts` | (hook body) | The manual **Randomize** button in the predefinition modal. Resolves inline from `configuredStage?.overrides?.odds ?? stage.overrides?.odds` (configured stage is fresher), mirroring how it already resolves the points-system override. |

Both then call `predefineStageVotes(...)` → `deriveEngineParams(randomnessLevel, pointsSpread)`
with the resolved values.

---

## Controller-driven UI

To reuse the settings Odds UI for the per-stage draft, it was refactored to be **controller-
driven**, exactly like `PointsSystemSelection` / `PointsSystemController`.

### `src/components/settings/useGlobalOddsController.ts`

```ts
export interface OddsController {
  countryOdds: CountryOdds;
  randomnessLevel: number;
  pointsSpread: number;
  updateCountryOdds: (code: string, odds: { juryOdds?: number; televoteOdds?: number }) => void;
  setBulkCountryOdds: (odds: CountryOdds, replace?: boolean) => void;
  setRandomnessLevel: (value: number) => void;
  setPointsSpread: (value: number) => void;
  loadYearOdds: (countries: BaseCountry[]) => void;
}
```

`useGlobalOddsController` binds this interface to the global stores (`countriesStore` +
`generalStore.setSettings`), preserving the settings panel's original behavior. It is what
`SettingsModal.tsx` passes to `OddsSettings`.

### `src/components/settings/OddsSettings.tsx`

Refactored from reading `generalStore`/`countriesStore` directly to accepting a
`controller: OddsController` prop (plus `countries`, `onLoaded`). Every odds read/write goes
through the controller. `oddsRankLayout` stays a global UI preference (read/written on
`generalStore` directly — it is **not** part of the override).

### Other UI pieces

- `src/components/settings/CountryRankList.tsx` — gained an optional `oddsSource?: CountryOdds`
  prop. It seeds its rank order from `oddsSource` when provided (the draft map), else from the
  global store — so the drag-to-rank view reflects the draft's odds.
- `src/components/settings/CountryOddsItem.tsx` — unchanged (already fully prop-driven).
- `src/state/countriesStore.ts` — the `loadYearOdds` logic was extracted into a shared pure
  helper `resolveYearOddsFor(countries, allCountriesForYear)`, reused by the store's
  `loadYearOdds` and by the draft's "Load year data".

---

## The draft hook

### `src/components/setup/post-setup/hooks/useStageOddsOverrideDraft.ts`

Manages the local draft for the Odds tab, mirroring `useStagePointsOverrideDraft`:

- **On open (`[isOpen]`)**: seeds local state (`localCountryOdds`, `localRandomness`,
  `localPointsSpread`) from `stage.overrides?.odds` if present, else from the global odds /
  `settings.randomnessLevel` / `settings.pointsSpread`.
- Exposes an `OddsController` backed by local React state, so `OddsSettings` reads/writes the
  draft without touching the store.
- **`isOverridden`**: `true` when the draft differs from the globals — compared over **each of
  `stage.countries`** (`juryOdds`/`televoteOdds`, defaulting to 50) plus `randomnessLevel` and
  `pointsSpread`.
- **`resetToGlobal()`**: reseeds local state from the current globals.
- **`getOddsOverride()`**: re-runs the diff; returns `undefined` when equal to global, else a
  `StageOddsOverride` whose `countryOdds` is restricted to (and explicit for) the stage's
  countries.

> `isOverridden` / `resetToGlobal` are currently exposed but unused by the UI (the Odds tab has
> no override banner or reset button), matching `useStagePointsOverrideDraft`, whose
> `isOverridden` / `resetToGlobal` are likewise unused.

---

## Setup UI

### `src/components/setup/post-setup/PostSetupModal.tsx`

The modal has four tabs in order: **Running Order**, **Voters**, **Odds**, **General**. The
Odds tab is lazy-mounted (like Voters) because it mounts one `CountryOddsItem` per country.

```
useStageOddsOverrideDraft(stage, isOpen) → { controller, getOddsOverride }
↓
StageOddsTab → OddsSettings (controller prop)
```

On **Save/Start**, `handleSave` calls `getOddsOverride()` and merges the result into the stage's
`StageOverrides` (`buildOverrides()`), alongside `pointsSystem` and `enablePredefinedVotes`:

```ts
const oddsOverride = getOddsOverride();
if (oddsOverride) result.odds = oddsOverride;
```

The assembled `overrides` object is written to both `configuredEventStages` and `eventStages`.

### `src/components/setup/post-setup/StageOddsTab.tsx`

A thin wrapper: a note ("These odds apply to this stage only — the persistent global contest
odds are set in Settings") above `<OddsSettings controller={...} countries={stage.countries} />`.

i18n keys (under `setup.eventStageModal`, English base; other locales fall back to English via
`deepMergeMessages` in `src/i18n/request.ts`):
- `odds` — tab label
- `oddsOverrideNote` — the per-stage note

---

## Persistence (contest snapshot)

The odds override is persisted into contest snapshots, matching the points-system override
(and unlike `enablePredefinedVotes`, which is not persisted).

### `src/types/contestSnapshot.ts`

```ts
// Inside setup.stages[].overrides:
odds?: {
  countryOdds?: Array<[string, number, number]>; // [code, juryOdds, televoteOdds] per stage country
  randomnessLevel?: number;
  pointsSpread?: number;
};
```

### `src/helpers/contestSnapshot.ts`

| Path | What happens |
|---|---|
| **Serialize** (`setupStagesPayload`) | If `stage.overrides?.odds` exists, emit `overrides.odds` with **every** stage-country odds tuple (no compaction — see below) plus `randomnessLevel` / `pointsSpread`. |
| **Deserialize** (`buildStageOverridesFromSnapshot`) | Rebuilds `overrides.odds` from the tuples + randomness/spread. All three load paths (setup-load, simulation-load same-as-setup, simulation-load full) funnel through this one helper, so they're covered automatically. |

The override lives exclusively in `setup.stages`; the simulation-load path re-attaches it from
the paired setup stage.

**Why every tuple is saved (no year-default compaction):** the resolver merges the override
over the *current* global map, so the override must carry an explicit value for each stage
country. Omitting a country would make it fall back to whatever the global odds happen to be at
load time, breaking the all-or-nothing semantics. (The global `setup.countryOdds` serialization
*does* compact against year defaults, but it is a full replacement map, not a merged override.)

Vote decoding (`stagePointsMaps`) is unaffected — odds change vote *generation*, not the point
IDs used to decode saved votes.

---

## Adding to / extending this override

`StageOverrides` is the shared, scalable container. To touch the odds override:

1. **Model** — `StageOddsOverride` in `src/models/index.ts`.
2. **Resolver** — `resolveStageOdds` in `src/state/scoreboard/stageOverrides.ts`, wired into
   the two simulation call sites above.
3. **Controller** — `OddsController` (`useGlobalOddsController.ts`) + the draft
   (`useStageOddsOverrideDraft.ts`).
4. **UI** — `OddsSettings` (controller-driven), `StageOddsTab`, `PostSetupModal`.
5. **Snapshot** — schema in `contestSnapshot.ts` types; serialize in `setupStagesPayload` and
   rebuild in `buildStageOverridesFromSnapshot`.
6. **i18n** — keys under `setup.eventStageModal` in `messages/en.json`.

See `stage-points-system-override.md` for the general "adding a new per-stage override field"
checklist that this feature follows.
```
