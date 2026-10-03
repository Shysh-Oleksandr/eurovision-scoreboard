# Design brief: Allocation draw

## Context

DouzePoints is a Eurovision Song Contest scoreboard simulator. Before running a
contest, users configure it in the **Event Setup modal**. You designed its
"Hub" layout (direction D) in an earlier session and it is now in production.
Attached: a screenshot of the production Hub (Eurovision 2026), the Hub
prototype, `DESIGN_SYSTEM.md`, `tokens.css`, and the phone screenshots.

What the production Hub has today:

- **Header:** contest (year) selector, theme selector, Settings, Guide, Feedback.
- **Widgets:** Profile, Themes, Contests.
- **Contest card:** host logo, "Eurovision 2026", "35 participating · 3 stages",
  ownership badge. Actions: **Select** (labelled; toggles selection mode and
  shows a pressed `is-on` state), **Reset** (icon, saved contests only),
  **Reorder stages** (icon), **Add stage** (icon), **Save** (labelled). On
  tablet Select becomes icon-only. On phones (<576px) the card shows Select,
  Save and a "…" overflow menu (Reorder stages, Add stage, Country pool, Reset).
- **Lineup:** one collapsible card per stage, with:
  - a number badge, the stage name, a count pill that opens "Move all to…",
    and an edit pencil;
  - a grid of country tiles (heart flag, name, chevron that opens a "Move to"
    menu).
  - The Grand Final card is gold-tinted. In "Grand Final only" mode an extra
    muted, stage-styled **"Not qualified"** card appears below it.
- **Country Pool** (countries not taking part) sits below the lineup. It has
  search and categories, and supports drag and drop both ways. Select mode
  adds a selection tray for bulk moves.
- **Footer:** Continue (resumes a running simulation) and the big accent
  **Start** CTA.
- After Start, a **Post-setup modal** opens per stage, with General, Voters,
  Running order and Odds tabs. The **Running order tab** is a sortable list or
  grid, with A–Z, Z–A, Shuffle, Reset and "Share running order" actions.

## The feature

Eurovision splits its semi-finalists between the semi-finals with a televised
**allocation draw**. We want users to run their own: the official
contest re-drawn ("what if 2026 had been drawn differently?"), or a custom
contest with their own countries and entries.

### Official rules (the default behaviour)

1. **Pre-qualified countries** (the Big 5 or Big 4, plus the host) skip the
   semis and go straight to the final. The draw only decides which semi each
   one **votes in**. They are spread evenly (2026: 2 vote in SF1, 3 in SF2).
   This part is drawn first.
2. **Semi-finalists are grouped into pots** (usually five) of countries that
   tend to vote for each other: Balkan, Nordic, Caucasus, Baltic and so on.
3. **Pot by pot, each country is drawn into a semi.** Every pot is split as
   evenly as possible, so neighbours rarely compete together. The semis end
   up the same size, ±1.
4. **A second draw puts each country in the first or second half of its show.**
   Producers then set the exact order within each half.
5. Broadcasters can request a specific semi in advance. For example, Israel is
   placed in SF2 when SF1 clashes with its Memorial Day.

## The design problems

1. **Participants without a stage.** Today a country becomes a participant only
   by being placed in a stage. The draw needs countries that are taking part
   but have no semi yet.
2. **Many options, but the base flow must be obvious.** Custom contests need
   customisation (pots, sizes, how running order is drawn, and so on). A
   first-time user who has never heard of "pots" should still get through
   without opening any of it: turn the draw on → check who's in it → watch
   the draw → apply. Options exist, but stay out of the way until asked for.

## Proposed flow

This flow is our starting point. Validate it, improve it, and push back where
something would confuse users.

### 1. Draw mode on the Contest card

- Add an **Allocation draw** toggle to the Contest card: a button on tablet and
  desktop (dice icon, labelled where space allows, pressed state like Select),
  and an item in the phone "…" menu.
- Place it so the card doesn't feel crowded next to Select, Reset, Reorder,
  Add stage and Save.
- When turned on with semis that already hold countries (every year preset
  does), ask once: **move the 30 semi-finalists into the draw**, or **keep
  them where they are**. Keeping them is valid: the draw then only places
  newly added countries.
- Unavailable in "Grand Final only" mode or with fewer than two semi-finals.
  Show it disabled, with the reason.
- **Leaving draw mode while countries are still waiting** asks what to do with
  them: return them to the pool, or stay in draw mode.

### 2. Lineup in draw mode

- A new stage-styled **"To be drawn"** card sits above the semis, using the
  same pattern as the existing "Not qualified" card but clearly its own thing.
  - It has its own tint and a count pill with "Move all to…".
  - Its one-line explanation is something like "The draw splits these
    countries between the semi-finals."
  - Countries get in and out the usual ways: tile menu, drag and drop,
    selection tray, Move all.
  - Consider grouping its tiles by pot (Pot 1…5 rows) once pots exist. That
    would teach pots without any explanation. If you do, note whether
    dragging between pot rows should edit pots.
  - Empty state: "Add countries from the pool, or move all semi-finalists
    here."
- **Semi cards** show any countries already in them as **fixed** (a pin
  marker), plus a placeholder like "+15 from the draw". Rule: *anything you
  put in a semi yourself stays there; the draw only places waiting
  countries.* This is how users make requests like Israel → SF2, with no
  separate pre-allocation screen.
- **Grand Final card:** pre-qualified countries stay here. In draw mode, add a
  hint ("These 5 vote in a semi-final chosen by the draw"), and give their
  tile menu a **"Votes in: Drawn / Semi-Final 1 / Semi-Final 2"** choice.
- **The footer CTA always names the next step:** "Start the draw" while
  countries are waiting, and "Start" again once nothing is waiting. Starting
  the contest with countries left in the draw must be impossible.

### 3. The draw window: one layout, three states

The window opens over the Hub.

- **Ready (0 of N):**
  - Pots are full and the semis empty, with a "votes here" row per semi for
    pre-qualified countries and first-half / second-half lanes.
  - Three short plain-language lines explain what is about to happen (pots
    are split evenly; each country is drawn into a half; pre-qualified
    countries are drawn to vote in one semi).
  - A chip reads "Official rules · Customize".
  - Buttons: **Start the draw** (primary) and **Instant result**.
- **Drawing:**
  - Order: pre-qualified voting first, then Pot 1 → Pot N.
  - Each draw lifts a country out of its pot into a spotlight, with a caption
    that reveals semi then half ("Croatia → Semi-Final 1 · First half"). The
    country then flies to its lane.
  - When a pot starts, one line says what happens ("Pot 2: three go to each
    semi-final").
  - Pinned countries are shown already placed, with their pin.
  - Controls: **Draw next** (Space key), **Auto-play** with speed, **Skip to
    result** (always visible), and progress ("Pot 2 · 9 of 35").
- **Done:**
  - Full semis with halves, and **Apply to line-up** (primary), **Redraw**,
    Close.
  - If votes were already set up for a semi, Apply warns that they will be
    reset.

**Apply** fills the semis, adds each pre-qualified country to the voters of
its semi, sets a starting running order (first half, then second half,
shuffled inside each half), and turns draw mode off.

### 4. Customize

Customize is a panel inside the draw window, not another modal. Group the
options under plain headings. Each option shows an "Official" marker on its
default value, changed options are marked, and a "Reset to official" control
restores everything. When something is changed, the summary chip in the Ready
state becomes something like "Custom rules · 2 changes".

| Option | Official default | Alternatives |
|---|---|---|
| Pots | Official list (known years), else "Based on voting history" | Based on voting history (auto-generated) / Custom (drag flags between pots, add or remove pots) / No pots (fully random) |
| Splitting pots | Even between semis | Fully random |
| Semi-finals in the draw | All semis | Choose (custom contests may have 3+) |
| Semi sizes | Balanced | Custom size per semi |
| Running order | Draw halves | Draw exact positions (the 2008–2012 rules) / Don't change running order |
| Pre-qualified countries | Each votes in one drawn semi | Vote in every semi / Don't vote in semis |
| Draw code | Random | Enter a code to repeat a draw |

Per-country choices stay in the lineup (pins, "Votes in"), not in Customize.

### 5. After the draw

- **Lineup:** add a light-touch "Drawn" indicator. A "Replay draw" entry point
  is welcome, though it will ship later.
- **Running order tab:**
  - A **First half / Second half divider** in the list and grid layouts.
  - Shuffle shuffles inside each half.
  - Dragging across the divider moves a country to the other half.
  - Show how halves look when a stage has none (custom or older contests): no
    divider.

## States to design

Desktop is 1280 wide and phone 375, unless noted.

1. Contest card with the draw toggle: off and on states on desktop and tablet,
   and the phone overflow-menu item.
2. "Move semi-finalists into the draw?" choice.
3. Lineup in draw mode:
   - the "To be drawn" card, full and empty;
   - semis with one pinned country plus the placeholder;
   - the Grand Final hint and the "Votes in" tile menu;
   - the footer "Start the draw".
4. Leaving draw mode with countries waiting.
5. Draw window: Ready.
6. Draw window: Drawing. Show one pre-qualified reveal and one entrant reveal
   mid-animation.
7. Draw window: Done, plus the Apply warning variant.
8. Customize panel: default state, plus one with an option changed.
9. Error: the rules can't be met (e.g. too many countries pinned to one semi).
   Explain in plain words what's wrong and how to fix it.
10. Draw toggle disabled (Grand Final only mode), with its reason.
11. Lineup after Apply, with the Drawn indicator.
12. Running order tab with halves, in list and grid layouts.

## Constraints

- **Palette:** use the design system and tokens. The palette is generated from
  the theme hue (`--p-950…--p-700`, `--accent`, `--accent-2`, `--gold`, ink
  and hair tokens). Check the result at hue 300 (default), the 2026 gold
  theme (hue ≈ 86, blue accent) and a light custom theme.
- **Reuse Hub components:**
  - stage card, country tile, count pill, filled surface buttons, accent CTA;
  - anchored menus (they open instantly, with no entrance animation);
  - selection tray, modal shell.
  - A new tint for the "To be drawn" card is fine.
- **Layout:** design phone-first, with one layout breakpoint at 576px.
- **Font:** don't hardcode a font; surfaces inherit the app's font slot.
- **Motion:** it will be built with GSAP. Specify durations, easing and
  staggering. Provide a `prefers-reduced-motion` version (instant placement or
  a fade). Auto-play at top speed should finish 35 countries in about
  20 seconds.
- **Accessibility:**
  - keyboard operation, with Space for Draw next;
  - a live region announcing each draw ("Croatia, Semi-Final 1, first half");
  - visible focus;
  - 4.5:1 contrast for text.
- **Copy:** keep the terms consistent: "Allocation draw", "To be drawn", "pot",
  "pre-qualified", "first half / second half", "fixed". Avoid "seed",
  "quota" and "allocation" in body text.

## Data for the prototype

Eurovision 2026: 35 countries.

- **Pre-qualified:** Austria (host), France, Germany, Italy, United Kingdom.
- **Pot 1:** Albania, Bulgaria, Croatia, Montenegro, Serbia, Switzerland
- **Pot 2:** Australia, Denmark, Estonia, Finland, Norway, Sweden
- **Pot 3:** Armenia, Azerbaijan, Georgia, Israel, Poland, Ukraine
- **Pot 4:** Belgium, Czechia, Luxembourg, Moldova, Portugal, Romania
- **Pot 5:** Cyprus, Greece, Latvia, Lithuania, Malta, San Marino

The prototype's draw can be faked, but it must obey the rules: pots split
evenly, semis ±1, halves ⌊n/2⌋ / ⌈n/2⌉, pinned countries respected.

For an uneven case, use 2025, with 31 semi-finalists drawn into 15 and 16.

- **Pre-qualified:** Switzerland (host), France, Germany, Italy, Spain,
  United Kingdom.
- **Pot 1:** Belgium, Czechia, Estonia, Latvia, Lithuania, Luxembourg,
  Netherlands
- **Pot 2:** Armenia, Azerbaijan, Georgia, Israel, Poland, Ukraine
- **Pot 3:** Albania, Austria, Croatia, Montenegro, Serbia, Slovenia
- **Pot 4:** Cyprus, Greece, Ireland, Malta, Portugal, San Marino
- **Pot 5:** Australia, Denmark, Finland, Iceland, Norway, Sweden

## Deliverables

1. **An interactive HTML prototype**, in the same style as the Hub prototype,
   covering the flow end to end. Use one direction for the lineup and flow.
   For the draw window, explore up to two layouts. For example, a
   "broadcast" layout (spotlight centre stage, pots on top, semis below) and
   a "board" layout (pots on the side, semis as dense tables with half
   lanes).
2. **Screenshots** of every state listed above, at 1280 and 375.
3. **A handoff README** like the previous ones, covering:
   - measurements and tokens;
   - final copy;
   - motion timings;
   - which existing Hub component each new piece extends.
4. **A first-time-user walkthrough**: step by step, what someone who has never
   heard of pots sees and does, where they could get stuck, and how the
   design prevents it. Call out any part of this brief you believe hurts
   clarity, and what you'd do instead.
