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
| `src/components/simulation/Simulation.tsx` | Detection of the reveal condition, the 3.5 s trigger delay, mounting the panel, gating winner modal/confetti. |
| `src/components/board/BoardHeader.tsx` | Teaser text during reveal, winner text + "View Scoreboard" button after, hiding the "X points go to…" reveal label. |
| `src/state/scoreboard/types.ts` | `RevealData` type, `revealData` / `isRevealAnimationComplete` state + action signatures. |
| `src/state/scoreboard/state.ts` | Initial values (`revealData: null`, `isRevealAnimationComplete: false`). |
| `src/state/scoreboard/miscActions.ts` | `setRevealData`, `setIsRevealAnimationComplete`, `clearReveal`. |
| `src/state/scoreboard/eventActions.ts` | Resets reveal state on `startEvent`, `continueToNextPhase`, `leaveEvent`. |
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
  This lets the board settle before swapping. The condition is re-checked inside the timeout
  before committing, and the timer is cleared on cleanup if the condition changes.
- On commit, `setRevealData({ leaderCode, lastCode, pointsNeeded })` is called. `revealData`
  being non-null is what swaps `<Board />` for `<FinalTelevoteReveal />`.

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
  `revealData: null` and `isRevealAnimationComplete: false` in their `set(...)`.
- **Undo** — `SimulationHeader.tsx` calls `useScoreboardStore.getState().clearReveal()`
  immediately after `undo()`. (Undo is a `zundo` temporal action that restores past store
  snapshots; `clearReveal()` ensures the panel closes regardless of the snapshot contents.)
- `triggerRestartEvent` only bumps `restartCounter` (re-opens setup); the actual reset
  happens when the user re-starts via `startEvent`. (The inline reset there is intentionally
  left commented out.)

> ⚠️ If you add another way to mutate/restart the simulation, remember to reset these two
> flags (or call `clearReveal()`), or the stale reveal panel may linger.

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

### Phase 2a — the fill rises (the "count")

`triggerRevealAnimation` builds a GSAP timeline (with a **`fillDelay` of 1 s** so the layout
is stable before motion, and a 0.5 s settle before `onComplete`).

The fill animates over **`phaseADuration` (≈ 9 s, divided by the speed setting)** in **three
segments**. The fill bar height, the last badge `bottom`, the badge points count-up, and the
"Needs X pts" countdown all animate **in parallel using identical segment durations, waypoints
and easings** so they stay perfectly in sync.

- The badge **count-up** target is the leader's score if the last country wins (so it visually
  races toward the number to beat), otherwise the last country's final total.
- ~300 ms after phase 2a ends, the right-card label swaps from
  **"Needs X points to win"** → **"Received X points from the public"** (`receivedLabelPts`
  state).

### Phase 2b — the outcome

- **No win** (`receivedPoints < pointsNeeded`): the fill stops below the mark. After a 1 s
  beat, the **leader badge** gets the gold overlay flash + black text (the leader held on).
- **Win** (`receivedPoints >= pointsNeeded`): a `phase2aEnd` label is added, then the
  dramatic surge plays with no pause — the gradient bar lowers to the leader's *new* relative
  level, the leader badge + mark line drop with it, and the fill bar surges to 82% carrying
  the last badge up, while the count finishes to the final total. 1 s after `phase2aEnd`, the
  **last badge** gets the gold overlay flash + black text (the new winner).

`onComplete` calls `onRevealComplete()` → `setIsRevealAnimationComplete(true)`.

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
GSAP `onUpdate` (via refs) rather than React state — this avoids 60 fps re-renders. The one
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
| `finalRevealAnimationSpeed` | number (0.5–1.5, step 0.1) | `1.0` | Divides `phaseADuration`/`phaseBDuration`. 0.5 = slow (≈18 s fill), 1.5 = fast (≈6 s). Slider labels Slow ↔ Fast, default at the middle. |
| `finalRevealLinearAnimation` | boolean | `false` | When on, the fill uses **even thirds**, evenly spaced waypoints, and constant-velocity easing (`'none'`) instead of the randomized "fast → steady → building" rhythm. |

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

- **New trigger/reset path for the simulation** → reset `revealData` + `isRevealAnimationComplete`
  (or call `clearReveal()`).
- **Changing animation timing** → all phase-2a tweens (fill bar, badge `bottom`, count-up,
  needs-countdown) must share the same `segDur*` / `ease*` / `pct*Ratio` or they desync.
- **Adding theme color support** → bar backgrounds come from `barStyles` (built via
  `buildBackgroundColorLookup` + `extractSolidColorFromColorValue`); they already handle both
  solid and gradient theme colors.
- **Touching the bar/badge layout** → keep the bar section free of stacking-context triggers
  (z-index, backdrop-filter, transform, opacity < 1).
- **New locale** → add `simulation.finalReveal.*`, `simulation.winnerRevealTeaser`,
  `simulation.backToScoreboard`, and the `settings.ui.*` setting labels.
