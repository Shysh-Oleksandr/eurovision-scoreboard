# Voter channels (jury vs. televote voters)

A stage has **one ordered voter list** (`EventStage.votingCountries`). Each voter
additionally has a *channel mode* saying which channel(s) it votes in:

| Mode | Jury / combined ballot | Televote ballot |
|---|---|---|
| `both` (default) | yes | yes |
| `jury` | yes | no |
| `televote` | no | yes |

Overrides live in `EventStage.voterChannels?: Record<code, VoterChannelMode>`.
Only non-default entries are stored; **absent = default**, where the default is
`both` for everyone except the Rest of the World voter (`WW`), which defaults to
`televote`. That default is exactly the legacy behaviour, so stages saved before
this feature load unchanged (no store/snapshot migration).

Jury spokesperson order = list order filtered to jury-eligible voters. Televote
order is irrelevant (televote is aggregated), so a single order is enough.

## The resolver — `src/state/scoreboard/voterChannels.ts`

Every decision goes through this pure module; nothing else may hard-code `'WW'`:

- `getVoterChannelMode(code, voterChannels)` — override ?? default.
- `isVoterInChannel(code, channel, voterChannels)` — `channel` is
  `'jury' | 'televote' | 'combined'`; the combined channel is one
  spokesperson-style ballot per voter, so it needs jury eligibility.
- `filterVotersByChannel(voters, channel | 'all', voterChannels)`.
- `getStagePhaseChannel(stage)` — the channel the stage is voting in right now:
  `JURY_ONLY → jury`, `TELEVOTE_ONLY → televote`, `COMBINED → combined`,
  `JURY_AND_TELEVOTE → isJuryVoting ? jury : televote`.
- `stageUsesChannel(votingMode, 'jury' | 'televote')` — does the mode have a
  phase reading that channel (save validation: each used channel needs ≥ 1
  eligible voter).
- `normalizeVoterChannels(voters, voterChannels)` — prune codes not in the list
  and drop default entries; `undefined` when nothing is left. Applied on save in
  `PostSetupModal.handleSave`.

## Reading voters — `countriesStore.getStageVotingCountries`

```ts
getStageVotingCountries(stageId?, { fromScoreboard = true, channel })
```

- `channel` defaults to `getStagePhaseChannel(stage)`, so the live board
  (`getVotingCountry`, `getVotingCountriesLength`, `giveJuryPoints`, …) needs no
  arguments and automatically walks jury-eligible voters during the jury phase.
- Pass `channel: 'televote'` when aggregating televote ballots
  (`givePredefinedTelevotePoints`, `finishTelevoteVotingRandomly`,
  `TelevoteInput`), `'jury'` for the jury-scale reveal, and `'all'` when handing
  voters to the engine (`predefineVotesForStage`, the predefinition modal,
  spreadsheet import/export) — the engine filters per channel itself.
- `fromScoreboard: false` reads `configuredEventStages` (setup) instead of the
  running `eventStages`.

The old `allowROTW` flag and the `!predefinedVotes[stage]?.televote` hatch are
gone: predefinition now asks for `'all'` explicitly, and Rest of the World only
appears as a jury spokesperson when its mode is `both`.

## Engine

`predefineStageVotes`, `buildCombinedBallotsFromJuryTelevote`,
`generateVotesForTargets` / `computeChannelBudget` /
`constructChannelTowardTargets` (Totals mode) and `generateRankConsistentVotes`
(Rank mode) accept an optional trailing `voterChannels` and skip ineligible
voters per channel. Save validation and preset application
(`useVotingPredefinition.ts`, `presetMappers.ts`) use `isVoterInChannel` the
same way, so a missing ballot for an ineligible voter never blocks Save.

## Persistence

- Zustand stores: `voterChannels` rides along with `configuredEventStages` /
  `eventStages`; optional field + `deepMerge` hydration → no migration.
- Contest snapshot (`helpers/contestSnapshot.ts`): `setup.stages[].voterChannels`
  and `simulation.stages[].voterChannels`, written only when non-empty and
  included in the `isSameAsSetup` dedup comparison. The backend stores stages as
  an opaque blob, so nothing changes there.

## UI — Voters tab (`components/setup/post-setup/voters/VotersTab.tsx`)

Redesigned with the stage setup modal on 2026-11-21 (DESIGN.md, "Stage setup").

- Controls exist only for `JURY_AND_TELEVOTE` (the only two-channel mode); the
  Voters tab receives `localVotingMode` from `PostSetupModal` so it follows the
  General tab live. In other modes the feature is invisible; if the stage still
  holds non-default entries, a note above the list explains they are paused
  (`getEffectiveVoterChannels` ignores them there — only the Rest of the World
  default remains in effect).
- **Channels** (a labelled toggle in the tab's toolbar, lucide `Split`,
  `aria-pressed`) turns the list into a table with a Jury and a Televote
  column (`dp-ss-chrow`): the counts sit in the column headers, each voter has
  two 44px check buttons, rows still drag and still have ×. It is transient
  view state — off again whenever the modal opens. A voter's last active
  channel is locked (`aria-disabled`, dimmed, the reason in its title) —
  exclude a voter with × instead. The buttons use `noDrag` (native
  `mousedown`/`touchstart` stop) so they never start a react-easy-sort drag.
- With Channels off, a voter whose mode is not the default says so in the
  quiet line under its name ("Jury only" / "Televote only"), after its status
  (Auto-Q, the stage it performs in); Rest of the World therefore reads
  "Televote only" out of the box.
- The toolbar shows "16 in the jury, 17 in the televote" beside the count when
  the counts differ.
- Per-voter overrides live in the post-setup form store
  (`useWatchVoterChannels`), so `PostSetupModal` can validate live: a Jury and
  Televote stage with no jury-eligible (or no televote-eligible) voter shows
  `VoterChannelsErrorBar` docked above the footer, disables Start, and offers
  both fixes in place: "Give all voters both" (clears the overrides) and "Make
  it televote only" / "Make it jury only" (switches the stage's voting mode).
  Set voters → "Give all voters both" also clears them (with Undo). Overrides
  are pruned to the current list on save.
