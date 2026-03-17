## Running order + tie-breaking (reference)

This document summarizes the **running order selection** feature added to the simulation setup flow and the related **tie-breaking** behavior used across the app (board, stats, winner, qualification).

---

### Running order: what it is

- **Running order** is a user-defined ordering of participants **per stage**.
- It is stored on the stage as `EventStage.runningOrder?: string[]` (array of country codes).
- It is used as:
  - **initial display order** before points are awarded (so the board is stable and matches the user’s chosen order)
  - the **last-resort tie-break** when totals and televote points are tied

Key model:

- `src/models/index.ts` → `EventStage.runningOrder?: string[]`

---

### Setup UI: selecting running order

- The stage post-setup modal now has a **Running Order** tab where users can drag-and-drop participants.
- Implementation was extracted into:
  - `src/components/setup/post-setup/running-order/useRunningOrder.ts`
  - `src/components/setup/post-setup/running-order/RunningOrderTab.tsx`

Notes:

- Default list ordering (when there is no saved running order yet) is **by country name (A–Z)**, not by code.
- Quick-sort actions `A–Z` / `Z–A` also sort **by country name**.

---

### Board sorting rules

#### Primary ranking (high → low)

The base comparator is now:

1. **Total points** (descending)
2. **Televote points** (descending)
3. **Running order** (ascending; earlier in running order wins)
4. **Alphabetical name** (safety fallback only if running order is missing/unknown)

Implemented as:

- `src/state/scoreboard/helpers.ts` → `createCountriesComparator(runningOrder?: string[])`

Board usage:

- `src/components/board/hooks/useCountrySorter.ts` uses `createCountriesComparator(currentStage.runningOrder)` for normal sorting.
- The special `showAllParticipants` path also uses running order as tie-break (with alphabetical fallback).

Why: this prevents large “tie blocks” (e.g. many countries on 0 points) from snapping to A–Z after the first score event.

---

### Winner + qualification consistency

To ensure the entire app resolves ties the same way:

- Winner:
  - `src/state/scoreboard/helpers.ts` → `getWinnerCountry(countries, runningOrder?)`
  - `src/components/board/BoardHeader.tsx` passes `viewedStage.runningOrder`
- Qualification and qualification previews:
  - `src/state/scoreboard/eventActions.ts` uses `createCountriesComparator(currentStage.runningOrder)` when selecting qualifiers
  - `src/components/simulation/qualification/QualificationResultsModal.tsx` sorts qualified countries with `createCountriesComparator(currentStage.runningOrder)`

---

### Final Stats modal sorting

The final stats modal has multiple sorts:

- Main `rankedCountries` is produced in:
  - `src/components/simulation/finalStats/useFinalStats.ts`
  - It uses `createCountriesComparator(selectedStage.runningOrder)`

Additional sorts inside tables were updated to match Eurovision-style expectations:

- `SummaryStats.tsx`: jury/televote placement tie-break uses running order (fallback to name)
- `SplitStats.tsx`:
  - “Total” column breaks total ties by **televote**, then running order (fallback to name)
  - jury/televote columns use running order for ties (fallback to name)

---

### Persistence: snapshot + DB storage (optimized)

Storage principle: **avoid adding new fields** to the DB snapshot for running order.

- `ContestSnapshot.setup.stages[].participants: string[]` is treated as an **ordered list**.
- Simulation also preserves ordering using:
  - `ContestSnapshot.simulation.stages[].participants` (when stored)
  - and `ContestSnapshot.simulation.countriesStateByStage[stageId]` ordering (used to rebuild stage country arrays on load)

Implementation:

- Snapshot build: `src/helpers/contestSnapshot.ts` (`buildContestSnapshotFromStores`)
  - Uses `stage.runningOrder` (filtered to participants) as the source of truth for participants order
  - Appends any missing participants alphabetically (stable when participants change)
  - Ensures `countriesStateByStage` is serialized in that same order

- Snapshot load: `src/helpers/contestSnapshot.ts` (`applyContestSnapshotToStores`)
  - Rebuilds scoreboard stages with `runningOrder` derived from the best available participants list:
    - Prefer **simulation participants** (important for Grand Final with qualifiers)
    - Fall back to setup participants if simulation order is not present
  - Reorders reconstructed `countries` arrays based on participants ordering (so downstream logic sees the same order)
  - Rebuilds `configuredEventStages` (setup UI) with `runningOrder` preferring simulation participants when available

Why this matters:

- Some stages (notably the Grand Final) may have `setup.participants` that only represent “base” participants (e.g., auto-qualifiers), while `simulation.participants` contains the full stage lineup. Using simulation participants prevents “AQs then alphabetical” ordering after load.

---

### Share: sharing running order

Running order can be shared from the Running Order tab by opening the existing share modal with an explicit ordered list:

- `ShareResultsModal` now supports:
  - `countriesOverride?: Country[]`
  - `titleOverride?: string`
  - `subtitleOverride?: string`
- `ImageGenerator` supports `countriesOverride` too.

Files:

- `src/components/simulation/share/ShareResultsModal.tsx`
- `src/components/simulation/share/ImageGenerator.tsx`

---

### Voters initialization (no lazy-tab gotchas)

Previously, default voters were only initialized when the Voters tab mounted (lazy), which could block starting the event.

Now:

- `usePostSetupStageForm` pre-fills `votingCountries` on modal open:
  - If stage already has voters → use them
  - Else if Grand Final → default to all contest participants
  - Else → default to stage participants
- `EventStageVoters` no longer overwrites existing voters on mount.

Files:

- `src/components/setup/post-setup/hooks/usePostSetupStageForm.ts`
- `src/components/setup/post-setup/EventStageVoters.tsx`

---

### Common pitfalls (fixed)

- **Tie blocks re-sorting to A–Z after first points**: resolved by using running order as last-resort tie-break in the core comparator.
- **Saving contest resets order**: resolved by snapshot build/load always using `runningOrder`/participants ordering consistently (including simulation + countriesStateByStage).
- **Grand Final with qualifiers**: resolved by preferring simulation participants for `runningOrder` (both in scoreboard stages and configured setup stages).
- **Maximum update depth** in Voters tab: resolved by preventing form initialization effects from depending on watched values that they also update.

