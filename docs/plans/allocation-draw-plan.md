# Plan: Semi-final allocation draw

> Status: **v1 implemented (2026-10-03)** — phases 1–4 below. See
> [allocation-draw.md](../allocation-draw.md) for how it is built and what was
> left for later. The design handoff (`currentTask/design_handoff_allocation_draw/`)
> superseded the UX sections' visual details; the brief is
> [here](../design/allocation-draw-design-prompt.md).

## Goal

Let users run a Eurovision-style **semi-final allocation draw**: put the
competing countries "into the draw", split them into pots, and draw them into
the semi-finals (and halves), with the pre-qualified countries drawn into the
semi they vote in. Official rules are the default; custom contests can change
them. The base flow must be obvious to a first-time user — customisation is
available but never required.

Today there is no pot/draw/halves logic anywhere; the only trace is the roadmap
entry in [feedbackInfo/data.ts](../../src/components/feedbackInfo/data.ts).

---

## Official rules (the baseline)

Verified against the 2024–2026 draws.

- **Who is drawn:** every semi-finalist. The Big 5 (Big 4 in 2026) and the host
  are pre-qualified for the final and skip the semis.
- **Pots:** semi-finalists are grouped into pots (5–6 in practice; 5 in 2010,
  2013, 2015, 2021, 2025, 2026) of countries with similar voting history,
  calculated by the EBU's voting partner. Same-pot countries are *likely to vote
  for each other*, so splitting every pot evenly separates them.
- **Semi draw:** pot by pot, each country is drawn into a semi; each pot is
  split as evenly as possible and semis stay within ±1 of each other.
  30 → 15/15 (2026); 31 → 15/16 with one pot of 7 (2025).
- **Half draw:** right after, a second draw puts the country in the first or
  second half of its semi. Halves can be uneven (2026 SF1: 7/8).
- **Pre-qualified countries** are drawn to *vote* in one semi, spread evenly
  (3/3 in 2025, 2/3 in 2026). Since 2024 they also perform there, out of
  competition. This draw happens first.
- **Pre-allocations** are broadcaster requests the EBU approves before the
  draw: Israel → SF2 (Memorial Day: 2016, 2023, 2024), Germany votes in SF2
  (2015, 2023), Switzerland → SF2 (2019).
- **Running order:** since 2013 producers order acts *within* the drawn halves;
  2008–2012 drew the exact positions.
- **Final (not in v1):** qualifiers draw a half at the post-semi press
  conference, pre-qualified countries draw a half too, the host's exact slot is
  drawn in March, then producers order the show.
- 2004–2007 had a single semi and no allocation draw.

2026 pots (prototype / test data):

| Pot | Countries |
|---|---|
| 1 | Albania, Bulgaria, Croatia, Montenegro, Serbia, Switzerland |
| 2 | Australia, Denmark, Estonia, Finland, Norway, Sweden |
| 3 | Armenia, Azerbaijan, Georgia, Israel, Poland, Ukraine |
| 4 | Belgium, Czechia, Luxembourg, Moldova, Portugal, Romania |
| 5 | Cyprus, Greece, Latvia, Lithuania, Malta, San Marino |

Pre-qualified 2026: Austria (host), France, Germany, Italy, United Kingdom.

---

## Decisions (made 2026-10-03, don't re-ask)

1. **"To be drawn" bucket.** A new `CountryAssignmentGroup.TO_BE_DRAWN` holds
   participants that have no stage yet. Same precedent as the GF-only
   "Not qualified" card ([StageList.tsx](../../src/components/setup/hub/lineup/StageList.tsx));
   `getContestParticipants` already counts every non-pool group, so these
   countries are participants immediately. Rejected: a separate participant
   picker inside the draw window (duplicates the lineup), "put everyone in SF1
   and shuffle" (can't express pre-qualified voting or pins).
2. **Entry point is a draw-mode toggle on the Contest card** — a button on
   tablet/desktop, an item in the phone overflow menu
   ([ContestCard.tsx](../../src/components/setup/widgets-section/contests/ContestCard.tsx) `moreItems`).
3. **Simple by default.** Official rules apply without any configuration; all
   options sit behind one "Customize" entry and every changed option can be
   reset to official.
4. **A drawn contest makes pre-qualified countries vote in their semi**
   (appended to that semi's voter list). Making year presets do the same by
   default is a separate small change (today semi voters default to the
   stage's own entrants, [usePostSetupStageForm.ts](../../src/components/setup/post-setup/hooks/usePostSetupStageForm.ts),
   and `aqSemiFinalGroup` is only read by the Voters tab "Load year data").
5. **Halves are first-class in the Running Order tab:** a "First half / Second
   half" divider; shuffle works within halves.
6. **v1 = semi-final draw only.** Final-half / host-slot draw is phase 5.
7. **Full animated ceremony**, with "Skip to result" always visible and an
   "Instant result" path.

---

## UX outline (brief for design)

1. **Draw mode on** (Contest card button). If the semis already hold countries
   (every year preset), ask: *move the N semi-finalists into the draw* or *keep
   them where they are*.
2. **Lineup in draw mode:** a "To be drawn" stage-style card above the semis.
   Countries get there the usual ways (tile menu, drag, selection tray, "Move
   all to…"). Pre-qualified countries stay in the Grand Final.
   - **Pins = placing a country in a semi yourself.** While draw mode is on,
     anything in a semi stays where it is and the draw only places waiting
     countries. This replaces a separate pre-allocation UI.
   - **Pre-qualified voting pin:** the GF tile menu gets "Votes in: Drawn /
     SF1 / SF2" in draw mode.
3. **The footer CTA says the next step:** "Start the draw" while countries are
   waiting, back to "Start" once nothing is waiting. Start is never possible
   with countries left in the bucket.
4. **Draw window — one layout, three states:**
   - *Ready* (0 of N): pots filled, semis empty, three plain-language rule
     lines, "Official rules · Customize", buttons "Start the draw" and
     "Instant result".
   - *Drawing*: pre-qualified voting first, then pot by pot; spotlight
     caption ("Croatia → Semi-Final 1 · First half"); Draw next / Auto-play
     (speed) / Skip to result.
   - *Done*: "Apply to line-up" (primary), "Redraw", close. Warns if votes are
     already predefined for a semi.
5. **Apply** writes stage assignments, appends pre-qualified voters to their
   semi, orders each semi first half → second half (shuffled inside each
   half), stores the draw for replay, and switches draw mode off.
6. **Running Order tab** shows the halves divider; "Shuffle" keeps halves.

### Customisation (behind "Customize")

| Rule | Official default | Options |
|---|---|---|
| Stages drawn into | Every stage that qualifies into another (SF1 + SF2) | Pick stages (supports 3+ semis) |
| Pots | Official list for curated years, else "From voting history" | From voting history / Custom (drag between pots, add/remove) / No pots |
| Splitting pots | Even per semi | Fully random |
| Semi sizes | Balanced (±1) | Custom size per semi |
| Running order | Draw halves (2013+) | Draw exact positions (2008–12) / Don't change |
| Pre-qualified voting | Each drawn into one semi, balanced | Vote in every semi / Don't vote in semis |
| Draw code (seed) | Random | Enter a code to repeat a draw |

Per-country pins live in the lineup (decision above), not in Customize.

---

## Technical design

### Model

- `CountryAssignmentGroup.TO_BE_DRAWN` ([models/index.ts](../../src/models/index.ts)),
  a `ListId` `group:TO_BE_DRAWN` ([listIds.ts](../../src/components/setup/hub/lineup/listIds.ts)),
  a `StageCard` kind `draw`, move targets in `useLineupModel`, drop id in
  `dnd/dndIds.ts`.
- `buildEventStagesFromAssignments` currently maps unknown groups to
  NOT_PARTICIPATING — it must ignore TO_BE_DRAWN (no stage) without dropping it.
- `validateEventSetup` blocks Start while the bucket is non-empty.
- Draw state (new `allocationDrawStore` or a slice of `countriesStore`,
  persisted like `eventAssignments`):

```ts
interface AllocationDrawConfig {
  enabled: boolean;                       // draw mode
  targetStageIds: string[];               // default: stages with qualifiesTo
  pots: string[][] | null;                // null = resolve from source
  potsSource: 'official' | 'history' | 'custom' | 'none';
  spreadPotsEvenly: boolean;              // true
  stageSizes: Record<string, number> | null; // null = balanced
  positionMode: 'halves' | 'exact' | 'none';
  preQualifiedVoting: 'drawn' | 'all' | 'none';
  preQualifiedPins: Record<string, string>;  // code → stageId
  seed: string | null;
}

interface AllocationDrawStep {
  kind: 'voter' | 'entrant';
  code: string;
  pot?: number;
  stageId: string;
  half?: 1 | 2;
  position?: number;                      // positionMode 'exact'
}

interface AllocationDrawResult {
  seed: string;
  steps: AllocationDrawStep[];            // ordered = ceremony order
  drawnAt: string;
}
```

### Engine (`src/state/allocationDraw/`, pure + Vitest)

1. Seeded RNG (mulberry32 from a string seed) and a Fisher–Yates `shuffle`.
   Reuse it to replace the biased `sort(() => Math.random() - 0.5)` in
   [useRunningOrder.ts](../../src/components/setup/post-setup/running-order/useRunningOrder.ts)
   and `EventStageVoters.tsx`.
2. Capacities: total = waiting + already-placed; target size per semi =
   balanced (±1, the extra seat drawn at random) or custom; remaining seats =
   target − pinned. Infeasible → typed error the UI can explain.
3. Pre-qualified voters: pins first, then the rest shuffled and dealt to the
   semi with the fewest voters (ties random).
4. Pots in order; inside a pot, countries in random order. Per-(pot, semi)
   quotas: split the pot evenly, extra seats to semis with the most remaining
   capacity; each country goes to a random semi with quota and seat left.
   Pots hold only waiting countries: pinned ones count toward semi sizes but
   not pot quotas (a small simplification — officially Israel still sat in a
   pot when pre-allocated).
5. Halves: per semi, first half = ⌊n/2⌋, second = ⌈n/2⌉ (counting pins, which
   take a random half); each drawn country gets a random half with room.
   `exact` mode: draw positions 1…n instead.
6. Output the ordered `steps` — the ceremony animates them, Apply consumes
   them, the snapshot stores them.

Tests: pot split, ±1 sizes, pins honoured, quotas with uneven pots (2025),
infeasible pins, determinism per seed, 3-semi contests.

### Pots "from voting history"

Balanced clustering on the symmetric affinity
`S[i][j] = (A[i][j] + A[j][i]) / 2` from `src/data/diasporaPresets.json`
(see [voting-simulation-engine-and-diaspora.md](../voting-simulation-engine-and-diaspora.md)):
`k = ceil(N / potSize)` pots with `potSize` = a multiple of the number of semis
(6 for two semis); greedy seeding by strongest pairs, then pairwise-swap local
search maximising within-pot affinity. Countries without data (custom entries)
fill remaining seats round-robin. Deterministic for a given input.

Official pots: add an optional `pot` to semi-finalists in
`public/data/countries/countries-YYYY.json`, curated for 2022–2026 first.
Years without it fall back to "from voting history".

### Downstream

- Pre-qualified voting: on Apply, append the drawn voters to each semi's
  configured voters (respect `voterChannels` defaults).
- Halves: store `firstHalfSize` per stage next to `runningOrder`; the Running
  Order tab renders the divider; shuffle keeps halves; manual drag across the
  divider is allowed and updates the split.
- Votes already predefined for a semi → confirm before Apply (they reset).

### Persistence

- Snapshot: optional `setup.allocationDraw = { config, result }` and
  `setup.stages[].firstHalfSize`. The backend stores the snapshot as an opaque
  blob and only reads `stages[].participants` / `qualifiesTo`, so no backend
  change. Countries still waiting are local-only (not a valid contest to save).
- Add the new fields to the fingerprint (`contestFingerprint.ts`) so "Unsaved
  changes" reacts to them.

---

## Phases

1. **Engine:** RNG + shuffle, draw engine, pots from history, tests.
2. **Lineup:** TO_BE_DRAWN group, draw-mode toggle, card, moves/DnD, pins,
   footer CTA, Start validation, persistence.
3. **Draw window:** ready / drawing / done, Customize panel, Apply.
4. **Downstream:** pre-qualified voters, halves in the Running Order tab,
   curated official pots, snapshot + fingerprint.
5. **Later:** final-half + host-slot draw at qualification time, replaying a
   saved draw, sharing a draw by code.

## Sources

- [Eurovision.com — Vienna 2026 semi-final line-ups drawn](https://www.eurovision.com/newsroom/vienna-2026-semi-final-lineups-drawn/)
- [Eurovision.com — The Semi-Final Draw for Vienna 2026](https://www.eurovision.com/stories/semi-final-draw-vienna-2026-how-to-watch/)
- [Eurovisionworld — 2025: Who's in which semi-final](https://eurovisionworld.com/esc/eurovision-2025-whos-in-which-semi-final)
- [Eurovisionworld — 2024: Who's in which semi-final](https://eurovisionworld.com/esc/eurovision-2024-whos-in-which-semi-final)
- [ESCXTRA — Analysing patterns in Eurovision pots](https://escxtra.com/2022/01/20/analysing-patterns-eurovision-pots/)
- [Eurovision.com — 2023 grand finalists draw their halves](https://www.eurovision.com/stories/eurovision-2023-the-grand-finalists-draw-their-halves-in-the-running-order/)
