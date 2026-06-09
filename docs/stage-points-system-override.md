# Per-Stage Points System Override (General tab)

This document describes the architecture for overriding the global points system on a
per-stage basis. The override is configured via the **General** tab of the stage
post-setup modal (`PostSetupModal.tsx`). The same container (`StageOverrides`) is
designed to accommodate future per-stage overrides of other voting settings.

---

## Overview

Every simulation normally uses one global active points system
(`generalStore.pointsSystem` / `generalStore.televotePointsSystem`) that was copied from
settings at event-start. A stage override lets a specific stage substitute its own complete
points configuration — points values, the `showDouzePoints` markers, split/non-split mode,
and `allowMultiplePointsToSameEntry` — while all other stages continue to use the global one.

The override is **all-or-nothing**: the whole configuration is either present or absent on the
stage. There is no partial merging of individual fields.

---

## Data model

### `src/models/index.ts`

```ts
export interface PointsItem {
  value: number;
  showDouzePoints: boolean;
  id: number;
}

export interface StagePointsSystemOverride {
  pointsSystem: PointsItem[];           // jury (or single) points list
  televotePointsSystem: PointsItem[];   // only meaningful when splitPointsSystem is true
  splitPointsSystem: boolean;
  allowMultiplePointsToSameEntry: boolean;
}

export interface StageOverrides {
  pointsSystem?: StagePointsSystemOverride;
  // Future per-stage overrides go here as additional optional fields.
}

// In EventStage:
overrides?: StageOverrides;
```

`StageOverrides` is the scalable container. Adding a new kind of override means:
1. Add an optional field to `StageOverrides`.
2. Add a corresponding field to the snapshot type (`src/types/contestSnapshot.ts`).
3. Add serialization / deserialization in `src/helpers/contestSnapshot.ts`.
4. Wire a new resolver or extend `resolveStagePointsSystem` for the new field.
5. Expose a control in `StageGeneralTab.tsx`.

---

## Runtime resolution

### `src/state/scoreboard/stageOverrides.ts`

`resolveStagePointsSystem` is the **single source of truth** for deciding which points system
a stage uses during simulation. It is a pure function — call it anywhere you have access to
the current stage and the general-store state:

```ts
const resolved = resolveStagePointsSystem(currentStage, useGeneralStore.getState());
// resolved.pointsSystem          — jury points list
// resolved.televotePointsSystem  — televote points list (equal to jury when not split)
// resolved.splitPointsSystem     — boolean
// resolved.allowMultiplePointsToSameEntry — boolean
```

Resolution rules:
- If `stage.overrides?.pointsSystem` is present → use all four fields from the override.
  When the override has `splitPointsSystem: false`, `televotePointsSystem` is returned as a
  copy of `pointsSystem` (same as the global fallback logic).
- Otherwise → fall back to `general.pointsSystem` / `general.televotePointsSystem` /
  `general.settings.splitPointsSystem` / `general.settings.allowMultiplePointsToSameEntry`.

### Call sites (simulation engine)

Every place that previously read the global points system directly now calls the resolver:

| File | Function | What it uses |
|---|---|---|
| `src/state/scoreboard/getters.ts` | `getVotingPoints` | `pointsSystem` |
| `src/state/scoreboard/votingActions.ts` | `giveJuryPoints` | `pointsSystem`, `allowMultiplePointsToSameEntry` |
| `src/state/scoreboard/votingActions.ts` | `givePredefinedJuryPointsGrouped` | `pointsSystem` (for grouping and `showDouzePoints`) |
| `src/state/scoreboard/votingActions.ts` | `givePredefinedJuryPoint` | `pointsSystem` |
| `src/state/scoreboard/votingActions.ts` | `giveRandomJuryPoints` | `pointsSystem` |
| `src/state/scoreboard/votingActions.ts` | `finishJuryVotingRandomly` | `pointsSystem` |
| `src/state/scoreboard/predefinitionActions.ts` | `predefineVotesForStage` | `pointsSystem`, `televotePointsSystem`, `allowMultiplePointsToSameEntry` |

### UI call sites (read-only display / clickability)

These components resolve from the override directly (without going through
`resolveStagePointsSystem`) since they only need a single field:

| File | What it reads |
|---|---|
| `src/components/controlsPanel/VotingPointsInfo.tsx` | `stage.overrides?.pointsSystem?.pointsSystem` (jury list for the active-points grid) |
| `src/components/countryItem/DouzePointsAnimation.tsx` | `stage.overrides?.pointsSystem?.pointsSystem` (to gate the animation render) |
| `src/components/board/hooks/useVoting.ts` | `stage.overrides?.pointsSystem` (`allowMultiplePointsToSameEntry`, `pointsSystem.length` for `MAX_COUNTRY_WITH_POINTS`) |
| `src/components/countryItem/hooks/useItemState.ts` | `stage.overrides?.pointsSystem?.allowMultiplePointsToSameEntry` (clickability logic) |

`VotingPointsInfo` and `DouzePointsAnimation` get the stage via
`useScoreboardStore((state) => state.getCurrentStage()?.overrides?.pointsSystem?....)`.
`useVoting` and `useItemState` get it via `state.getCurrentStage()?.overrides?.pointsSystem`.

---

## DouzePoints animation

`DouzePointsAnimation.tsx` has an internal guard:

```ts
const isDouzePoints =
  isThemePreview ||
  pointsSystem.some((point) => point.showDouzePoints && point.value === pointsAmount);
```

`pointsSystem` is now the stage-resolved list (override if present, else global). Without this
fix the component would check the global system and silently suppress the animation even when
the override marks a different value as douze-capable.

---

## `allowMultiplePointsToSameEntry` in manual voting

Two hooks gate clickability and the "voting finished" shortcut. Both now fall back through
the stage override before reading the global setting:

### `src/components/board/hooks/useVoting.ts`

```ts
const stagePointsOverride = useScoreboardStore(
  (state) => state.getCurrentStage()?.overrides?.pointsSystem ?? null,
);
const allowMultiplePointsToSameEntry =
  stagePointsOverride?.allowMultiplePointsToSameEntry ?? globalAllowMultiple;
const MAX_COUNTRY_WITH_POINTS =
  stagePointsOverride?.pointsSystem.length ?? globalPointsSystem.length;
```

`MAX_COUNTRY_WITH_POINTS` also uses the override length so the "all slots filled" check
remains correct when the stage has a different number of point tokens than the global.

### `src/components/countryItem/hooks/useItemState.ts`

```ts
const stageAllowMultiple = useScoreboardStore(
  (state) =>
    state.getCurrentStage()?.overrides?.pointsSystem?.allowMultiplePointsToSameEntry,
);
const allowMultiplePointsToSameEntry = stageAllowMultiple ?? globalAllowMultiple;
```

The derived `allowMultiplePointsToSameEntry` is then used in the existing `isDisabled`
`useMemo` — no other changes needed there.

---

## Setup UI

### `src/components/setup/post-setup/PostSetupModal.tsx` — General tab

The modal has three tabs in order: **Running Order**, **Voters**, **General**. The General
tab is last by design — it is the least frequently needed.

The modal integrates `useStagePointsOverrideDraft(stage, isOpen)` and wires its return
values directly into `StageGeneralTab`:

```
useStagePointsOverrideDraft → controller, isOverridden, resetToGlobal, getOverride
↓
StageGeneralTab → PointsSystemSelection (controller prop)
```

On **Save**, `handleSave` calls `getOverride()`:
- Returns a `StagePointsSystemOverride` if the local state differs from global → stored on
  both `configuredEventStages` and `eventStages`.
- Returns `undefined` if local === global → `omitPointsSystemOverride` cleans up the
  `overrides` container (preserving any other override keys).

### `src/components/setup/post-setup/hooks/useStagePointsOverrideDraft.ts`

Manages the local draft for the General tab:

- **On open**: seeds from `stage.overrides?.pointsSystem` if present, else from global
  settings (`settingsPointsSystem`, not the active simulation copy).
- Exposes a `PointsSystemController` backed by local React state so `PointsSystemSelection`
  can read/write without touching the store.
- **`isOverridden`**: `true` when local state differs from the current global settings
  (compares arrays by `value` + `showDouzePoints`; includes `splitPointsSystem`,
  `allowMultiplePointsToSameEntry`, and the televote array when split is active on either side).
- **`resetToGlobal()`**: reseeds local state from current global settings (does NOT reopen
  the modal — the user stays on the tab and sees the reset happen live).
- **`getOverride()`**: re-runs the diff; returns `StagePointsSystemOverride | undefined`.

### `src/components/settings/pointsSystem/PointsSystemSelection.tsx` — controller prop

`PointsSystemSelection` was refactored from reading `generalStore` directly to accepting a
`PointsSystemController` prop:

```ts
export interface PointsSystemController {
  pointsSystem: PointsItem[];
  televotePointsSystem: PointsItem[];
  splitPointsSystem: boolean;
  allowMultiplePointsToSameEntry: boolean;
  setPointsSystem: (p: PointsItem[]) => void;
  setTelevotePointsSystem: (p: PointsItem[]) => void;
  setSplitPointsSystem: (v: boolean) => void;
  setAllowMultiplePointsToSameEntry: (v: boolean) => void;
}
```

`useGlobalPointsSystemController` (same folder) provides the controller wired to the global
`settingsPointsSystem` store fields — this is what `VotingSettings.tsx` uses, preserving the
original global-settings behavior unchanged.

### Indicator and reset

When `isOverridden` is `true`, `StageGeneralTab` shows a yellow indicator banner above the
`PointsSystemSelection` component with a **Reset to global** button. The indicator disappears
immediately when the user resets or edits the override back to match global.

i18n keys (all 8 locale files, under `setup.eventStageModal`):
- `general` — tab label
- `enablePredefinedVotesForStage` — enable predefined votes for stage label

---

## Predefinition panel (`useVotingPredefinition.ts`)

`useVotingPredefinition` serves `VotingPredefinitionModal`. It now resolves the four
points-system fields from `stage.overrides?.pointsSystem` first:

```ts
const stageOverride = stage.overrides?.pointsSystem;

const pointsSystem = stageOverride?.pointsSystem ?? globalPointsSystem;
const televotePointsSystem =
  stageOverride?.televotePointsSystem ?? globalTelevotePointsSystem;
const splitPointsSystem =
  stageOverride?.splitPointsSystem ?? globalSplitPointsSystem;
const allowMultiplePointsToSameEntry =
  stageOverride?.allowMultiplePointsToSameEntry ?? globalAllowMultiple;
```

All downstream logic in the hook (`applyInputValue`, `getVoterValidity`,
`validateAllBeforeSave`, `rankedCountries`) reads from these resolved variables, so the modal
operates on the correct system automatically.

The `UseVotingPredefinitionArgs.stage` type includes `'overrides'` in its `Pick<EventStage, …>`
so the overrides are available without widening to the full `EventStage`.

### `showDouzePointsAnimation` in manually entered votes

Two hardcoded `value === 12` checks in `applyInputValue` were replaced with the resolved
`showDouzePoints` flag from the points item:

```ts
// allowMultiple branch — newEntries:
showDouzePointsAnimation: !!p.showDouzePoints,

// normal branch — on entry creation:
const chosenPoint = pointsSystem.find((p) => p.id === chosenId);
showDouzePointsAnimation: !!chosenPoint?.showDouzePoints,
```

### Selective `randomizeAll`

When the user is viewing the **JURY** or **TELEVOTE** tab (possible only on
`JURY_AND_TELEVOTE` stages, where `totalBadgeLabel === 'Total'`), `randomizeAll` now only
regenerates the relevant half of the votes and merges it with the existing other half:

```
selectedType === 'Total' OR single-mode stage  →  full regeneration (previous behavior)
selectedType === JURY  →  predefineStageVotes with JURY_ONLY mode; merge jury into prev
selectedType === TELEVOTE  →  predefineStageVotes with TELEVOTE_ONLY mode; merge televote into prev
```

This makes the "Randomize" button scope-aware: clicking it while on the Jury tab does not
discard manually set televote assignments.

---

## Persistence (contest snapshot)

### `src/types/contestSnapshot.ts`

```ts
// Inside setup.stages[]:
overrides?: {
  pointsSystem?: {
    pointsSystem: Array<{ id: number; value: number; showDouzePoints?: boolean }>;
    televotePointsSystem?: Array<{ id: number; value: number; showDouzePoints?: boolean }>;
    splitPointsSystem?: boolean;
    allowMultiplePointsToSameEntry?: boolean;
  };
};
```

Fields are emitted only when truthy / non-empty to keep snapshots compact. The override
lives exclusively in `setup.stages` — the `simulation.stages` array never carries it (the
simulation-load path re-attaches it from the setup stage on load).

### `src/helpers/contestSnapshot.ts`

| Path | What happens |
|---|---|
| **Serialize** | If `stage.overrides?.pointsSystem` exists, emit `overrides.pointsSystem` with both arrays (televote only when `splitPointsSystem: true`) |
| **Deserialize — setup load** | `buildStageOverridesFromSnapshot(s.overrides)` rebuilds `StageOverrides` and attaches it to the configured stage |
| **Deserialize — simulation load (`isSameAsSetup` branch)** | Same builder, using the paired setup-stage entry |
| **Deserialize — simulation load (full branch)** | Looks up the override from a `setupStagesMap` keyed by stage id |

### Per-stage vote decode (`decodePredefinedVotes`)

A stage override may have different point IDs than the global system (e.g. a 7-token
override with IDs 0–6 vs. default IDs 0–9). The decoder now accepts an optional
`stagePointsMaps` argument:

```ts
// Map<stageId, { juryById: Map<id, PointsItem>, televoteById: Map<id, PointsItem> }>
```

For each stage that has an override, per-stage maps are built before decoding. When present
they take precedence over the global `decodeJurySystem` / `decodeTelevoteSystem` maps so
compact vote IDs decode to the correct values.

---

## Adding a new per-stage override field

1. **Model** — add an optional field to `StageOverrides` in `src/models/index.ts`.
2. **Snapshot type** — add it to `setup.stages[].overrides` in
   `src/types/contestSnapshot.ts`.
3. **Serialize** — emit the field in `contestSnapshot.ts` (`setupStagesPayload`).
4. **Deserialize** — read it in `buildStageOverridesFromSnapshot`.
5. **Runtime resolver** — extend `resolveStagePointsSystem` (or create a sibling function in
   `src/state/scoreboard/stageOverrides.ts`) and wire it into every simulation call site
   that currently reads the global setting.
6. **Draft hook** — extend `useStagePointsOverrideDraft` with local state for the new field.
7. **UI** — add the control to `StageGeneralTab.tsx` (or a new sub-component imported there).
8. **i18n** — add keys to all 8 locale files.
