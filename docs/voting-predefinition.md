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
this or Save is blocked. The `'WW'` ("Rest of the World") voter is skipped for
jury but participates in televote/combined.

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
├── Detailed mode  → VotingPredefinitionTable
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
numeric point inputs. `applyInputValue` handles the fiddly bits: mapping a typed
value to an available `pointsId`, transferring an id from another recipient when
the value is already used, and (when the "multiple points per entry" setting is
on) a greedy subset-sum to reach a jury total. `getVoterValidity` drives the
per-column complete/incomplete/invalid dots.

The `Total / Jury / Televote` segmented control in the command bar selects which
channel you're editing; `Total` is a read-only aggregate view.

Save is gated rather than allowed-then-erroring: `validateAllBeforeSave` runs on
every `votes` change, disabling Save (with a tooltip) and — once the matrix has
some votes in it — surfacing a callout naming the offending voters.

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
- `state/scoreboard/votesPredefinition.ts` — shared Plackett–Luce random engine
- `state/scoreboard/rankToStageVotes.ts` — Rank pipeline + `swapRecipients` repair
- `state/scoreboard/rankToOdds.ts` — order → odds band
- `state/scoreboard/totalsToStageVotes.ts` — Totals clamp + largest-remainder constructor
- `*.test.ts` for `rankToStageVotes` and `totalsToStageVotes`

**Share adapters:**
- `state/scoreboard/manualShareTotalsHelpers.ts` — from typed totals
- `state/scoreboard/votesShareHelpers.ts` — from the matrix

**UI:**
- `components/setup/voting-predefinition/VotingPredefinitionModal.tsx` — shell
- `useVotingPredefinition.ts` — state hook
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
  validity, and the swap repair. Run: `yarn test:run src/state/scoreboard/`.
- **Types:** `yarn lint:types-cli` (stricter than the dev build).
- Per project memory, prefer these targeted checks over the noisy global lint/test.

### Invariants any change here must preserve
1. Every mode produces a matrix passing `validateAllBeforeSave` (each voter uses
   each pointsId once, distinct non-self recipients; `WW` skipped for jury).
2. Total channel points always equal `voters × Σ(pointsSystem)` — you can't add or
   remove points, only move them between recipients.
3. Totals: `blank ≠ 0`; infeasible targets are clamped and surfaced, never
   silently produce a broken matrix.
4. The three modes stay in sync through the shared `votes` state.
5. Algorithm modules stay pure (no React/store imports) so they remain unit-testable.
