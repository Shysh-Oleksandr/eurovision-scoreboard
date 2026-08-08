# Plan: Enter totals, run a real simulation (best-fit breakdown)

> Status: **not implemented** — this is a spec for a future session. Written after
> validating the feasibility math and UX approach with the user; open decisions are
> flagged explicitly at the end.

## Context

Today the Voting Predefinition modal has two top-level tabs:

- **Detailed** — a full voter × participant matrix. Each voting country must award
  the whole points system (12/10/8/…/1) to distinct participants. Tedious but
  exact, and it's the only tab that can `Save` and drive a real simulation.
- **Totals (share only)** — free-form total-points-per-participant entry
  (`localTotals`, shape `ManualShareTotalsRow { jury?, televote?, combined? }`,
  see [types.ts:32](../../src/state/scoreboard/types.ts#L32)). `Save` is disabled
  here (`VotingPredefinitionModal.tsx`, `disabled={isTotalsTab}`) — it only feeds
  share images ([manualShareTotalsHelpers.ts](../../src/state/scoreboard/manualShareTotalsHelpers.ts))
  and the split/summary stat tables. The hint text says this outright:
  *"Totals are for sharing results only. Use the Detailed tab and Save to run a
  simulation."*

We already shipped a **Rank** mode inside Detailed (drag-to-rank → generate a
matching per-voter breakdown, see [rankToStageVotes.ts](../../src/state/scoreboard/rankToStageVotes.ts)).
This plan does the analogous thing for **totals**: type a target total per
participant (or per jury/televote), generate a real per-voter breakdown that
best-fits those targets, and `Save` it to actually run the simulation.

**Why this is non-trivial:** the simulation replays a per-voter matrix; a
participant's final total is the column sum of that matrix. Each voter's row is a
fixed multiset (the points system, one full assignment per voter, no repeats).
Arbitrary target totals are **not always achievable** by any such matrix — see the
math below. So "type any number, save it" cannot be a literal contract; it has to
be **best-fit with a clear "why was this adjusted" story**, which the user has
already agreed to.

## The feasibility math (confirmed)

Let `M` = number of voters for a channel, `P` = the points system (values
12,10,8,7,6,5,4,3,2,1 by default, `sum(P) = S = 58`).

- **Channel budget:** total points awarded across all voters in that channel is
  fixed: `budget = M × S` (each voter always hands out the full set, provided
  there are ≥ `|P|` eligible candidates — see edge case below). Sum of all totals
  in that channel must equal the budget *exactly* for a perfect match; this is
  necessary but **not sufficient**.
- **Prefix / top-heaviness bound (Gale–Ryser-style):** sort all target totals
  descending. For every `r`, `sum(top r targets) ≤ M × sum(top r values of P)`.
  In particular any single country's total ≤ `M × 12`. This is the binding
  constraint in practice — two countries can't both claim "everyone gave me 12"
  because there are only `M` twelves in the whole channel, not `M` each.
- **Self-exclusion / small-country-count edge case:** if `participants - 1 <
  |P|`, a voter can't award the full points system (not enough distinct
  candidates); budget shrinks accordingly. Rare (needs a very small contest) but
  the formula should account for it, mirroring how `generateVotesForSource`
  already clamps via `numPointsToAward = min(sortedPoints.length, ranking.length)`
  ([votesPredefinition.ts:193](../../src/state/scoreboard/votesPredefinition.ts#L193)).

### Validating "if I only fill in about half, will that avoid adjustments?"

Partially — there are two independent effects, and only one of them is about
*how many* you fill in:

1. **Slack from blanks (count-based, your intuition — correct):** every
   participant left blank has *no* user constraint, so it can absorb whatever
   budget and whatever high/low point values are left over. More blanks = more
   slack = fewer adjustments, all else equal.
2. **Concentration at the top (not about count):** even with just 2–3 pinned
   totals, if several are set near the theoretical max (`M × 12`), the prefix
   bound breaks regardless of how many other countries are left blank — there's
   a hard limit on how many countries can simultaneously claim near-max totals,
   because the actual `12`s are a shared, finite resource across *everyone*,
   pinned or not.

So: **filling in fewer countries helps, but filling in a few countries with very
high totals can still force adjustments no matter how many are left blank.** The
UI (below) needs to communicate both — a live budget bar (count/sum-based) *and*
a per-entry "this exceeds the max any single country could realistically get"
warning (concentration-based).

## UX proposal: merge Detailed / Rank / Totals into one screen

**Recommendation:** replace the two top-level tabs (`PredefinitionTab.DETAILED` /
`PredefinitionTab.TOTALS`) with a single screen and a **3-way segmented toggle**
— Detailed | Rank | Totals — using the same `RankModeToggle` component already
extracted for Detailed/Rank
([RankModeToggle.tsx](../../src/components/common/rank/RankModeToggle.tsx)). All
three modes read/write the *same* `votes` state via `useVotingPredefinition`, so
switching between them never loses data (same pattern already proven by
Detailed ↔ Rank).

This directly answers the user's ask ("I'd like users to also see the votes
breakdown") — after generating from Totals, switching to Detailed shows the
exact matrix, with voter-validity dots green, no separate "share only" ceiling.

### What happens to sharing (open scope decision — see below)

Today "Share scoreboard / Split table / Summary table" only work from the Totals
tab, reading `localTotals` directly (no breakdown needed, since sharing is just a
podium image / stat table, not the animated reveal). Two options:

- **Option A — full consolidation (recommended, larger diff).** Once *all three*
  modes produce a real, save-able `votes` breakdown, sharing no longer needs its
  own parallel data path. Move the Share buttons into the modal's persistent
  chrome (visible regardless of active mode) and have them read from the same
  derived totals the hook already computes (`rankedCountries`,
  `getTotalPointsForCountry`) instead of `localTotals`. This lets
  `ManualShareTotalsRow` / `manualShareTotalsHelpers.ts` /
  `VotingTotalsShareTable`'s standalone role be retired — the new Totals-input
  view takes over its column layout instead. Bigger refactor; touches sharing
  which currently works and is unrelated to this feature's core risk.
- **Option B — bolt-on (smaller diff, safer).** Leave the existing Totals
  tab/sharing pathway completely untouched. Add the new "generate a breakdown
  from targets" capability as the third view mode, with its **own** local
  target-input state (reusing `VotingTotalsShareTable`'s column layout but not
  its component/state directly). Two places conceptually deal with "totals," but
  nothing existing is at risk.

**Do not silently pick one — confirm with the user first**, since Option A
touches working, unrelated code (sharing) for a coherent-but-optional cleanup.
Default recommendation is A if the user is fine with the larger diff; otherwise B.

### The Totals view mode itself

Reuse `VotingTotalsShareTable`'s per-mode column shape (already exactly right):
jury+televote columns for `JURY_AND_TELEVOTE`, a single column for
`JURY_ONLY`/`TELEVOTE_ONLY`/`COMBINED`
([VotingTotalsShareTable.tsx:78](../../src/components/setup/voting-predefinition/VotingTotalsShareTable.tsx#L78)).
No new decision needed here — the existing table already asks for exactly the
right inputs per voting mode.

**Generation should be an explicit action, not live-on-every-keystroke** —
mirrors the Rank view's already-shipped "hidden until you click Randomize
points" pattern, which the user liked. Proposed flow:

1. User types totals into some subset of rows (blanks allowed, mean "let the
   engine decide").
2. A **live budget bar** (cheap, no generation) updates on every keystroke — see
   below.
3. User clicks **"Generate breakdown"** (parallel to "Randomize points" in Rank
   view). This runs the best-fit algorithm (below), merges the result into
   `votes`, and reveals achieved totals + adjustment markers inline.
4. `Save` becomes enabled once a breakdown has been generated (mirrors how Rank
   view always keeps `votes` valid — see `enterRankMode`'s silent baseline
   generation, `useVotingPredefinition.ts`).
5. If the user edits an input after generating, don't auto-regenerate (avoids
   surprising churn) — either disable `Save` with a "regenerate to reflect your
   changes" hint, or simply have `Save` itself trigger a fresh generation from
   current inputs. Pick whichever is simpler to implement cleanly; either is
   fine UX.

### Budget / feasibility hint UI

Per channel (separate bars for jury and televote when `JURY_AND_TELEVOTE`; one
bar otherwise):

- **Horizontal budget bar:** `sum(pinned totals) / budget`, budget = `M × S`.
  - Green: comfortably under budget, no known prefix violation.
  - Yellow: pinned sum > ~85% of budget, OR few free countries remain to absorb
    the rest.
  - Red: pinned sum exceeds budget, or a specific prefix-bound violation is
    detected (surface it concretely: *"Sweden's 480 exceeds the max any single
    country can get: 444 (37 voters × 12)"*).
- **Fill-count line** under the bar, directly reinforcing the "leave more blank
  = more slack" mental model: *"12 of 26 countries filled in — the rest will be
  generated automatically."*
- **Per-row instant feedback:** if a typed value individually exceeds
  `votersCount(channel) × 12`, flag that input red immediately — this check is
  free (no generation needed) and catches the sharpest, most common mistake.
- Placement: directly above the totals input grid, same slot as the
  `RangeSlider` pair in `OddsSettings` — an already-established "controls row"
  position in this codebase.

### "Why was my number adjusted" messaging

Needs to be genuinely reassuring, not cryptic. Proposed copy (refine during
implementation, but keep this tone):

> Not every combination of totals can be split into a valid vote-by-vote
> breakdown — each voting country hands out a fixed set of points (12, 10, 8, 7,
> 6, 5, 4, 3, 2, 1) and must use all of them, once each. We generated the closest
> possible breakdown to your numbers. A few totals were adjusted to make the math
> work — adjusted countries are marked below.

Per-row: a small badge/tooltip on adjusted rows, e.g. *"Adjusted: you entered
480, closest achievable is 444"* — similar visual weight to the existing
voter-validity dots in `VotingPredefinitionTable`.

## Algorithm: target-seeking generation + repair

This generalizes the machinery already built and tested for the Rank feature
(`rankToStageVotes.ts`) — same channel-resolution pattern, same recipient-swap
repair primitive, now targeting absolute magnitudes instead of just ordering.
**Extend that file rather than starting fresh.**

### Step 1 — Precheck & clamp (before generation, drives the UI bar too)

```
budget = votersCount(channel) × sum(pointsSystem values)   // adjusted for the
                                                             // small-country-count
                                                             // edge case above
pinned = { code: target } for every non-blank input
free   = every other participant (no constraint)
```

Clamp `pinned` values, in order (cheapest/most-common-case checks first):

1. **Per-entry cap:** clamp each individually to `≤ votersCount × maxPointValue`.
2. **Cumulative prefix cap:** sort pinned descending; walk top-down enforcing
   `sum(top r) ≤ votersCount × sum(top r values of P)`, clamping the offending
   (largest) entries down as needed and re-sorting/re-checking.
3. **Total rescale:** if `sum(pinned)` still exceeds `budget` after 1–2, scale
   the remaining excess down proportionally across pinned entries.

Record every clamp as a pending "adjustment" (requested → clamped) — this is
already known before generation even runs, so the UI can warn *before* the user
clicks Generate, not just after.

### Step 2 — Seed odds from (clamped) targets

Analogous to `buildRankOdds` in the Rank feature, but by magnitude instead of
rank position: `odds(code) ≈` a monotonic function of the clamped target (free
codes get a neutral default, e.g. today's 50). This seeds `predefineStageVotes`
so its *natural* output is already roughly proportional to the targets, which
minimizes the work the repair pass has to do.

### Step 3 — Generate

Call the existing, unmodified `predefineStageVotes` (reuse — same engine as
Detailed's Randomize and Rank view) with the seeded odds. Consider forcing lower
`randomnessLevel` / higher `pointsSpread` specifically for this mode (a fidelity
knob, not exposed to the user) so the first-pass matrix starts closer to target
before repair — flag as a tunable to settle empirically.

### Step 4 — Repair toward targets

New `repairTowardTargets(votes, channels, clampedTargets, votingCountries)`,
generalizing `repairMonotonicTotals`'s recipient-swap primitive
(`swapRecipients`, already in `rankToStageVotes.ts`) from "enforce an ordering"
to "minimize absolute deviation from a target vector":

- Compute `delta[code] = achieved[code] - clampedTarget[code]` for **pinned**
  codes only; free codes have no delta constraint.
- While meaningful deltas remain and swaps are available: find the most-over
  pinned code and the most-under pinned code (or a free code as an
  intermediary/absorber — **this is exactly where extra blanks buy real
  algorithmic flexibility, not just precheck slack**), find a third-party voter
  who can swap recipients to move value from over → under, apply it (reuse
  `swapRecipients`). Bound iterations the same way the existing repair does
  (`swapCap`).
- Whatever's still off from the clamped target beyond a small tolerance becomes
  part of the reported adjustment (combine with Step 1's clamp so the user sees
  one number: *original requested → final achieved*).

### Step 5 — Return

```
{ votes, achieved: Record<code, number>, adjustments: Array<{ code, requested, achieved }> }
```

Caller merges `votes` into the shared hook state (same `setVotes` merge pattern
used by `generateRankVotes`), and the UI renders achieved totals + adjustment
badges from the returned `adjustments` list.

### Channel resolution (reuse, don't reinvent)

`StageVotingMode.COMBINED` needs the same trick already solved for Rank in
`resolveRankTarget` ([rankToStageVotes.ts](../../src/state/scoreboard/rankToStageVotes.ts)):
jury+televote channels must both be filled (save-validation gates on them) while
`combined` is the channel that actually drives standings. Reuse/parameterize
that resolver rather than re-deriving the mode → channel mapping.

## Files likely touched

- **New:** `src/state/scoreboard/totalsToStageVotes.ts` (or extend
  `rankToStageVotes.ts`) — precheck/clamp, `targetsToOdds`,
  `repairTowardTargets`, `generateVotesForTargets`. Bring a test file in the same
  style as `rankToStageVotes.test.ts` (feasibility precheck cases, repair
  convergence, save-readiness across all voting modes — that test suite is a
  good template to copy).
- **New:** a budget-bar component (generic enough to live in
  `components/common/`, e.g. `BudgetBar.tsx`) — sum vs. cap, color states,
  fill-count line.
- **New:** `TotalsPredefinitionView.tsx` (parallel to `VotingRankView.tsx`) —
  wires the budget bar, the totals input grid (reuse `VotingTotalsShareTable`'s
  column logic), "Generate breakdown," and adjustment badges.
- **Modified:** `VotingPredefinitionModal.tsx` — collapse
  `PredefinitionTab`/top `Tabs` into the 3-way `RankModeToggle`; decide sharing's
  new home per the Option A/B call above.
- **Modified:** `useVotingPredefinition.ts` — add totals-target state
  (`totalsTargets`, per channel), `generateFromTotals()`, `getTotalsAdjustments()`,
  mirroring the existing `rankOrder`/`generateRankVotes`/`getRankTotals` trio.
- **i18n:** new keys under `setup.votingPredefinition.*` (generate button,
  budget bar labels, adjustment tooltip/message) across all 9 locale files —
  same pattern followed for the Rank feature (`en.json` first, then
  `de/pl/uk/pt/it/fr/gr/es.json`).

## Open decisions for the implementing session

1. **Option A vs B for sharing** (above) — confirm with the user before
   touching `VotingTotalsShareTable`/`manualShareTotalsHelpers.ts`.
2. **Auto-regenerate on edit vs. explicit re-generate** (Step 5 of the UX flow)
   — pick whichever is cleaner to implement; not a hard requirement either way.
3. **Exact clamp ordering/tie-breaking** in Step 1 when multiple entries
   simultaneously violate the prefix bound — the plan gives a workable greedy
   order; exact behavior should be pinned down by test cases, not designed
   up front.
4. **Fidelity knobs** (randomness/spread override during generation, Step 3) —
   tune empirically once the repair pass exists to measure against.
5. **Tolerance threshold** for "close enough, don't report as an adjustment"
   (Step 4) — needs a concrete number (e.g., ±0 for integers, since points are
   integral — likely just exact-or-adjusted, no fuzzy tolerance needed here
   unlike a continuous problem).

## Verification plan (once implemented)

1. Unit tests for the precheck/clamp function: budget-exceeding sums, prefix
   violations with 2–3 high pinned entries (regardless of blank count — this is
   the "concentration" case from the math section), and confirm many-blanks
   scenarios need little/no clamping (the "count" case).
2. Unit tests for `repairTowardTargets`: convergence to exact targets when
   feasible, bounded/reported deviation when infeasible, ballot validity
   preserved (no self-votes, each point id used once) — same assertions as
   `rankToStageVotes.test.ts`.
3. Save-readiness across all four voting modes (JURY_AND_TELEVOTE, COMBINED,
   JURY_ONLY, TELEVOTE_ONLY) — copy the pattern from
   `rankToStageVotes.test.ts`'s "save-readiness across voting modes" block.
4. Manual: type totals for ~half the countries, generate, confirm achieved ≈
   requested with few/no adjustments (validates the "count" intuition
   end-to-end). Then type 2–3 near-max totals with everything else blank,
   confirm the prefix-bound warning fires and adjustments are shown clearly
   (validates the "concentration" case isn't masked by having lots of blanks).
5. `yarn lint:types-cli`, targeted `yarn test:run`, targeted `eslint`, then a
   real Save → simulate → confirm the animated reveal lands on the achieved
   (not originally-requested) totals, since achieved is the only thing that can
   be true.
