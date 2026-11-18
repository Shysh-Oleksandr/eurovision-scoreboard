# Final Televote Reveal (reference)

This document describes the **Final Televote Reveal** feature — the dramatic head-to-head
panel shown during the Grand Final when only one country still has to receive its
televote points. It replaces the scoreboard with a leader-vs-last-country "will they
overtake?" animation, mirroring the tension of the real Eurovision broadcast.

---

## What it is

When the Grand Final televote reaches the point where **exactly one country has not yet
received its televote score**, the normal board is swapped out for a full-width reveal
panel:

```
┌─────────────────────┬─────┬─────────────────────┐
│   LEADER CARD       │ BAR │   LAST COUNTRY CARD  │
│   [big flag]        │  ▓  │   [big flag]         │
│   Country name      │  ▓  │   Country name       │
│   "Current Leader"  │ ░░  │   "Needs X pts..."   │
│        [343 🇮🇱]─────┤ ─── ├─────[🇧🇬 89]          │
└─────────────────────┴─────┴─────────────────────┘
```

- **Left card** = the current leader (highest total among everyone except the last country).
- **Right card** = the last country, which still needs its televote points.
- **Center bar** = a vertical gauge. A semi-transparent **gradient bar** marks the leader's
  level (the bar to beat); a solid **fill bar** rises as the last country's televote points
  are revealed. A white **mark line** sits at the leader's level (70% of the bar height).
- Two outcomes:
  - **No win** — the fill bar stops below the mark; the leader's badge gets a gold flash.
  - **Win** — the fill bar surges past the mark, the leader reference drops, and the last
    country's badge gets the gold flash.

After the animation, the panel **stays visible** until the user clicks **"View Scoreboard"**.
Winner modal / confetti are deferred until the reveal animation finishes.

---

## Files

| File | Responsibility |
|------|----------------|
| `src/components/simulation/FinalTelevoteReveal.tsx` | The entire reveal panel + all GSAP animations. |
| `src/components/simulation/finalTelevoteReveal/useRevealAnimation.ts` | Owns the refs + GSAP choreography; commits any buffered last-country award (`commitPendingFinalRevealTelevote`) once the panel is mounted. |
| `src/components/simulation/finalTelevoteReveal/revealPath.ts` | Pure planner for the fill's climb (`planRevealPath`, `REVEAL_PATH_TIMING`), drawn without the result so it can't spoil it. Tested in `revealPath.test.ts`. |
| `src/components/simulation/Simulation.tsx` | Detection of the reveal condition (via `getFinalRevealInfo`), the 3.5 s trigger delay, mounting the panel, gating winner modal/confetti. |
| `src/components/board/BoardHeader.tsx` | Teaser text during reveal, winner text + "View Scoreboard" button after, hiding the "X points go to…" reveal label. |
| `src/state/scoreboard/helpers.ts` | `getFinalRevealInfo` — shared reveal-eligibility source of truth for the trigger and the award guard. |
| `src/state/scoreboard/votingActions.ts` | `giveTelevotePoints` deferred-award guard + `commitPendingFinalRevealTelevote`. |
| `src/state/scoreboard/types.ts` | `RevealData` / `PendingFinalRevealTelevote` types, `revealData` / `isRevealAnimationComplete` / `pendingFinalRevealTelevote` state + action signatures. |
| `src/state/scoreboard/state.ts` | Initial values (`revealData: null`, `isRevealAnimationComplete: false`, `pendingFinalRevealTelevote: null`). |
| `src/state/scoreboard/miscActions.ts` | `setRevealData`, `setIsRevealAnimationComplete`, `clearReveal`. |
| `src/state/scoreboard/eventActions.ts` | Resets reveal state (incl. `pendingFinalRevealTelevote`) on `startEvent`, `continueToNextPhase`, `leaveEvent`. |
| `src/components/simulation/SimulationHeader.tsx` | Calls `clearReveal()` alongside `undo()`. |
| `src/components/settings/UIPreferencesSettings.tsx` | The three user settings. |
| `src/state/generalStore.ts` | Settings type + defaults. |
| `messages/*.json` | `simulation.finalReveal.*`, `simulation.winnerRevealTeaser`, `simulation.backToScoreboard`, and the `settings.ui.*` setting labels. |

---

## Detection & lifecycle (`Simulation.tsx`)

### Conditions to show the reveal

The reveal panel triggers only when **all** of these are true (see `lastPendingCountryCode`):

1. `settings.enableFinalReveal` is on (default `true`).
2. `currentStage.isLastStage` — Grand Final only.
3. Not jury voting, stage not over.
4. Stage voting mode is `TELEVOTE_ONLY` or `JURY_AND_TELEVOTE`.
5. Exactly **one** country has `!isVotingFinished`.
6. That last country is **not already winning** (`lastCountry.points < maxOtherPoints`) — if
   it has already clinched it, there is no tension to show, so the reveal is skipped.

### Computed values (at trigger time)

- `leaderCountry` = the highest-points country among everyone **except** the last country.
- `pointsNeeded = leaderCountry.points - lastCountry.points + 1` (what the last country needs
  to overtake).

### Timing

- When the condition becomes true, a **`REVEAL_TRIGGER_DELAY_MS` (3500 ms)** timer starts.
  This lets the board settle before swapping (and lets the user watch the **next-to-last**
  country's points reveal). The condition is re-checked inside the timeout before committing,
  and the timer is cleared on cleanup if the condition changes.
- On commit, `setRevealData({ leaderCode, lastCode, pointsNeeded })` is called. `revealData`
  being non-null is what swaps `<Board />` for `<FinalTelevoteReveal />`.

Eligibility (the six conditions above) is centralized in **`getFinalRevealInfo(stage,
enableFinalReveal)`** (`state/scoreboard/helpers.ts`), which returns
`{ leaderCode, lastCode, pointsNeeded } | null`. Both the trigger (`Simulation.tsx`) and the
award guard (below) call it, so they can never disagree about whether a reveal is due.

### The deferred-award guard (spam-proofing the last country)

The 3500 ms delay used to be a race: if the last country's televote was awarded **before** the
timer fired (fast clicks, or spamming the **"Random"** button), the panel never mounted and the
last country's points were flashed on the normal board — no reveal at all.

To make the reveal reliable, **`giveTelevotePoints`** now guards against this. When
`getFinalRevealInfo` is non-null and the award targets `lastCode`, the points are **not applied
to the board**; instead they are buffered in `pendingFinalRevealTelevote` and the action returns
early. Because the last country stays unfinished, the trigger timer still fires and mounts the
panel. Once mounted, `useRevealAnimation` calls **`commitPendingFinalRevealTelevote`**, which
re-invokes `giveTelevotePoints` with `{ fromFinalReveal: true }` to bypass the guard and apply
the award — now consumed by the animation instead of shown on the board. This works whether the
buffer was set **before** the panel mounted (spam during the delay) or **after** (awarding the
last country while the panel is already up).

- All individual-award paths funnel through `giveTelevotePoints`
  (`givePredefinedTelevotePoints` = "Random", `giveManualTelevotePointsInRevealMode` = clicking
  a country, and the manual `TelevoteInput` submit), so all of them are covered.
- **"Finish randomly"** (`finishTelevoteVotingRandomly`) intentionally does **not** route through
  `giveTelevotePoints` — it finishes every remaining country at once, so it is not intercepted
  and simply ends voting (no reveal), matching its "skip the drama" purpose.
- The buffer is idempotent: once set, repeat awards to the same country are no-ops, so spamming
  "Random" can neither double-apply nor lose the reveal.

### Two-flag state

The feature uses **two** store flags:

- `revealData: RevealData | null` — non-null while the reveal panel is mounted.
- `isRevealAnimationComplete: boolean` — set `true` when the reveal animation finishes
  (`onRevealComplete`). The panel stays up; this flag flips the header into "winner +
  View Scoreboard button" mode and **un-gates** the winner modal / confetti.

`handleBackToScoreboard` (the "View Scoreboard" button) clears both (`setRevealData(null)`,
`setIsRevealAnimationComplete(false)`), returning to the board.

### Winner modal / confetti gating

```tsx
{showWinnerModal && (isRevealAnimationComplete || !showRevealPanel) && <WinnerModal />}
{showWinnerConfetti && (isRevealAnimationComplete || !showRevealPanel) && <WinnerConfetti />}
```

They render once the reveal animation completes (over the still-visible panel) **or** when no
reveal panel is showing at all (normal flow / reveal disabled).

---

## Why the state lives in the store (not local state)

The reveal flags were intentionally moved from `Simulation.tsx` local `useState` into the
**scoreboard store** so they reset correctly with the rest of the simulation. If they were
local, restarting / starting a new simulation / clicking **undo** would change the underlying
data while the component kept showing the stale reveal panel.

Reset points:

- **`startEvent`**, **`continueToNextPhase`**, **`leaveEvent`** (`eventActions.ts`) set
  `revealData: null`, `isRevealAnimationComplete: false`, and `pendingFinalRevealTelevote: null`
  in their `set(...)`.
- **Undo** — `SimulationHeader.tsx` calls `useScoreboardStore.getState().clearReveal()`
  immediately after `undo()`. `clearReveal()` clears all three fields. (Undo is a `zundo`
  temporal action that restores past store snapshots; `clearReveal()` ensures the panel closes
  regardless of the snapshot contents.)
- `triggerRestartEvent` only bumps `restartCounter` (re-opens setup); the actual reset
  happens when the user re-starts via `startEvent`. (The inline reset there is intentionally
  left commented out.)

> ⚠️ If you add another way to mutate/restart the simulation, remember to reset these three
> fields (or call `clearReveal()`), or the stale reveal panel / a stranded buffered award may
> linger.

---

## The animation (`FinalTelevoteReveal.tsx`)

The component takes `leaderCountryCode`, `lastCountryCode`, `pointsNeeded`, and
`onRevealComplete`. It reads live country data from the store but **captures initial points
into refs** (`initialLeaderPointsRef`, `initialLastCountryPointsRef`) at mount so the
animation math is stable even as the store updates.

### Phase 1 — Entrance (runs once on mount via `useGSAP`)

All elements are `gsap.set` to hidden/offset, then a timeline brings them in:

1. Leader card slides in from the left, last card from the right (staggered).
2. Large card flags scale + fade in; card text fades up.
3. Leader **badge** appears at the bottom of the bar, then the **gradient bar** grows to 70%
   carrying the badge up with it.
4. Last-country **badge** appears at the bottom; the white **mark line** draws in at 70%.

When the entrance completes, `entranceDoneRef` is set. If televote points already arrived
during the entrance (`pendingRevealPointsRef`), the reveal animation fires immediately after.

### Trigger — last country receives points

A `useEffect` watches `lastCountryFinished` + `lastCountryTelevotePoints`. When the last
country's televote is awarded:

- If the entrance is done → call `triggerRevealAnimation(receivedPoints)` now.
- Otherwise → stash the points in `pendingRevealPointsRef` to fire after the entrance.

`revealDoneRef` guards against double-firing.

**Committing a buffered award.** A second `useEffect` watches `pendingFinalRevealTelevote`
(see the deferred-award guard above). Because this effect lives in the panel, it only runs while
the panel is mounted — so calling `commitPendingFinalRevealTelevote()` applies the last
country's points at exactly the right time. The commit re-renders the store, the watch effect
above picks up `lastCountryFinished`, and the reveal plays. Since the commit runs *after* mount,
`initialLastCountryPointsRef` has already captured the **pre-televote** total, so the animation
math stays correct.

### Phase 2a — the climb (the "count")

`triggerRevealAnimation` asks `planRevealPath` (`finalTelevoteReveal/revealPath.ts`, pure and
unit-tested) for the fill's path, then builds a GSAP timeline that starts after a
**`fillDelay` of 1 s**, so the layout is stable before anything moves. One cursor tween runs
along the path. Its `onUpdate` sets the fill height, the last badge's `bottom` (via
`gsap.quickSetter`), the badge's count and the "Needs X" countdown from the same value, so
they can't drift apart.

**The suspense rule: the climb is planned without the result.** The path is measured in mark
units: 0 is the last country's score before its televote, 1 is `pointsNeeded`, drawn at
`MARK_PCT` = 70%. `buildRevealClimb` draws it from random numbers only:

- 2–5 moves of varying size and pace up to a crawl start at 0.8–0.9 of the mark;
- at least one beat (a 0.3–0.75 s hold) between them;
- a slow 1.8–2.8 s crawl up to the mark, sometimes with one more beat in it.

Monotone cubic Hermite curves (PCHIP slopes) join the pieces, so the speed never jumps and
moves ease into and out of beats. A climb takes about 6.5–12 s at speed 1 (median ≈ 8.6 s).

The received points only decide where the climb stops:

- **Win** (`receivedPoints >= pointsNeeded`): the climb itself. It reaches the mark and
  crosses it at the crawl's pace.
- **No win**: `settleRevealClimb` follows the same climb until about 0.55–0.85 s before it
  would pass the country's total, then decelerates evenly and comes to rest there. When the
  total sits just past a beat, it eases out of rest instead, taking at most 1.6 s. Given the
  same random draws, a loss and a win are identical until those last moments, and the tests
  check this.

So the pace, the beats and the crawl say nothing about the outcome. The old plan stretched
every reveal over a fixed 9 s, with waypoints set as fractions of the *final* height. The
bar's speed in the first second gave the result away, and players learned to read it after a
few finals. Don't add anything that depends on the result before the stop: durations, eases,
haptics, sounds or re-renders.

- The count shows whole points only, `initial + floor(value × pointsNeeded)`. It passes the
  leader exactly as the fill reaches the mark, and a losing fill stops on its exact total.
- The badge starts `BADGE_REST_PCT` (3.5%) above the empty bar and joins the top of the fill
  over the first fifth of the climb.

### Phase 2b — the outcome

The `revealOutcome` label marks the moment the result is certain.

- **No win**: the fill rests at the country's total for `verdictHold` (0.95 s ÷ speed). That
  is longer than any beat, so until it ends the stop could still be a pause. At
  `revealOutcome`, the right card's label swaps from **"Needs X points to win"** to
  **"Received X points from the public"** (`receivedLabelPts` state) and `revealFall` plays.
  0.45 s later, the **leader badge** gets the gold overlay flash + black text (the leader held
  on), with `revealHold`.
- **Win**: `revealOutcome` is the crossing, and the surge plays at once. The gradient bar
  lowers to the leader's *new* relative level, the leader badge + mark line drop with it, and
  the fill bar surges to 82% carrying the last badge up while the count finishes at the final
  total. The label swaps 0.3 s after the crossing. 1 s after it, the **last badge** gets the
  gold overlay flash + black text (the new winner).

`onComplete` calls `onRevealComplete()` → `setIsRevealAnimationComplete(true)`. The panel
kills the reveal timeline on unmount, so after an undo mid-reveal a stale timeline can't
complete later. `fillBlendExclusion` (the fill's `mix-blend-exclusion` after a win) also
waits for `receivedLabelPts`. The store already holds the final totals during the climb, so
any re-render that reads them would show the result early.

### Important layout / stacking notes

- The center **bar section has no `z-index`, no `backdrop-filter`, no transform/opacity** — any
  of those would create a stacking context that traps the badges. Cards are `z-10`, badges are
  `z-20` in the **outer** context so badges float above the cards while the card shadows still
  sit above the bar.
- Card inner-bottom corners are squared (leader `22px 22px 0 22px`, last `22px 22px 22px 0`)
  so the rounded corners don't leave a visible gap against the bar.
- The mark line's initial `bottom: '70%'` is set in `gsap.set` (not just CSS) so GSAP animates
  it in `%` units consistently in phase 2b.

### Direct-DOM count updates

The badge points and the "Needs X" countdown are updated by writing `textContent` directly in
GSAP `onUpdate` (via refs) rather than React state, and only when the whole-point value
changes. This avoids 60 fps re-renders. The one
subtlety: when televote is awarded, the store update re-renders the badge with the *final*
total before the animation starts, so `triggerRevealAnimation` immediately overwrites
`lastBadgePointsRef.current.textContent` back to the pre-reveal value to prevent a backwards
jump during `fillDelay`.

---

## Header behavior (`BoardHeader.tsx`)

`BoardHeader` was extracted out of `Board` and is rendered by `Simulation.tsx` in the **left
column** (above the reveal panel / board), so it is never stacked above the right-hand
`ControlsPanel`. It receives `revealActive`, `revealAnimationComplete`, `onBackToScoreboard`.

- **During the reveal animation**: shows the teaser **"The winner of *Event Year* is…"**
  (`winnerRevealTeaser`); the Random button is hidden.
- **After the animation** (`revealAnimationComplete`): shows the normal winner text plus a
  **"View Scoreboard"** button (`backToScoreboard`) where Random used to be.

### Suppressing the "X points go to…" label

In `revealTelevoteLowestToHighest` mode the header normally shows "255 points go to…". This
would spoil the reveal, so `suppressRevealLabel` returns the label as `null` immediately
(computed inline, not in a delayed effect, so there's no flash) when: final reveal is enabled,
it's the last stage, exactly one country is unfinished, and that country isn't already winning
— i.e. the same situation that triggers the reveal panel.

---

## Settings (`UIPreferencesSettings.tsx` + `generalStore.ts`)

| Setting | Type | Default | Effect |
|---------|------|---------|--------|
| `enableFinalReveal` | boolean | `true` | Master toggle. When off, `lastPendingCountryCode` returns `null`, so the panel never triggers and voting proceeds on the normal board. |
| `finalRevealAnimationSpeed` | number (0.5–1.5, step 0.1) | `1.0` | Divides the reveal's durations: the climb, its beats, the settle, the verdict hold and phase 2b's bar drop. 0.5 = slow (median climb ≈ 17 s), 1.5 = fast (≈ 6 s). Slider labels Slow ↔ Fast, default at the middle. |
| `finalRevealLinearAnimation` | boolean | `false` | When on, the climb is one constant pace with no beats: it eases in over the first second and reaches the mark at 9 s ÷ speed. A losing fill keeps that same pace and then stops at its total (a 0.7 s settle, then a 1 s verdict hold), so in this mode the speed doesn't give the result away either. |

The two animation settings are read via refs (`finalRevealAnimationSpeedRef`,
`finalRevealLinearAnimationRef`) so `triggerRevealAnimation` picks up current values without
being recreated.

---

## Flags in the reveal

Both large card flags and the small badge flags use **`getHostingCountryLogo`** (the heart-icon
logo system), respecting `settings.shouldShowHeartFlagIcon`. When a country has a heart logo
(`isExisting === true`) the image is sized square; otherwise the normal rectangular flag sizing
is used. `handleFlagError` provides the standard flag fallback chain.

---

## Extending / changing the feature — checklist

- **New trigger/reset path for the simulation** → reset `revealData`,
  `isRevealAnimationComplete`, **and** `pendingFinalRevealTelevote` (or call `clearReveal()`).
- **New way to award televote to a single country** → if it must not spoil the last country,
  route it through `giveTelevotePoints` (the deferred-award guard covers it automatically). A
  path that finishes multiple countries at once (like `finishTelevoteVotingRandomly`) bypasses
  the guard by design.
- **Changing reveal eligibility** → edit `getFinalRevealInfo` only; the trigger and the guard
  both read it, so they stay in sync.
- **Changing animation timing** → edit the ranges in `REVEAL_PATH_TIMING` (`revealPath.ts`)
  and keep `revealPath.test.ts` passing. A loss must move exactly like a win until it
  settles, and `verdictHold` must stay longer than any beat. The fill, badge, count and
  countdown all read the one cursor, so they can't desync.
- **Adding theme color support** → bar backgrounds come from `barStyles` (built via
  `buildBackgroundColorLookup` + `extractSolidColorFromColorValue`); they already handle both
  solid and gradient theme colors.
- **Touching the bar/badge layout** → keep the bar section free of stacking-context triggers
  (z-index, backdrop-filter, transform, opacity < 1).
- **New locale** → add `simulation.finalReveal.*`, `simulation.winnerRevealTeaser`,
  `simulation.backToScoreboard`, and the `settings.ui.*` setting labels.

---

## Ladder style (the default since 2026-11-18)

The final reveal has two **reveal styles** (GLOSSARY: Reveal style), picked with the synced
setting `finalRevealStyle: 'ladder' | 'bar'` (default `'ladder'`, "Reveal style" under
"Enable final televote reveal" in Settings → Effects & motion: a segmented control,
"Ladder (ESCA 2026)" / "Bar (ESC 2026)", the settings model's `segmented` kind).
**Bar** is everything above.
**Ladder** recreates the ESC Asia 2026 broadcast graphic: a column of places in the middle,
the leader's pill docked at place 1 on the left, the last country's pill on the right. The
last country's pill climbs the places while its televote counts up, and takes place 1 if it
overtakes. The full measured spec is `docs/final-reveal-ladder-spec.md`; the reference
storyboards are `docs/intro.webp` and `docs/reveal.webp`.

Everything in the lifecycle above (trigger, deferred-award guard, store flags, header,
winner gating, resets) is shared. Only the panel differs.

### Files

| File | Responsibility |
|------|----------------|
| `src/components/simulation/FinalReveal.tsx` | Picks the style **once per reveal** (changing the setting mid-reveal doesn't restart it). Mounted by `BoardStage` (column layout, passes `fit`) and `Simulation.tsx` (classic layout). |
| `src/components/simulation/FinalTelevoteRevealLadder.tsx` | Takes the standings snapshot at mount and renders the panel. |
| `finalTelevoteReveal/ladder/LadderParts.tsx` | Markup: pill, ring, places, side flags, the off-screen measurer. |
| `finalTelevoteReveal/ladder/useLadderLayout.ts` | Fit by measuring: panel height, `u`, place pitch, names vs codes, side flags. |
| `finalTelevoteReveal/ladder/useLadderRevealAnimation.ts` | All GSAP: intro, count, place moves, heartbeat, swap, no-win; the store wiring (commit buffered award, watch the last country). |
| `finalTelevoteReveal/ladder/ladderPacing.ts` (+ test) | Count timing: the Bar's result-blind climb (`planRevealPath` in `revealPath.ts`) in points, plus the win's burst and swap time. |
| `finalTelevoteReveal/ladder/ladderConstants.ts` | Every number of the spec (sizes in `u`, intro times, pacing, micro durations). |
| `finalTelevoteReveal/ladder/useLadderStyles.ts` | Theme colours for the track and the gradient-capable tokens. |
| `src/state/scoreboard/finalRevealPlaces.ts` (+ test) | `getFinalRevealPlaces`: places, passes and `winAt` with the board's tiebreak. Also used by `getFinalRevealInfo`. |

### Places and ties (`finalRevealPlaces.ts`)

At mount the panel snapshots the stage (everyone but the last country is final). While the
count runs, a running total `n` stands for "`n − startPoints` televote points so far", and
every comparison uses `createCountriesComparator(stage.runningOrder)` — points, then
televote, then running order. So:

- `passes`: the totals at which the last country passes someone, with the place it lands
  on. Several countries passed on the same total collapse into one move.
- `winAt`: the smallest total that puts it first. **A tie on points can win** (when its
  running televote beats the leader's). `getFinalRevealInfo` uses the same function, so
  `pointsNeeded = winAt − lastPoints` for both styles, and the leader is the comparator's
  first, not just the most points.

If the panel mounts after the last country's televote already landed (a remount), the
snapshot counts from before it (`points − televotePoints`).

### Layout (`useLadderLayout.ts`)

Sizes are reference units `u` (1 u = 1 px of the 1198 × 1292 reference frame), applied as
CSS variables on the panel root: `--u`, `--pitch`, `--k` (pitch ÷ reference pitch, scales
chips and numerals), `--row1` (centre of place 1), `--round` (1 on
`roundedCountryContainer` themes, `ROUND_SQUARE_THEMES` = 0.35 on square ones: softly
rounded rather than sharp).

- **Height:** desktop column layout 600 own px (the board's zoom scales it up to the
  screen; it only shrinks when even the unzoomed panel wouldn't fit). Phones: the screen
  above the sheet. Classic layout: 400–640 px.
- **`u`:** fills the height with the full reference pitch when there are few places, kept
  between 1/1150 and 1/1000 of the height, then capped by the width the widest side needs
  (pill or tag, measured at 100 px in `LadderMeasurer`).
- **Names:** full names when a pill is at least 36 screen px tall; otherwise the board's
  3-letter codes (`getShortCodes`). With "Always show full country names" the names stay
  and end in "…". Names render letter by letter (inline blocks), which runs ~4 % wider than
  the measured text, so the fit adds that slack.
- **Places:** 1 down to two below the last country's starting place
  (`PLACES_BELOW_LAST`). It only climbs, so the places further down never matter, and a
  big final (or a 78-entry custom contest) doesn't turn the numerals into dust. The pitch
  squeezes to fit; the pills keep their size.
- **Side flags** only when the panel is at least 640 px wide and not on a phone: the big
  flag fades into the page through a radial mask; a heart logo is shown solid, unmasked.
  They never swap.
- **Height (desktop) depends on the window only**, measured from the board's host, which
  the zoom doesn't move. The board's zoom follows the panel's height; a height that
  followed the zoom made the two chase each other and the panel jumped between two sizes
  during the intro.
- The intro waits 5 frames after the first measure, because the desktop board re-zooms
  right after the panel mounts and the hidden offsets are in px. The panel stays
  `visibility: hidden` until then.

### Colours (`useLadderStyles.ts`, `LadderParts.tsx`)

All from the theme's board colours (DESIGN.md, Board Colour Rule). On `ASIA-2026` they
reproduce the broadcast.

| Part | Token |
|---|---|
| Track | `televoteActivePlaceContainerBg` (top) → `televoteFinishedPlaceContainerBg`. When the active colour is too light for the numerals (contrast < 2, e.g. the 2026 theme's white badge), the top is the finished colour mixed 30 % towards the numeral colour. |
| Numerals, ring, connector, heartbeat flash and glow | `televoteFinishedPlaceText` |
| Leader pill | name `televoteFinishedBg`/`Text` (gradients allowed), cap `televoteFinishedPointsBg`/`Text` |
| Last country's pill | name `televoteUnfinishedBg`/`Text`, cap `televoteUnfinishedPointsBg`/`Text` |
| CURRENT LEADER, WINNER | `douzePointsBg`/`Text` |
| + X P TO WIN | `televoteUnfinishedPointsBg`/`Text` |

Each pill keeps its colours after a swap (as in the broadcast). Text uses the scoreboard
font (`dp-scoreboard-font`); names follow `uppercaseEntryName`; tags are always uppercase
(stage graphics, not interface chrome).

### Timeline

**Intro** (`INTRO` in `ladderConstants.ts`, ≈ 2.9 s): track fades in, numerals sharpen
bottom to top (stagger squeezed for long ladders), then per side the ring pops around the
place, a dot (the cap at 84 u, a circle) pops beside it, and the dot unfurls into the pill:
name section and flag slide out from behind it (horizontal motion blur on desktop) while
the letters resolve from the cap colour through an orange-ish mix to the name colour.
Points fade in from blur, then the tags rise out of the pill's top edge. The last country
follows the leader by ~0.3 s. The pill body stays hidden until its dot is full size, so
no sliver shows beside the ladder.

**Count** (`planLadderCount`, starts `SETTLE_S` = 0.9 s after the points land, so the
column can fold away or the sheet leave first). It uses the **Bar style's climb**
(`planRevealPath`, see "Phase 2a" above): planned before the result is known, in mark
units where 1 is `winAt`. Moves of varying pace, a beat or two, then a slow crawl up to
the mark. A winner follows it to the mark; a country that falls short follows the same
climb and only settles at its total in the last moment, then holds longer than any beat
(`verdictHold`) before the verdict. So nothing in the pace says who wins.

- Each tick writes the digits and the TO WIN number straight into the DOM (`setText`
  writes the existing text node, so React never finds its node gone). Passing someone
  moves the pill group (`--place`, 240 ms `power2.inOut`, `overwrite: 'auto'`) and hops
  the ring. Place 1 is only reached through the swap.
- **Heartbeat** on the last country's chip once the climb is 75 % of the way to the mark
  (`HEARTBEAT_FROM`): a self-rescheduling `delayedCall` whose period (0.53 → 0.29 s) and
  strength follow how close the climb is to the mark, never the result. Flash + glow +
  ring swell live inside the ring element.
- **Win:** at the mark the TO WIN tag sinks into the pill and the count bursts on to the
  total (0.8–2.4 s, `power2.out`); ~0.7 s into the burst the pills swap places (490 ms
  `back.out(1.4)`), CURRENT LEADER fades, rings hop, WINNER rises out of the winner's
  pill. `onRevealComplete` after the count and the swap have both landed.
- **No win** (incl. a tie that loses): after the verdict hold the heartbeat stops, TO WIN
  sinks, CURRENT LEADER fades, WINNER rises on the leader, its ring pops; complete 0.8 s
  later.
- The final place is reconciled with the committed standings, so the ladder never ends
  on a wrong place.

**Settings:** `finalRevealAnimationSpeed` divides only the count (the climb, the verdict
hold, the burst); moves, pops, tags and the swap keep their durations.
`finalRevealLinearAnimation` uses the climb's linear mode (one constant pace, no beats). Reduced motion: no blur, intro and
micro-animations twice as fast. Motion blur and soft-focus effects run on the desktop
website only (never in the native apps).

### Gotchas

- GSAP owns `--place` on the pill groups and ring wrappers. React sets it once at mount
  and never changes it, so re-renders don't reset it. Keep it that way: don't put
  animated values in React styles.
- The cap's width and flag-side rounding animate through `--cap-w` / `--cap-flat`, not
  `width`, so a resize after the intro still scales it.
- The pill body (name + flag) runs on under the cap so nothing gaps during the unfurl.
  Its clip is rounded on the ladder side like the cap, or its square corners show
  around the cap's round end; the hidden part ("filler") keeps the name's inner-end
  colour and sits a pixel inside the pill's top and bottom, or it shows as a hairline
  along the cap's and the flag's edges. The name colour itself is on the visible name
  section only, so a gradient runs across exactly what you see.
- Everything is created in the `useGSAP` context or through `contextSafe` (including the
  heartbeat's `delayedCall`s), so undo, View scoreboard or a new stage kill it all.
- The tags sit in an `overflow: hidden` mask whose bottom is the pill's top edge; hidden
  means pushed a little further than the mask so no hairline shows.
- **No teaser.** `revealData.style` is fixed when the reveal starts (`Simulation.tsx`), so
  the panel (`FinalReveal`) and the header always agree. For the ladder, `BoardStage`
  doesn't render the `BoardHeader revealOnly` teaser, and `BoardHeader` (classic layout)
  shows nothing while the reveal runs instead of "The winner of … is…": the ladder's own
  CURRENT LEADER / WINNER tags say it. The winner modal gating and the controls' folding
  are shared with the Bar style.
- The ladder imports `planRevealPath` / `evaluateRevealPath` / `revealPathDuration` from
  the Bar's `revealPath.ts`. Changing that API, or the meaning of mark units, changes the
  ladder too (`ladderPacing.test.ts` covers the contract).
