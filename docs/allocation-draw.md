# Allocation draw

The semi-final allocation draw lets a user put the semi-finalists "into the
draw", split them into pots and draw them into the semi-finals and halves, the
way the EBU does every January. Official rules apply with no configuration;
everything else sits behind **Customize**. This document covers the parts that
are not obvious from the code. The plan that led here is
[plans/allocation-draw-plan.md](plans/allocation-draw-plan.md); the design
handoff lives in `currentTask/design_handoff_allocation_draw/`.

## 1. Model

- **Waiting countries** are ordinary participants assigned to
  `CountryAssignmentGroup.TO_BE_DRAWN` in `eventAssignments`. They count as
  participants (`getContestParticipants`), have no stage, and are never part of
  a saved snapshot (a contest cannot start with countries waiting:
  `validateEventSetup` refuses and the footer CTA becomes "Go to the draw").
  Lineup list id: `group:TO_BE_DRAWN` (`listIds.ts`), drop zone id the same.
- **Draw state** is `useAllocationDrawStore` (`src/state/allocationDrawStore.ts`,
  persisted as `allocation-draw-storage`): `enabled` (draw mode), `waitingFrom`
  (where each waiting country came from, for "Put them back where they were"),
  `votesIn` (pre-qualified "Votes in" pins), `rules` and `drawn` (what a
  finished draw left per stage: code, members, voters, order mode). It resets
  with the line-up on a year change (`updateCountriesForYear`) and is hydrated
  from `snapshot.setup.allocationDraw` on contest load.
- **Pins live in the line-up, not in Customize.** In draw mode every country
  inside a semi is *fixed* (it stays, only its half is drawn); a pre-qualified
  country's tile menu gets "Votes in: Drawn / Semi-Final 1 / …". Moving a
  country out of a stage drops its pin (`LineupProvider.move`).
- **Halves** are `EventStage.firstHalfSize` next to `runningOrder`
  (snapshot: `stages[].firstHalfSize`). Absent = no halves.
- **Official pots** are the optional `pot` field on semi-finalists in
  `public/data/countries/countries-YYYY.json`, curated for 2022–2026 (sources:
  eurovision.tv / Eurovisionworld / escXtra pot announcements). Years without
  it fall back to "Based on voting history".
- **"Drawn" chip**: `drawn[stageId]` is shown only while
  `isDrawnInfoCurrent(info, currentCodes)` — i.e. the stage still holds exactly
  the drawn line-up — so no move hook is needed to clear it.

## 2. Engine (`src/state/allocationDraw/`, pure, Vitest)

- `rng.ts` — string hash + mulberry32, Fisher–Yates `shuffle` (also used by the
  Running Order tab and the Voters tab instead of `sort(() => Math.random() - 0.5)`),
  draw codes (`XXX-XXX`). The code is internal only: it seeds the plan and the
  Apply shuffles so a plan is reproducible in memory, but there is no UI to
  enter or copy one (the "Repeat a draw" rule was dropped on 2026-10-03 as not
  worth its surface).
- `engine.ts` — `check(input)` returns a structured `DrawError`
  (`fewSemis | empty | sizesSum | semiFull | potFixed | preqFixed | noFit`);
  `solve(input, code)` returns a `DrawPlan` whose `steps` are the ceremony
  order (group intros, then one step per country). Even split backtracks over
  the pots' per-semi counts until every semi lands on its size with the fixed
  countries where they are. Sizes: balanced `floor(N/k)` with the remainder on
  the *later* semis (2025: 15/16), or custom. Pre-qualified: `floor/ceil(m/k)`
  honouring pins. Same input + same code = same plan.
- `pots.ts` — `resolvePots` (official → nearest pot for extras; history
  clustering; custom; none) and `historyPots`: balanced clustering on the
  symmetric affinity (greedy seeding by the strongest pairs, then pairwise-swap
  local search; countries without data fill the remaining seats).
  `potSizeFor(semis)` = 6 for two or three semis.
- `affinity.ts` — the symmetric matrix from `diasporaPresets.json` (every
  preset layer, regardless of the user's diaspora settings). Loaded lazily by
  `useDrawAffinity` so the 46 KB JSON only ships with the draw.
- `drawInput.ts` — builds the engine input from stages + assignments + the
  store. Drawable semis = every stage with `qualifiesTo` except the last; the
  final = the last stage by order; pre-qualified = countries in the final.
- The engine is translation-free. `allocation-draw/drawCopy.ts` turns steps,
  errors, intro lines and the Grand Final description into copy
  (`setup.allocationDraw.*` in `messages/en.json`; other locales fall back).

## 3. UI (`src/components/setup/allocation-draw/`)

- `useAllocationDraw` computes the model once in `EventSetupModal` and shares
  it through `AllocationDrawProvider`: availability (needs ≥ 2 drawable semis
  and not GF-only), input, `check` error, target sizes, waiting codes.
- Line-up: `ToBeDrawnCard` (pot rows are display only), `DrawPlaceholderTile`
  ("+N from the draw" / "N too many fixed"), pins on `CountryTile`, `DrawnChip`,
  the Grand Final description, the contest-card toggle (`DrawToggleButton`,
  phone: first item of the ⋯ menu) and the enter / leave choice dialogs
  (`DrawModeDialogs`, state in `drawUiStore`). A disabled toggle stays
  clickable and explains itself in an anchored menu (`variant: 'note'`).
- `AllocationDrawModal` is the window: Ready / Drawing / Done / Error in one
  layout, `CustomizePanel` as a drawer (custom pots: tap a chip for a "Move
  to Pot N" menu, or drag it onto another pot), Space = Draw next, Esc closes
  the drawer then the window, `aria-live` announcements. The exact-positions
  lane fills column by column (1…⌈n/2⌉ down the first column), like a
  scoreboard.
- `useDrawCeremony` holds the ceremony state and builds **one GSAP timeline
  per step** (timings from the handoff §7, `timeScale` 0.5 / 0.75 / 1 / 2 / 5,
  `prefers-reduced-motion` = fades only). The timelines only mutate
  attributes, text, classes and inline styles of React-rendered nodes, never
  their structure, and the React state is committed at the end of each step so
  the re-render lands on the same DOM. Flyers are appended to a dedicated
  empty layer. Targets are addressed with `data-*` attributes
  (`data-pc`, `data-fx`, `data-slot`, `data-lane`, `data-panel`, `data-vl`,
  `data-spot`). "Draw next" during a reveal jumps it to its end
  (`progress(1)`) and schedules the next step after the commit.
- `applyDraw.ts` — Apply writes assignments, each semi's `runningOrder`
  (first half then second, each shuffled with `rng(code + ':ro')`; or the
  drawn positions) and `firstHalfSize`, the voters (entrants, any extra voter
  that is neither a semi-finalist nor pre-qualified such as Rest of the World,
  then the drawn pre-qualified), clears the semis' predefined votes, records
  `drawn` and turns draw mode off. The Done-state warning ("…already has votes
  set up", "Apply and reset votes") lists only semis with predefined votes
  *enabled* (`stagesWithVotes`); with them off, the stored votes are random
  leftovers from the last Start (persisted) and are cleared silently.
- Running Order tab: `useRunningOrder` keeps `firstHalfSize`; A–Z / Z–A /
  Shuffle work inside each half; dragging across the divider moves the
  country to the other half (the split moves with it, toast), and every row
  has a "Move to the other half" button that puts it first in that half
  (keyboard-friendly stand-in for dropping on the divider). Dividers are
  plain children of the `react-easy-sort` list (only `SortableItem`s register
  as items, so indices are unaffected). A stage without halves (the Grand
  Final, custom contests) offers **Draw halves**: a random order split
  ⌊n/2⌋ / ⌈n/2⌉, the way the final's halves (and the host's exact slot, which
  is just its position in that order) are drawn; **Remove halves** undoes it.
- Default semi voters (no draw): `usePostSetupStageForm` now adds the
  pre-qualified countries whose year-data `aqSemiFinalGroup` names the stage,
  as long as they take part elsewhere in the contest, so year presets vote
  the official way out of the box.

## 4. Persistence

`buildContestSnapshotFromStores` writes `stages[].firstHalfSize` and
`setup.allocationDraw = { rules?, drawn? }` only when they differ from a fresh
contest, so existing contests keep their fingerprint; the fingerprint and
`useContestDirtyState` include them. The backend stores the snapshot as an
opaque blob — no backend change.

## 5. Deliberately not built

- **Replay / share a draw by code.** Dropped (2026-10-03): too few users would
  use it for the UI surface it costs. The seed still exists internally.
- **The "board" layout** of the draw window (prototype `lay-board`: pots in a
  left column, a compact spotlight banner, semis as dense tables with 29px
  rows). It only pays off when the broadcast layout gets too tall: 3+ semis
  or 40+ entrants, where names of every placed country should stay readable
  without scrolling. Revisit only if such contests show up in feedback.
- **Final-half ceremony at qualification time.** The Grand Final gets its
  halves from the "Draw halves" action instead of an animated draw after each
  semi; the effect on the running order is identical.
