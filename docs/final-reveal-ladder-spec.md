# Task: build the "Ladder" Final Televote Reveal (ESC Asia 2026 style) as a second reveal variant

You are working in the DouzePoints codebase (Next.js 16 + TypeScript, Tailwind, Zustand, GSAP via `@gsap/react`).
The app already has a **Final Televote Reveal** (leader card vs. last-country card with a vertical gauge bar, ESC 2026 style).
Build a **second, selectable variant** that recreates the ESC Asia 2026 broadcast graphic: a vertical **rank ladder**
in the middle, with the leader's pill docked at rank 01 on the left and the last country's pill on the right. The last
country's pill **climbs the ladder** while its televote count runs, and takes rank 01 if it overtakes the leader.

Every timing, size, colour and easing below was measured frame by frame from two 60 fps reference videos, so treat the
numbers as the target. Anything marked **(extrapolated)** is not in the reference and is a design proposal. You can
adjust those parts.

---

## 0. Before writing any code

1. Read the existing feature doc **`final-televote-reveal.md`** (search the repo for it). It covers the store flags,
   the deferred-award guard, `getFinalRevealInfo`, `commitPendingFinalRevealTelevote`, the header behaviour and the
   settings. **All of that stays as it is.** Only the panel that `Simulation.tsx` mounts changes.
2. Read these files fully before you design anything:
   - `src/components/simulation/FinalTelevoteReveal.tsx`
   - `src/components/simulation/finalTelevoteReveal/useRevealAnimation.ts`
   - `src/components/simulation/Simulation.tsx` (mounting, `revealData`, `onRevealComplete`, gating)
   - `src/state/scoreboard/helpers.ts` (`getFinalRevealInfo`) and the scoreboard **sorting / tie-break** logic, wherever
     the board computes positions. You need the same comparator to work out ladder ranks.
   - `src/state/generalStore.ts` and `src/components/settings/UIPreferencesSettings.tsx` (settings pattern)
   - The flag helpers (`getHostingCountryLogo`, `handleFlagError`) and how themes expose colours and fonts
     (`buildBackgroundColorLookup`, `extractSolidColorFromColorValue`, the theme font settings).
   - `messages/en.json` (look at `simulation.finalReveal.*`) and the 7 other locale files.
3. If they exist, open the reference stills **`docs/final-reveal-ladder/intro_keyframes.jpg`** and
   **`docs/final-reveal-ladder/reveal_keyframes.jpg`** with your image viewer. Each one is a labelled 8-frame storyboard of
   the reference. (The broadcast's people and camera feeds are irrelevant. Only the graphics in the middle matter.)
4. Check the installed `gsap` version. Everything below uses core GSAP only: `keyframes` arrays, function eases, the
   `attr` plugin (built in) and `delayedCall`. You don't need SplitText or CustomEase.

---

## 1. Integration plan

- **New setting:** `finalRevealStyle: 'gauge' | 'ladder'` in `generalStore.ts`. The default is `'gauge'`, so existing
  users see no change. Add a select or segmented control in `UIPreferencesSettings.tsx` next to the other three reveal
  settings, and grey it out when `enableFinalReveal` is off, as they do.
- **New files** (mirror the existing structure):
  - `src/components/simulation/FinalTelevoteRevealLadder.tsx`: markup only.
  - `src/components/simulation/finalTelevoteReveal/useLadderRevealAnimation.ts`: refs and all GSAP choreography.
  - `src/components/simulation/finalTelevoteReveal/ladderConstants.ts`: every number in this doc, in one place.
  - (optional) `ladderSnapshot.ts`: a pure function that builds the rank snapshot (§6.1). Unit-test it.
- **Same props contract** as `FinalTelevoteReveal`: `leaderCountryCode`, `lastCountryCode`, `pointsNeeded` and
  `onRevealComplete`. `Simulation.tsx` picks the component based on `finalRevealStyle`. Nothing else in the lifecycle changes.
- **Reuse the existing mechanics from `useRevealAnimation`** (copy the pattern or factor it into a shared hook):
  - Capture the **initial** leader and last-country points in refs at mount, plus the full standings snapshot (§6.1).
  - Run the `pendingFinalRevealTelevote` → `commitPendingFinalRevealTelevote()` effect while mounted.
  - Watch `lastCountryFinished` and the last country's televote points. When they arrive during the entrance, stash them
    in `pendingRevealPointsRef`; when the entrance ends, call `triggerRevealAnimation(receivedPoints)`. Guard it with
    `revealDoneRef`.
  - The store re-renders the last country with its **final** total before the count starts. Write the **pre-reveal**
    value straight back into the points node's `textContent` the moment the reveal triggers, so the number never jumps.
  - Read `finalRevealAnimationSpeedRef` and `finalRevealLinearAnimationRef` via refs (§6.9).
  - Do all counter updates by writing `textContent` directly from GSAP `onUpdate`, never through React state.
  - Create every tween and `delayedCall` inside the `useGSAP` scope or through `contextSafe` so that unmounting
    (undo, `clearReveal`, View Scoreboard) kills everything.
- `BoardHeader` (teaser text, View Scoreboard button), winner modal / confetti gating, the store reset paths and the guard
  all stay **untouched**.
- When you finish, add a "Ladder variant" section to `final-televote-reveal.md` covering files, timeline, settings and
  gotchas.

---

## 2. Coordinate system and responsive scaling

The reference frame is **1198 × 1292 px** (portrait). All sizes below are in **reference units `u`**, where 1 u = 1 px
of that frame. Implement this with a CSS variable, for example `--u: <number>px`, set on the panel root, and write every
size as `calc(var(--u) * 84)` and so on. Set `u` from the panel's measured size (ResizeObserver):

```
u = min(panelWidth / 1198, panelHeight / 1292)   // then clamp to a sensible range
```

**Ladder length.** The reference shows 11 ranks (01–11) at a pitch of **67.3 u**. Our Grand Finals can have about 26
countries. Show **one row per country in the stage** (N rows) and compute the pitch as
`pitch = min(67.3u, (ladderAvailableHeight - 138u) / (N - 1))`. Scale the rank chip and its numeral with the pitch
(chip height ≈ 0.74 × pitch, numeral ≈ 0.5 × pitch). The **pills and tags keep their full size** even when the pitch is
small. Only two pills exist and they sit on opposite sides, so they can't collide.
(extrapolated: the reference only shows N = 11.)

**Narrow screens.** The layout needs about 1100 u of width. When `u` drops below what keeps the text legible (a pill
height under about 40 px), truncate long names with an ellipsis, or use the short name or ISO code if the app has one.
(extrapolated)

---

## 3. Visual anatomy (static end state of the intro)

```
               [ CURRENT LEADER ]   ┌──┐
 ( Thailand ░░░▓[ flag ][ 170 ) ─── │01│ ←ring        (left = leader, docked at rank 1)
                                    │02│
                                    │..│        [ + 78 P TO WIN ]
                                    │08│ ─── ( 93 ][ flag ][ Philippines )   (right = last country, at its rank)
                                    │..│
                                    └──┘
```

### 3.1 Ladder (centre column)
| Part | Spec |
|---|---|
| Track | 100 u wide, fully rounded (radius 50 u). Height = 73 u (top pad to row-1 centre) + (N−1)·pitch + 65 u (bottom pad). In the reference it is centred horizontally on the frame (it actually sits at x=530–629, slightly left of centre; ignore that and centre it). |
| Track fill | Vertical gradient: `linear-gradient(180deg, #F352EA 0%, #DC43DA 24%, #A835BF 44%, #7727A9 63%, #4A188B 83%, #48198B 100%)` |
| Rank chip | Behind every numeral: a stadium (pill) about 76 × 44 u, fill `rgba(40, 0, 90, 0.25)` (a slightly darker patch of the track). |
| Rank numeral | Zero-padded `01`, `02`, … in white `#FFF7FF`, about 34 u, weight 800, tabular figures, centred in the chip. |
| Rank ring | **Only on rows occupied by a pill.** A white stadium outline around the chip: outer about 84 × 52 u, stroke about 4 u, colour `#FFFFFF`. A ring is a separate element per pill (leader ring, last ring) that moves between rows. |
| Pulse layer | Per ring: a white overlay inside the chip (`opacity: 0` at rest) plus a soft outer glow (`box-shadow: 0 0 calc(var(--u)*18) rgba(255,255,255,.65)`, `opacity: 0` at rest). Used by the heartbeat (§6.5). |
| Centre panel | (optional) The broadcast puts the ladder on a deep-blue vertical panel about 283 u wide (`#050C85` → `#01046A`) with its show logo at the top. Do **not** copy the Eurovision logo. Use the app's own event name or logo if one exists, or leave the panel out. |

### 3.2 Country pill (one per side, mirrored)
Order from the ladder outwards: **cap → flag → name**. The leader's pill grows **leftwards** from the ladder and the last
country's pill grows **rightwards**.

| Part | Spec |
|---|---|
| Pill height | 84 u. Vertically centred on its rank row. |
| Cap (points) | 120 × 84 u, yellow `#F7F324`, rounded **only on the ladder side** (radius 42 u). The side touching the flag is square. Points text is centred: about 48 u, weight 800, near-black navy `#120C33`, `font-variant-numeric: tabular-nums`. The **cap width is fixed**, so it never resizes when the count gains a digit. |
| Flag | 127 × 84 u (3:2, full pill height), `object-fit: cover`, no rounding, butted against the cap. Use the normal rectangular flag here. See §8 for heart-logo handling. |
| Name section | Auto width: text + about 34 u padding on each side. Rounded on the **outer** end (radius 42 u). Text is about 32 u, weight 800, `#120C33`. |
| Name background | **Leader (left) pill:** a horizontal gradient from white at the outer end to yellow at the flag: `linear-gradient(to right, #FFFDF8 0%, #FAF8C2 28%, #F7F772 62%, #F8F533 100%)`. **Last-country (right) pill:** solid `#FDFBFE`. In the reference this is fixed per side: after the swap, Thailand keeps the gradient and the Philippines stays white. |
| Gap to ladder | The cap's inner end sits 15 u from the track edge. |
| Connector | A white bar (`#F3F8FF`), 5 u thick and vertically centred, joining the cap's inner end to the ring (about 23 u long). It sits **behind** the cap. |
| Reference sizes | "Thailand" pill: 483 u in total (name 235 + flag 127 + cap 120). "Philippines": about 525 u. |

### 3.3 Tags (above a pill)
| Tag | Spec |
|---|---|
| Geometry | 53 u tall, fully rounded, sits **10 u above** its pill. Text about 24 u, weight 800, uppercase, letter-spacing about 0.04em, horizontal padding about 30 u. Width hugs the text. |
| Alignment | Aligned to the pill's **ladder-side end**. CURRENT LEADER: right edge = leader pill's inner end − 3 u. TO WIN and WINNER on the right: left edge = last pill's inner end + 3 u. |
| `CURRENT LEADER` | Magenta `#FA4CE6`, text deep indigo `#1E0A63`. |
| `+ 78 P TO WIN` | Yellow `#F7F424`, text `#120C33`. Value = `leaderPoints − current + 1`. Render the number in a fixed 2–3 character tabular slot (the reference shows `+  9 P TO WIN` with a padded single digit) so the tag doesn't jitter in width. |
| `WINNER` | Magenta `#FA4CE6`, text `#1E0A63`. Every pill has a hidden WINNER tag ready, because either side can win. |
| Masking | Each tag lives in a mask wrapper (`overflow: hidden`) whose bottom edge is the pill's top edge and whose height is tag height + gap (63 u). "Hidden" means `y: 63u` (pushed down under the pill), so the tag appears to **rise out of the pill** and to **sink back into it**. The pill is also above the tag in z-order. |

### 3.4 Typography and palette
- Font: the broadcast uses a rounded, heavy geometric display face (note the looped "ℓ"). Use the app's active
  theme font if one is set, otherwise a heavy geometric sans already in the project. Don't add a new web font without asking.
- Palette constants (put them in `ladderConstants.ts`): `YELLOW #F7F324`, `MAGENTA #FA4CE6`,
  `NAVY_TEXT #120C33`, `TAG_TEXT_ON_MAGENTA #1E0A63`, `WHITE #FDFBFE`, the track gradient above, and the chip fill.
- Theme support: if the active theme defines accent colours, you **may** map them (track gradient ← theme primary,
  cap/tag yellow ← theme highlight) through the existing colour helpers. Keep the reference palette as the default.
  Don't block on this.

### 3.5 Side areas
In the broadcast the left and right thirds are live camera shots of the two delegations. Replace them with a large
**leader flag on the left** and **last-country flag on the right** (full-height `object-fit: cover`, heart logo when
`shouldShowHeartFlagIcon` is on, existing `handleFlagError` fallback), with a dark gradient towards the centre so the
pills stay readable. **The sides never swap**, even after an overtake. That matches the reference.

---

## 4. INTRO animation (panel entrance)

### 4.1 Overview
The ladder fades up and its numerals sharpen from the bottom to the top. Then each country "lands" in two beats: a
**white ring pops around its rank number** and, almost at the same moment, a **yellow dot pops** beside the ladder with
a small elastic overshoot. A moment later the dot **unfurls into the full pill**. The name section and the flag slide
outward from behind the yellow dot as if pulled out of it, with heavy horizontal motion blur, while the name's letters
resolve from yellow through orange to navy. After that the points **fade in from blur** inside the cap, and finally the
tags **rise out of the top of each pill**. The leader always acts first and the last country follows about 300 ms
behind.

### 4.2 Master timeline (t in ms from intro start; "video" = time in the reference clip)
| t (ms) | video | Element | Animation |
|---|---|---|---|
| 0 | (~0.12 s)\* | Ladder track | `opacity 0→1`, 300 ms, `power1.out` |
| 120 | (~0.25 s)\* | Rank numerals + chips | Each: `opacity 0→1`, `filter blur(10u)→blur(0)`, 220 ms, `power2.out`; **stagger 45 ms from the bottom row to the top row** (`stagger: { each: 0.045, from: 'end' }`) |
| **850** | 0.967 s | Leader ring (row 1) | `scale 0.6→1`, `opacity 0→1` (first 60 ms), 300 ms, `back.out(1.7)` (peaks at about 1.06 around +150 ms) |
| 883 | 1.000 s | Leader dot (cap) | `scale 0.12→1`, `opacity 0.4→1` (first 80 ms), **330 ms, `back.out(1.4)`**. Measured diameter: 10 → 38 → 64 → 82 → **88 (peak, +7 %) at +200 ms** → settles at 84 by +330 ms |
| 1166 | 1.283 s | Last ring (row r₀) | Same as the leader ring |
| 1200 | 1.317 s | Last dot | Same as the leader dot |
| **1316** | 1.433 s | Leader pill expand | §4.3, direction = left |
| **1600** | 1.717 s | Last pill expand | §4.3, direction = right |
| 1750 | 1.867 s | Leader points text | `opacity 0→1`, `blur(4u)→0`, **130 ms**, `power1.out`. No scale or position change. The cap is empty until now. |
| 2050 | 2.167 s | Last points text | Same, 150 ms |
| **2433** | 2.550 s | `CURRENT LEADER` tag | §4.4 |
| 2566 | 2.683 s | `+X P TO WIN` tag | §4.4 |
| **≈2900** | 3.00 s | Intro complete | Set `entranceDoneRef`, then fire any pending reveal |

\* In the reference, the ladder entrance is partly hidden under a broadcast transition, so treat those two rows as
approximate. The dot appears **33 ms after its ring**. The leader-to-last offsets are: ring 316 ms, dot 317 ms,
expand 284 ms, points 300 ms, tag 133 ms.

### 4.3 Pill expansion ("unfurl from the dot"). Per side, times relative to expansion start E.
Use `s = +1` for the leader (its body is hidden by shifting it **towards the ladder**, i.e. +x) and `s = −1` for the
last country.

DOM structure for one pill (leader shown; mirror it for the last):
```
<div pillGroup>                       // translated vertically for rank moves
  <div tagMask><div tag/></div>       // §3.3
  <div pill style="position:relative; height:84u">
    <div connector/>                  // behind the cap, static
    <div bodyClip style="overflow:hidden">   // inner edge = the DOT'S CENTRE (30u outward from the cap's final inner end), so nothing leaks towards the ladder
      <div nameSeg>                   // full body width: its background ALSO runs underneath the flag up to the cap, so no gap ever opens
        <span char/>… (one span per grapheme)
      </div>
      <div flag/>                     // absolutely positioned on top of nameSeg, butted to the cap
    </div>
    <div cap><span points/></div>     // above body (z-index)
  </div>
</div>
```

| Δt from E | Target | From → To | Duration / ease | Notes |
|---|---|---|---|---|
| 0 | `nameSeg` | `x: s·(bodyWidth + 48u) → 0` | **420 ms, `power2.out`** | The outer edge's measured progress: 6 % at 17 ms, 17 % at 50 ms, 51 % at 133 ms, 69 % at 167 ms, 89 % at 250 ms, 98 % at 333 ms, 100 % by about 420 ms. |
| 0 | `cap` | `width: 84u → 120u`, `x: s·12u → 0` | 330 ms, `power2.out` | The dot's ladder-side edge starts 12 u closer to the ladder. When it slides back, it **uncovers the connector bar**. The cap is a perfect 84 u circle until now (`border-radius: 42u`); as it widens, its flag-side corners become square. Hiding them under the flag is enough. |
| +110 | `flag` | `x: s·(flagWidth + 48u) → 0` | **300 ms, `power2.out`** | Starts after the name section is already moving. It's a **slide, not a scale**: in the reference the Philippines' white triangle (nearest the cap) emerges **last**. |
| +90 | name `chars` | per char: `opacity 0→1`, `x: s·10u → 0`, `blur(3u)→0`, colour keyframes `#F7F324 → #E0662E → #120C33` | each 140 ms, **stagger 22 ms in reading order (left→right on both sides)** | In the reference the leftmost letters resolve first on **both** pills, and the trailing letters glow orange-red (`#D86E38` measured) mid-reveal. Use `keyframes: { color: [...], easeEach: 'none' }` with opacity done in the first 40 %. |
| 0 → +380 | whole `bodyClip` | horizontal motion blur, `stdDeviation 0 → 6u → 0` | peak around +60…180 ms | **Optional**, see §7.1. The reference shows strong horizontal smear and double images on the sliding body and text. |

**Why `+48u` in the hidden offsets:** the dot is narrower than the final cap (84 vs 120 u) and sits 12 u closer to the
ladder. So the dot's **outer** edge is 48 u nearer the ladder than the final cap's outer edge (where the flag ends). Each
element has to start fully tucked behind the **dot**, not behind the final cap, or a sliver shows beside the dot before
the slide begins. Measured check: the leader's outer edge travels 409 u, and bodyWidth + 48 = 362 + 48 = 410 u.

### 4.4 Tag rise (used for CURRENT LEADER, TO WIN and later WINNER)
- `y: 63u → 0` inside the tag mask, **330 ms, `power3.out`** (measured: 46 % at 50 ms, 67 % at 100 ms, 81 % at 150 ms,
  90 % at 183 ms, 98 % at 250 ms).
- Optional vertical motion blur peaking at about 3 u during the first 120 ms.
- Leader tag first, then the last-country tag **133 ms later**.

---

## 5. REVEAL animation: what the reference shows (win case)

### 5.1 Overview
The last country's points **tick up one integer at a time** (instant digit swaps with no rolling and no pulse) at a
steady pace, while `+X P TO WIN` counts down in sync. Each time the running total passes the country directly above, the
**whole last-country group (tag + pill + connector) glides up one rank** with a quick ease-in-out, and its **ring hops**:
it vanishes from the old row and pops onto the new one. Once the climb is close to the leader, the last country's
**rank chip starts a heartbeat** (white flash, glow, slight ring swell) that **speeds up** as the count approaches the
leader. The count slows into a **tie with the leader and holds** for about 1.1 s at `+1 P TO WIN`. Then it **bursts**
past: the TO WIN tag **sinks back into the pill**, and about 0.7 s later the two pills **swap rows** with an overshoot
(winner up to 01, old leader down to 02). CURRENT LEADER fades away, and a **WINNER tag rises out of the winner's
pill**. The count keeps decelerating to its final total.

### 5.2 Reference data (video seconds → displayed points), leader = 170, final = 211
| video s | pts | event |
|---|---|---|
| 0.00 | 93 | (count already running; about 170 ms per point ≈ 5.9 pts/s) |
| 1.69 | 102→103 | rank move 08→07 starts |
| 3.38 | 112→113 | move 07→06 |
| 5.07 | 122→123 | move 06→05 |
| 6.72 | 132→133 | move 05→04 |
| 8.40 | 142→143 | move 04→03 |
| 10.07 | 152→153 | move 03→02 |
| ~11.0 | 158 | **heartbeat starts** (≈2.7 s before the tie) |
| 11.93 / 12.82 / 13.12 | 163 / 167 / 168 | slowing: about 200 ms/pt, then about 270 ms/pt over the last 5 points |
| **13.67** | **170** | **tie, hold** (`+1 P TO WIN`) |
| 14.80 | 171+ | **burst starts** (hold lasted 1.13 s) |
| 14.88 → 15.05 | 175–180 | TO WIN tag sinks into the pill |
| 15.12 / 15.32 / 15.53 | 185 / 192 / 197 | |
| **15.52** | ≈196 | **swap starts** (0.72 s into the burst) |
| 15.60 → 15.87 | 198–204 | WINNER tag rises |
| 15.98 / 16.27 / 16.47 / **16.70** | 206 / 209 / 210 / **211** | burst ends (≈1.9 s for 41 pts, `power2.out` shape) |

---

## 6. REVEAL animation: generalized choreography to implement

`L` = leader points (constant), `S₀` = last country's pre-reveal points, `F` = `S₀ + received`, `win = F > L`
(equivalently `received ≥ pointsNeeded`). The **suspense point** is `P = win ? L : F`.

### 6.1 Snapshot at mount
Build this once, from the store **as it is at mount** (everyone except the last country is finished, so their totals are final):
```ts
type LadderSnapshot = {
  totalRanks: number;                         // N = countries in the stage
  leader: { code: string; points: number };   // rank 1
  last:   { code: string; startPoints: number; startRank: number };
  // countries ranked between the leader and the last country, ascending by points.
  // Passing one of them puts the last country on `rank`.
  passes: { points: number; rank: number }[];
};
```
- Rank with the **same comparator / tie-break the scoreboard uses**. If none exists, use "strictly greater points
  passes". (In the reference, a tie with the leader at 170 does **not** move the Philippines to 01.)
- Several countries on the same points → passing them is a single move to the furthest rank.

### 6.2 Count engine
A single proxy `const counter = { v: S₀ }`, tweened by the master reveal timeline. In `onUpdate`:
```ts
const n = Math.round(counter.v);
if (n !== shownRef.current) {
  shownRef.current = n;
  lastPointsEl.textContent = String(n);
  toWinValueEl.textContent = String(Math.max(1, L - n + 1));   // tag text via i18n template
  // rank passes
  let target = currentRankRef.current;
  while (passIdx < passes.length && n > passes[passIdx].points) target = passes[passIdx++].rank;
  if (target !== currentRankRef.current) moveLastToRank(target);   // §6.4
  if (win && n > L && !tagRetractedRef.current) retractToWinTag();  // §6.7
}
```
Digit changes are **instant** (no roll, no flash). Keep `tabular-nums`.

### 6.3 Count pacing
```ts
const speed = finalRevealAnimationSpeedRef.current;          // 0.5–1.5, existing setting
const climb = P - S₀;
const V_REF = 1000 / 170;                                    // ≈5.9 pts/s (reference)
const MAX_CLIMB_S = 14;                                      // keeps huge gaps watchable (tunable)
const MIN_CLIMB_S = 4;
// guard: if climb <= 0 (the last country received 0 points), skip the climb tweens and go straight to the hold
let v0 = Math.max(V_REF, climb / MAX_CLIMB_S);
v0 = Math.min(v0, climb / MIN_CLIMB_S) * speed;              // small gaps still take ≥4 s at speed 1
const k  = Math.min(climb, Math.max(3, Math.min(25, Math.round(climb * 0.13)))); // decel tail (ref: 10 of 77)
const dA = (climb - k) / v0;                                 // linear section
const dB = (2 * k) / (1.6 * v0);                             // tail: velocity falls linearly to 60 % of v0
const tailEase = (u: number) => 1.25 * u - 0.25 * u * u;     // exact closed form of that velocity ramp
const HOLD = 1.13 / speed;                                   // the tie / final-value hold
const delta = F - L;                                         // win only
const dBurst = Math.min(2.4, Math.max(0.8, 0.7 + 0.03 * delta)) / speed;   // ref: 41 pts → 1.93 s
const swapAt = Math.min(0.7, 0.2 + 0.37 * dBurst);           // seconds after burst start (ref ≈0.72)
```
The master timeline:
```ts
tl.addLabel('climb')
  .to(counter, { v: P - k, duration: dA, ease: 'none', onUpdate })
  .to(counter, { v: P,     duration: dB, ease: tailEase, onUpdate })
  .addLabel('hold')
  .to({}, { duration: HOLD });
if (win) {
  tl.addLabel('burst')
    .to(counter, { v: F, duration: dBurst, ease: 'power2.out', onUpdate })
    .add(() => swap(), `burst+=${swapAt}`)                      // §6.6
    .add(() => complete(), `burst+=${Math.max(dBurst, swapAt + 0.49) + 0.3}`); // after count end AND swap settle
} else {
  tl.add(() => resolveNoWin());                                // §6.8, right after the hold
}
```
With the reference numbers (`S₀ 93`, `L 170`, `F 211`) this gives a climb of about 13.5 s, a 1.13 s hold and a 1.93 s
burst, which matches the clip.

### 6.4 Rank move (last country passes someone)
- `lastGroup` (tag mask + pill) → `y = rowY(newRank) − rowY(startRank)`, **240 ms, `power2.inOut`** (measured: 3 % at
  17 ms, 13 % at 50 ms, 34 % at 100 ms, 68 % at 133 ms, 89 % at 183 ms, 99 % at 217 ms), `overwrite: 'auto'` so rapid
  successive passes retarget smoothly. There's no overshoot on ordinary moves.
- Optional vertical blur on the group: about 4 u peak mid-move.
- **Ring hop:** at move start, `lastRing` goes `opacity 1→0, scale 1→0.85`, 60 ms, `power1.in`. Then `gsap.set` its
  `y` to the new row. At **+170 ms**, pop it: `scale 0.6→1` with `back.out(2)`, 260 ms (peaks around 1.05–1.08 at about
  +90 ms), and `opacity 0→1` over the first 60 ms. Any active heartbeat moves with it (the pulse layers live inside the ring element).
- The leader group never moves during the climb.

### 6.5 Heartbeat on the last country's rank chip
- **Start** at `max(climbStart, holdStart − 2.7 s / speed)`. In the reference it starts at 158/170 while the Philippines
  sits at rank 02.
- Run it as a self-rescheduling loop (`gsap.delayedCall`) so that the period can change on each beat:
  ```ts
  const e = elapsedSinceHeartbeatStart;
  const period = lerp(0.53, 0.29, clamp01(e / 1.7)); // s (measured 0.53 → 0.44 → 0.38 → 0.30, then 0.27–0.30)
  const I = lerp(0.4, 1.0, clamp01(e / 1.5));        // intensity ramps up too
  gsap.timeline()
    .to(flash, { opacity: 0.45 * I, duration: period * 0.4, ease: 'sine.out' })
    .to(glow,  { opacity: I,        duration: period * 0.4, ease: 'sine.out' }, '<')
    .to(ring,  { scale: 1 + 0.05 * I, duration: period * 0.4, ease: 'sine.out' }, '<')
    .to([flash, glow], { opacity: 0, duration: period * 0.5, ease: 'sine.in' })
    .to(ring,  { scale: 1, duration: period * 0.5, ease: 'sine.in' }, '<');
  scheduleNext(period);                              // gsap.delayedCall(period, beat), created via contextSafe
  ```
- The chip measured `#9F41A9` at rest and `#D583E4` at peak, and the **track around the chip also brightens** (from
  `#CF45CA` to `#E798E5`), which is why the outer glow is needed.
- It keeps beating through the hold and the burst, then **stops at the swap** (win) or at resolution (no win): fade
  flash/glow to 0 in 120 ms and kill the loop.
- The leader's chip never pulses.

### 6.6 Swap (win), times relative to the swap start W
| Δt | Element | Animation |
|---|---|---|
| 0 | Heartbeat | Stop (§6.5) |
| 0 | `lastGroup` | Move to the winner's final rank row (row 1): **490 ms, `back.out(1.4)`** (overshoots about 7 % of a row ≈ 5 u at +300 ms, settled at +490 ms; measured 21 % at 17 ms, 44 % at 67 ms, 64 % at 100 ms, 99 % at 217 ms, 107 % at 300 ms) |
| 0 | `leaderGroup` | **Simultaneously** moves to its final rank (normally row 2) with the **same tween** |
| 0 | `CURRENT LEADER` tag | `opacity 1→0` + `blur 0→6u`, **150 ms, `power1.out`**. It rides down with the leader group while fading. Don't slide it into the pill. |
| 0 | Both rings | Hide (60 ms, as in §6.4) |
| +180 | Both rings | Pop in at their new rows (§6.4 pop). The old leader **keeps a ring** at row 02. |
| +80 | Winner's `WINNER` tag | Tag rise (§4.4) but **270 ms, `power3.out`** |
| — | Count | Keeps running to `F` through all of this |

Get the final rows for both groups from the **real committed standings**, so tie-breaks (for example, a third country
tied with the leader) come out right.

### 6.7 TO WIN tag retract (win)
The first time `n > L`, wait 50 ms, then `tag y: 0 → 63u` (sinks into the pill), **170 ms, `power2.in`** (measured:
5 % at 20 ms, 20 % at 50 ms, 45 % at 100 ms, 90 % at 135 ms, gone by about 170 ms), plus an optional vertical blur.

### 6.8 No-win resolution (extrapolated, not in the reference)
The count decelerates into `F` and holds for `HOLD` with the heartbeat still running. This is deliberately identical to
the win path up to this point, so the pacing doesn't give the result away. Then:
1. Stop the heartbeat. The TO WIN tag retracts (§6.7).
2. +100 ms: the leader's CURRENT LEADER fades out (as in §6.6). At +180 ms the leader's WINNER tag rises (§4.4, 270 ms).
3. +100 ms: the leader ring does a confirmation pop: `scale 1 → 1.12 → 1`, 300 ms, `back.out(2)`.
4. +800 ms: `complete()`.

Exact tie (`F == L`) is a no-win: the count stops on the tie, holds and resolves this way.

### 6.9 Settings mapping
- `finalRevealAnimationSpeed` divides **only** the count-phase durations (`dA`, `dB`, `HOLD`, `dBurst`, heartbeat lead
  time). Micro-animations (rank moves, ring pops, tags, swap) keep their absolute durations.
- `finalRevealLinearAnimation = true`: `k = 0` (no tail), `HOLD = 0`, and the win case doesn't split into
  climb/burst. One `ease: 'none'` tween runs `S₀ → F` over `clamp((F − S₀)/V_REF, 4, 14) / speed`. Retract the tag when
  `n > L`, swap 0.4 s after that, and keep the heartbeat with the same start rule.
- `complete()` calls `onRevealComplete()` (which sets `isRevealAnimationComplete`), exactly as the gauge variant does.

### 6.10 Final reconciliation
After the count ends (both cases), compare the last country's displayed rank with its rank in the committed store. If
they differ (tie-break subtleties), do one more §6.4 move. The ladder must never end on a wrong rank.

---

## 7. Easing and physics cheat-sheet

| Motion | Ease | Duration |
|---|---|---|
| Dot pop | `back.out(1.4)` (≈7 % overshoot) | 330 ms |
| Ring pop (intro) | `back.out(1.7)` from scale 0.6 | 300 ms |
| Ring pop (hop / swap) | `back.out(2)` from scale 0.6 | 260 ms |
| Name section slide-out | `power2.out` | 420 ms |
| Flag slide-out | `power2.out` (+110 ms delay) | 300 ms |
| Cap widen / shift | `power2.out` | 330 ms |
| Char resolve | linear colour keyframes, 22 ms stagger | 140 ms each |
| Points fade-in | `power1.out` | 130–150 ms |
| Tag rise | `power3.out` | 330 ms (270 ms for WINNER) |
| Tag sink | `power2.in` | 170 ms |
| Rank move | `power2.inOut` | 240 ms |
| Swap | `back.out(1.4)` (≈7 % overshoot) | 490 ms |
| Climb | linear, then the `1.25u − 0.25u²` tail | §6.3 |
| Burst | `power2.out` | 0.8–2.4 s |
| Heartbeat | `sine.out` up (40 %) / `sine.in` down (50 %) / 10 % rest | 0.53 → 0.29 s period |

### 7.1 Motion blur (optional but very characteristic)
CSS can't blur along one axis, so use an inline SVG filter per moving group and tween its `stdDeviation` with GSAP's
`attr` plugin:
```tsx
<svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
  <filter id={`hblur-${side}`} x="-10%" y="-30%" width="120%" height="160%">
    <feGaussianBlur ref={hBlurRef} stdDeviation="0 0" />
  </filter>
</svg>
// element: style={{ filter: `url(#hblur-${side})` }} only while animating; remove it afterwards to save GPU work
gsap.timeline()
  .to(hBlurRef.current, { attr: { stdDeviation: `${6 * u} 0` }, duration: 0.12, ease: 'power1.out' })
  .to(hBlurRef.current, { attr: { stdDeviation: '0 0' }, duration: 0.26, ease: 'power1.in' });
```
Put this behind a constant (`ENABLE_MOTION_BLUR`). Under `prefers-reduced-motion`, skip all blur and halve the
micro-durations.

---

## 8. Edge cases checklist
- The last country starts at rank 2: no climb moves, and the heartbeat still follows the time rule.
- The last country starts very low (for example rank 25 of 26): many moves. `overwrite: 'auto'` keeps them smooth, and
  several passes on the same points collapse into one move.
- `received == pointsNeeded` (wins by exactly 1): the burst is short (0.8 s) and the swap lands about 0.5 s in.
- `F == L`: no win (§6.8).
- Countries tied with the leader: use the real final standings for the swap targets (§6.6).
- The televote arrives during the intro: queue it and fire it when the intro ends (existing pattern).
- Undo, View Scoreboard, `clearReveal` or a stage change mid-animation: everything is killed through the `useGSAP` scope.
  No stray `delayedCall`s.
- Heart logos (`shouldShowHeartFlagIcon`): the pill's flag slot is a 3:2 rectangle designed for real flags. Use the
  rectangular flag in the pill and the heart logo only in the large side visuals. If you think otherwise after reading
  the flag helpers, centre the square logo on a white slot instead.
- Long names and RTL-free locales: names truncate with an ellipsis in the name section; the tag mask keeps working
  whatever the tag's width.
- Light or custom themes: the pill colours are fixed brand colours; make sure the side-area overlay keeps contrast.

## 9. i18n
Add to **all 8** `messages/*.json` (en, fr, de, it, pl, uk, el, es), reusing existing keys where they already say the same thing:
- `simulation.finalReveal.ladder.currentLeader`: "Current leader" (rendered uppercase via CSS)
- `simulation.finalReveal.ladder.pointsToWin`: "+{points} P to win" (keep the number a separate node so it can be
  updated through `textContent`)
- `simulation.finalReveal.ladder.winner`: "Winner"
- `settings.ui.finalRevealStyle` (+ option labels "Classic gauge" / "Rank ladder")

## 10. Acceptance criteria
1. With `finalRevealStyle = 'gauge'`, nothing changes in behaviour or visuals.
2. With `'ladder'`, the intro matches the §4.2 timeline to within ±1 frame at 60 fps (screen-record and step through it):
   ring → dot → unfurl → points → tags, with the leader leading the last country by about 300 ms.
3. The win reveal shows a steady count, one-rank glides with ring hops, an accelerating chip heartbeat, the tie hold,
   the burst, the TO WIN tag sinking, the two-pill swap with overshoot, CURRENT LEADER fading, WINNER rising and the
   count settling on the real final total.
4. The no-win and tie paths resolve as in §6.8, and `onRevealComplete` fires once in every path.
5. Spamming "Random", "Finish randomly", undo during the reveal, and speed 0.5 / 1.0 / 1.5 plus linear mode all behave.
6. No React re-render per tick (verify with the React profiler), and no console errors on unmount.
7. Ranks on the ladder at the end match the scoreboard's ordering.
8. `final-televote-reveal.md` is updated with the new variant.

## 11. Decisions already made (change them if the codebase suggests better)
- The new variant is opt-in through a setting, and the default remains the gauge.
- The ladder shows every rank in the stage, with the pitch compressed to fit.
- The sides show big flags instead of camera shots, and they never swap.
- The no-win path and the large-N layout are extrapolated (the reference shows only an 11-rank win).
