# Voting predefinition

How a user hand-authors a stage's votes before the reveal animation, instead of
letting the random engine generate them. Three authoring modes — **Detailed**,
**Rank**, **Totals** — all write the *same* per-voter vote matrix, which is then
saved and replayed by the simulation.

> Related reading: [voting-simulation-engine-and-diaspora.md](./voting-simulation-engine-and-diaspora.md)
> (the random engine these modes reuse), [running-order-and-tiebreaking.md](./running-order-and-tiebreaking.md)
> (the tiebreakers standings use), and [design/voting-predefinition-modal-spec.md](./design/voting-predefinition-modal-spec.md)
> (the UI/UX brief).

---

## 1. The data model

Everything centres on one shape — the per-voter vote matrix for a stage
(`state/scoreboard/types.ts`):

```ts
type Vote = {
  countryCode: string;   // recipient
  points: number;        // 12, 10, 8…1
  pointsId: number;      // identity of the points slot (allows duplicate values)
  showDouzePointsAnimation: boolean;
};

type StageVotes = {
  jury?:     Record<string /* voterCode */, Vote[]>;
  televote?: Record<string, Vote[]>;
  combined?: Record<string, Vote[]>;
};
```

A **channel** is one of `jury` / `televote` / `combined`. Which channels a stage
uses depends on its `StageVotingMode`:

| Mode | Channels generated | Standings driven by |
|---|---|---|
| `JURY_AND_TELEVOTE` | jury + televote | jury + televote summed |
| `JURY_ONLY` | jury | jury |
| `TELEVOTE_ONLY` | televote | televote |
| `COMBINED` | jury + televote + combined | **combined** (jury/televote kept only for save-validation) |

**Validity contract** (`validateAllBeforeSave` in `useVotingPredefinition.ts`):
every voter in every required channel must use each `pointsId` exactly once, on
distinct non-self recipients. All three modes must produce matrices that satisfy
this or Save is blocked. A voter is only checked in the channels it is eligible
for (`isVoterInChannel` in `state/scoreboard/voterChannels.ts`): by default
`'WW'` ("Rest of the World") is televote-only, and the stage's `voterChannels`
overrides can make any voter jury-only / televote-only (see
`docs/voter-channels.md`).

The authored matrix is committed via `onSave(votes)` and stored in the scoreboard
store's `predefinedVotes[stageId]`; the reveal animation replays it verbatim.

---

## 2. Architecture at a glance

```
VotingPredefinitionModal.tsx         ← shell: command bar wiring, menus, save/close
├── useVotingPredefinition.ts        ← the state hook (the brain)
│     • votes matrix (source of truth for the session)
│     • Detailed editing (applyInputValue, getCellValue, validity)
│     • Rank trio      (rankOrder / generateRankVotes / getRankTotals)
│     • Totals trio    (generateFromTotals / totalsStatus / adjustments)
│     → delegates generation to the two algorithm modules ↓
│
├── Shell          → VotingPredefinitionHeader (command bar + hero)
│                    VotingBarControls (button / icon-button / segmented control)
│                    VotingBarMenu (anchored popover + menu rows)
│                    VotingCallout (info / warning notices)
├── Detailed mode  → VotingPredefinitionTable (the matrix)
│                    VotingPointsBar (readout + points chips under it)
│                    ballotEdits.ts (pure cell / ballot edits)
├── Rank mode      → VotingRankView (+ RankableCountryList)
├── Totals mode    → TotalsPredefinitionView (+ BudgetBar + VotingTotalsShareTable)
│
├── Presets        → useVotingPresetsFlow.ts + presetMappers.ts (overflow menu)
├── Spreadsheet    → voteSpreadsheet(.ts/Parse.ts) (overflow menu + drag-drop)
└── Sharing        → ShareResultsModal / ShareStatsModal fed by share adapters

Algorithm modules (pure, framework-free, unit-tested):
  state/scoreboard/rankToStageVotes.ts    ← Rank: order → matrix
  state/scoreboard/totalsToStageVotes.ts  ← Totals: target totals → matrix
  state/scoreboard/votesPredefinition.ts  ← the shared random engine
                                             (+ completeStageVotes: "Fill the rest")
```

The hook is the single source of truth for the session's `votes`. The modal is
presentation + orchestration; the algorithm modules are pure functions the hook
calls. Keep it that way — the modules have no React/store dependencies and are
tested in isolation.

---

## 3. The three modes

All three read and write the same `votes` state through the hook, so switching
tabs never loses data — you're looking at one object three ways.

### 3.1 Detailed

The raw N×M matrix. Rows = participants, columns = voting countries, cells =
the points one voter gives one participant in the selected channel. The
`Total / Jury / Televote` segmented control in the command bar selects the
channel; `Total` is a read-only aggregate view (a cell there only shows its
vote in the bar: "Croatia gives Israel 16 points: jury 8, televote 8").

**Look.** The stats Breakdown's (`DESIGN.md` → Voting predefinition): codes
(`getShortCodes` + `useChosenShortCodes`) under the voters' flags with the
ballot's validity dot, white shading growing with the points up to the
channel's top value (`cellTop`: 12, or a jury plus a televote 12 on Total),
the top value in the accent, a dim "–" for a country's own cell. Below a
560px container the frozen column shows codes instead of names, unless the
"Always show full country names" setting is on.

**Selecting a cell** (`selected` in the modal) lights its row and column (the
crosshair, toggled on the DOM like Breakdown's; it follows the mouse while
it's over the table) and fills the **points bar** under the matrix
(`VotingPointsBar`): the readout ("Sweden gives Israel 12 points") and the
voter's points as chips, top value first. A used chip shows who has it
("12 / NOR"); picking it moves it to the selected cell, picking the cell's
own chip takes it back. With nothing selected the chips are the points
system as a legend and the line is a hint.

- **Mouse or trackpad** (`useHasFinePointer`): cells are fields. Typing
  still works; Enter / Shift+Enter and the arrows move between fields
  (skipping a country's own cell) and leaving a field commits it. Chips keep
  the field focused (`mousedown` is prevented), so clicking and typing mix.
- **Touch:** cells are buttons (40px rows), so no keyboard opens: a tap
  selects, the chips give the points.

**Every edit goes through `ballotEdits.ts`** (pure, `ballotEdits.test.ts`),
which returns the new ballot and what happened, shown as a notice in the bar
for 5 s:

| Edit | Function | Notes |
|---|---|---|
| Typing | `typeCellValue` | A value the voter gave someone else moves from them ("Moved 12 points from Norway"); a value not in the system ("9") keeps the cell as it was and says so; blank or 0 empties it. With several points per entry (jury only), the number is the cell's total, built from free slots by an exact subset-sum search (not greedy), or "No points left add up to 30". |
| Picking a chip | `pickCellPoint` | Toggle on the cell's own slot; moves a slot held by someone else. |
| Whole vote tap | `giveNextPoint` | Below. |
| Clear | `clearCell` | The bar's Clear. |

The hook (`useVotingPredefinition`) runs them through `editBallot`, which
reads and writes the matrix through a ref as well as state, so two edits in
one tick (a blur commit, then a pick) never start from a stale matrix.

**Whole vote** (`ballotVoter`): a voter's flag on top (or the bar's "Whole
vote") gives that country's points in order, the way a spokesperson reads
them: each tap on a row (its cell or its name) gives the top free value; a
second tap on the same row takes it back. A free chip picked in the bar goes
next instead; a used chip is taken back and goes next. When the vote is
complete the next incomplete voter (in column order) takes over and their
column scrolls into view; when every vote is complete the mode ends. The
bar has "Fill at random" (the rest of this vote, then the next voter), Clear
vote and Done; Escape and Android back end it too, as does selecting a cell
in another column or switching channel.

**Randomize** acts at once while the open tab has no points. Once it has,
it opens a menu: **Fill the rest** (`completeStageVotes`: every incomplete
ballot in the tab's channels gets its missing slots from the random engine,
every point already given stays; on Total in Combined voting, incomplete
combined ballots are rebuilt from the jury and televote ones) or **Replace
all** (`randomizeAll`, as before).

**Size.** From `md` the modal grows, measured, until the matrix fits: the
table's natural width and height plus the modal's chrome (`--vp-w` /
`--vp-h` on the container, capped by the viewport, never smaller than the
usual 64rem × 720px). It's measured with layout sizes (`offsetWidth`), not
bounding rects: the modal opens scaled to 95% and a transform resizes
nothing, so a rect measured then would stick. The size is kept while Rank
and Totals are open, so switching tabs doesn't resize the modal.

**Header.** The command bar is fitted (`useFitStep`): one row; the tab's own
controls on a second row; then (phones) stretched tabs, Reset only in the ⋯
menu, Share and Randomize as icons, and no "Predefine votes" caption. On a
narrow container the "can't save yet" callout gives a count instead of names
(the dots mark the voters).

Save is gated rather than allowed-then-erroring: `validateAllBeforeSave` runs on
every `votes` change, disabling Save (with a tooltip) and — once the matrix has
some votes in it — surfacing a callout naming the offending voters.

> **Known gap (Combined voting):** the standings come from the `combined`
> ballots, but editing the Jury or Televote cells doesn't rebuild them, so a
> hand edit there doesn't change the Combined (Total) view. Only "Fill the
> rest" on Total rebuilds the combined ballots that are incomplete.

### 3.2 Rank — `rankToStageVotes.ts`

Drag participants into the desired final order; the app generates a realistic
matrix that *respects that order*. Pipeline (`generateRankConsistentVotes`):

1. `resolveRankTarget(target, votingMode)` → which engine mode, which channels to
   keep (`mergeChannels`), which channel(s) define the ranking (`rankChannels`).
   For COMBINED: keep all three, rank only `combined`.
2. `buildRankOdds` maps the drag order → an odds map (ordinal, via
   `rankToOdds.ts`), seeding the random engine so its natural output already
   roughly matches the order.
3. `predefineStageVotes(...)` (the shared engine) draws the matrix, diaspora off.
4. `repairMonotonicTotals` fixes any remaining order inversions with the
   **recipient-swap primitive** (`swapRecipients`): relabel one third-party
   voter's two recipients to move points from the over- to the under-ranked code,
   which keeps every ballot valid. Bounded by `swapCap`.

Guarantee: aggregate totals are non-increasing down the drag order (tail ties at
0 accepted). Points stay hidden until "Randomize points" is pressed.

### 3.3 Totals — `totalsToStageVotes.ts`

Type a target total per participant (per channel); the app generates a best-fit
valid matrix. **This is the subtle one** — arbitrary totals are not always
achievable, because each voter hands out a fixed points set once. Pipeline
(`generateVotesForTargets`):

1. **Resolve target channels** (`resolveTargetChannels`) — like the rank
   resolver, but each channel also carries the *field* it reads
   (`jury`/`televote`/`combined`) and its points system.
2. **Clamp to feasibility** (`clampChannelTargets`) — a one-pass Gale–Ryser
   prefix bound: sort targets desc and enforce `sum(top r) ≤ voters × sum(top r
   point values)`. This single pass also caps any one country at `voters × 12`
   (r=1) and the whole channel at its budget (r large).
3. **Spread the leftover** (`buildEffectiveTargets`) — blank countries share
   `budget − Σ(pinned)` evenly, so effective targets sum to the channel budget.
4. **Construct** (`constructChannelTowardTargets`) — **largest-remainder
   apportionment**: each voter gives its highest point value to the country
   furthest below its (running) target, the next value to the next, and so on.
   Deterministic, no local minima, one `O(voters × points × countries)` pass, and
   every voter uses each point id once → always save-valid. For COMBINED, the
   untargeted jury/televote channels (needed only for save-validation) are filled
   by the random engine instead.
5. **Report adjustments** — a country is flagged only when its miss exceeds one
   top point value (`tolerance = maxValue`); below that it's just apportionment
   rounding, not a meaningful "we couldn't honor your number". Returns
   `{ votes, achieved, adjustments }`.

> **Why largest-remainder, not the engine + a magnitude repair?** The first
> implementation seeded odds from magnitudes, ran the random engine, then swapped
> toward targets. It was ~500× slower (≈2.6 s at 26×37) and got stuck in local
> minima, leaving feasible targets tens of points off. The constructor hits
> targets within ~5 points in ≈5 ms. The swap primitive is still used by the
> Rank feature, where only ordering matters.

**`blank ≠ 0`**: an absent field means "let the engine decide" (shares leftover
budget); a typed `0` pins the country to nul points. `handleTotalsCellChange`
deletes the key on blank rather than writing `0`. The per-field `×` and the
matching regression test enforce this distinction.

---

## 4. Feedback & feasibility UI (Totals)

- **`BudgetBar`** (one per channel): `used / budget` and a colour state (green /
  amber near budget / red once the budget or the per-country cap is broken).
  `TotalsPredefinitionView` owns the surrounding panel — one shared fill-count
  line under the bars, and each concrete feasibility warning (a single entry over
  `voters × 12`, or the channel over budget) as its own callout. All computed
  without generating.
- **Adjustment badge** on a row: "you entered X, closest achievable is Y".
- **Breakdown freshness** state machine, gating Generate and Save:

  ```
  ungenerated ──generate──▶ fresh ──edit a total──▶ stale ──regenerate──▶ fresh
  ```

  `Generate` is disabled while `fresh` (regenerating deterministic targets only
  rebuilds structure for the same totals — pure loss). `Save` requires `fresh`.

---

## 5. Cross-mode sync

The three modes share `votes`, but Totals also has its own typed-target input
state (`localTotals`, `ManualShareTotalsRow` per code). Entering the Totals tab
seeds `localTotals` from the current matrix (`getTotalsFromVotes` +
`markTotalsSynced`) so the tabs agree. This is skipped when:

- there are **pending un-generated edits** (`totalsStatus === 'stale'`) — seeding
  would silently discard them; or
- the **matrix is empty** — seeding zeros would pin every country to 0.

`generateFromTotals` merges only the produced channels into `votes` (same
`setVotes((prev) => ({ ...prev, [ch]: generated[ch] }))` merge Rank uses), so a
generated Totals result is fully visible when you switch to Detailed.

---

## 6. Sharing

Users can export images (podium, split table, summary table, breakdown grid)
without running the simulation. The share components consume a small contract —
`rankedCountries`, `getPoints(country, type?)`, and for the grid
`getCellPoints(participant, voter)` — so any data source that produces those
adapters works. There are **two** sources:

| Source | Module | Used when |
|---|---|---|
| Typed totals | `manualShareTotalsHelpers.ts` | Totals tab (non-breakdown shares) |
| Real matrix | `votesShareHelpers.ts` | Detailed/Rank tabs; **always** for the Breakdown grid |

The modal picks per active tab + share type (`useVotesShareSource`). `Breakdown`
needs real per-voter data, so it's disabled when the matrix is empty and always
reads the matrix. `aggregateOnly` is passed only for the typed-totals source
(which has no jury/televote split under COMBINED).

The share menu names its source explicitly ("from this matrix" / "from typed
totals"), so the tab-dependent switch is no longer silent.

---

## 7. Presets & spreadsheets

- **Presets** (`useVotingPresetsFlow.ts`, `presetMappers.ts`,
  `votingPresetsStore.ts`): named save/load, two kinds — `detailed` (the matrix)
  and `totals` (typed targets). Stored client-side.
- **Spreadsheets** (`voteSpreadsheet.ts`, `voteSpreadsheetParse.ts`,
  `VoteSpreadsheetButtons.tsx`): .xlsx/.xls/.csv import/export of the matrix,
  including drag-and-drop onto the modal body (Detailed mode only).

---

## 8. File map

**Algorithm (pure, tested):**
- `state/scoreboard/votesPredefinition.ts` — shared Plackett–Luce random engine,
  and `completeStageVotes` ("Fill the rest", `completeStageVotes.test.ts`)
- `state/scoreboard/rankToStageVotes.ts` — Rank pipeline + `swapRecipients` repair
- `state/scoreboard/rankToOdds.ts` — order → odds band
- `state/scoreboard/totalsToStageVotes.ts` — Totals clamp + largest-remainder constructor
- `*.test.ts` for `rankToStageVotes` and `totalsToStageVotes`

**Share adapters:**
- `state/scoreboard/manualShareTotalsHelpers.ts` — from typed totals
- `state/scoreboard/votesShareHelpers.ts` — from the matrix

**UI:**
- `components/setup/voting-predefinition/VotingPredefinitionModal.tsx` — shell
  (selection, whole-vote mode, the points bar's content, measured size)
- `useVotingPredefinition.ts` — state hook
- `ballotEdits.ts` — pure cell / ballot edits and their outcomes (`ballotEdits.test.ts`)
- `VotingPointsBar.tsx` — the readout line and the points chips under the matrix
- `VotingPredefinitionHeader.tsx` — command bar + hero (fixed shell header)
- `VotingBarControls.tsx`, `VotingBarMenu.tsx`, `VotingCallout.tsx` — shell primitives
- `VotingPredefinitionTable.tsx` — Detailed
- `VotingRankView.tsx`, `components/common/rank/RankableCountryList.tsx` — Rank
- `TotalsPredefinitionView.tsx`, `VotingTotalsShareTable.tsx`,
  `components/common/BudgetBar.tsx` — Totals
- `useVotingPresetsFlow.ts`, `presetMappers.ts`,
  `VotingPredefinitionPresetModals.tsx` — presets
- `VoteSpreadsheetButtons.tsx` (its format tooltip only; the buttons themselves
  are used by the simulation stats header), `voteSpreadsheet.ts`,
  `voteSpreadsheetParse.ts` — I/O

**i18n:** keys under `setup.votingPredefinition.*` in all 9 locales
(`messages/{en,de,fr,es,it,pt,pl,uk,gr}.json`).

---

## 9. Testing & verification

- **Unit** (Vitest, `Math.random` mocked with a seeded LCG for determinism):
  `totalsToStageVotes.test.ts` covers budget/clamp math, the largest-remainder
  fit, blank-vs-zero semantics, and save-readiness across all four voting modes;
  `rankToStageVotes.test.ts` covers the monotonic-order guarantee, ballot
  validity, and the swap repair; `completeStageVotes.test.ts` covers "Fill
  the rest" (kept points, complete ballots untouched, voter filter, several
  points per entry, combined rebuild); `ballotEdits.test.ts` covers typing,
  picking, moving and whole-vote taps. Run:
  `yarn test:run src/state/scoreboard/ src/components/setup/voting-predefinition/`.
- **Types:** `yarn lint:types-cli` (stricter than the dev build).
- Per project memory, prefer these targeted checks over the noisy global lint/test.

### Invariants any change here must preserve
1. Every mode produces a matrix passing `validateAllBeforeSave` (each voter uses
   each pointsId once, distinct non-self recipients; voters ineligible for a
   channel — by default `WW` for jury — are skipped, see `voterChannels.ts`).
2. Total channel points always equal `voters × Σ(pointsSystem)` — you can't add or
   remove points, only move them between recipients.
3. Totals: `blank ≠ 0`; infeasible targets are clamped and surfaced, never
   silently produce a broken matrix.
4. The three modes stay in sync through the shared `votes` state.
5. Algorithm modules stay pure (no React/store imports) so they remain unit-testable.
6. A cell edit never changes a ballot silently: every outcome that isn't
   "set" or "cleared" (moved, not in the system, unreachable) is said in the
   points bar, and an invalid value keeps the cell as it was.
