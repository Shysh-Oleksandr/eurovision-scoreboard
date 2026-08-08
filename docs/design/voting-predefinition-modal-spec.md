# Design spec: Voting Predefinition modal

> **Purpose of this document.** A complete inventory of everything the Voting
> Predefinition modal displays and does, written so a designer can propose a
> redesign without reading the code. **Functionality is fixed; layout, hierarchy,
> grouping, progressive disclosure and visual treatment are all open.** The
> "Functional invariants" section at the end is the contract a proposal must not
> break.
>
> Source: `src/components/setup/voting-predefinition/VotingPredefinitionModal.tsx`
> and its children.

---

## 1. What this modal is for

DouzePoints is a Eurovision Song Contest scoreboard simulator. Before running a
stage's voting animation, a user can **predefine the votes** instead of letting
the app generate them randomly — so the contest plays out exactly how they want.

This modal is where that happens. It offers **three ways to author the same
underlying result**, in decreasing order of precision:

| Mode | You control | Effort |
|---|---|---|
| **Detailed** | Every individual cell: what each voting country awards each participant | Highest — a full N×M matrix |
| **Rank** | The final standings order; the app generates a matrix that produces it | Medium — drag to reorder |
| **Totals** | Each participant's target total; the app generates a best-fit matrix | Low — type numbers |

All three write to the **same** underlying per-voter vote matrix, and the modal
keeps them in sync — switching tabs shows the same result expressed differently.
This "three views of one object" idea is central and should survive the redesign.

**Who uses it:** hobbyist fans building a fantasy contest. Sessions are long and
playful, not transactional. Many users are on desktop, but mobile matters.

---

## 2. The core problem to solve

**The modal is cluttered, especially the top.** In Detailed mode a user faces
**~20 interactive controls before reaching the actual content**, stacked in four
full-width bands:

```
┌────────────────────────────────────────────────────────────┐
│ [ Detailed ] [ Rank ] [ Totals ]                    (3)    │ ← tab bar
├────────────────────────────────────────────────────────────┤
│ Semi-Final 1  (Total)(Jury)(Televote)   [A↓][↻][RANDOMIZE] │ ← title + 6 controls
│ Enter the points each voting country awards… (1-8, 10, 12) │ ← hint text
├────────────────────────────────────────────────────────────┤
│ [SAVE PRESET] [LOAD PRESET]        ↑Import ↓Export (i)     │ ← 5 controls
├────────────────────────────────────────────────────────────┤
│                                                            │
│                    THE ACTUAL MATRIX                       │ ← the point of the screen
│                                                            │
├────────────────────────────────────────────────────────────┤
│ [share][share][share][share]              [CLOSE] [SAVE]   │ ← 6 controls
└────────────────────────────────────────────────────────────┘
```

Specific symptoms:

1. **No visual hierarchy among actions.** `RANDOMIZE`, `SAVE PRESET`, `Import`
   and the mode tabs are all roughly equally loud, though they differ hugely in
   frequency and consequence. `RANDOMIZE` is destructive (replaces all votes) yet
   looks like a normal button.
2. **Chrome outweighs content.** The modal is a fixed `75vh`; four header bands
   eat a large share of it before the table — the thing users came for.
3. **Mixed control vocabularies at the same level.** Text buttons with icons
   (`SAVE PRESET`), bare icon buttons (sort, reset), ghost text buttons
   (`Import`/`Export`), pill toggles (`Total`/`Jury`/`Televote`) and a tab bar
   all sit within ~120px of each other.
4. **Rarely-used utilities are permanently visible.** Preset save/load and
   spreadsheet import/export are power-user features occupying prime real estate
   on every visit.
5. **Two competing "reset" affordances.** A `↻` reset in the header (clears the
   whole matrix) and, in Totals, a second `↻` (clears typed totals) plus per-cell
   `×` buttons — three different scopes of "clear", visually undifferentiated.
6. **The 4 share icons in the footer are unlabelled and context-dependent** —
   their data source silently changes with the active tab (see §6), which is
   invisible at the moment of clicking.
7. **Long instructional paragraphs** in Totals mode (2–3 lines) push the actual
   inputs down.

---

## 3. Shell & geometry

- Rendered in a portal, centered, with a dimmed (optionally blurred) overlay.
- Content box is **fixed height `75vh`**, `flex flex-col`, and the body scrolls
  internally. The redesign may change this but must handle a body that scrolls.
- The shell exposes three slots: `topContent` (currently the tab bar), the
  scrolling body, and `bottomContent` (currently the footer bar). These are
  structural but can be re-used differently.
- Closing via overlay click routes through a **confirmation dialog** ("Close
  voting predefinition? Any unsaved changes will be lost.").

**Breakpoints in use:** `2xs 368px`, `xs 480px`, `2cols 576px`, then Tailwind
defaults (`sm 640`, `md 768`, `lg 1024`). Today several controls collapse to
icon-only below `sm`, and preset toolbars swap between a mobile and desktop copy.

---

## 4. Element inventory

### 4.1 Persistent chrome (all three modes)

| Element | Type | Behaviour | Notes |
|---|---|---|---|
| Mode tabs | 3-way tab bar | `Detailed` / `Rank` / `Totals` | Uses shared `Tabs` component (animated sliding pill). Switching to Totals re-seeds it from the current matrix. |
| Share: Scoreboard | Icon button | Opens a podium/scoreboard **image generator** modal | Icon `Share` |
| Share: Split table | Icon button | Opens stats image modal, jury/televote split view | Icon `Grid3x2` |
| Share: Summary table | Icon button | Opens stats image modal, summary view | Icon `Sheet` |
| Share: Breakdown table | Icon button | Opens stats image modal, **full voter × participant grid** | Icon `Table2`. **Disabled when no votes exist.** |
| Close | Secondary button | Closes (with confirm) | |
| Save | Primary button | Validates, then commits the matrix and closes | **Disabled** in Totals mode until a breakdown has been generated |

### 4.2 Detailed mode

| Element | Type | Behaviour |
|---|---|---|
| Stage name | Heading | e.g. "Semi-Final 1" |
| Vote-type badges | Pill toggle group | `Total` / `Jury` / `Televote`. Only shown when the stage's voting mode has both channels. Switches which channel the matrix edits. |
| Points-system hint | Body text | "Enter the points each voting country awards to participants (1-8, 10, 12)" — the trailing list is dynamic |
| Sort toggle | Icon button | Toggles participant order: by points ⇄ alphabetical |
| Reset | Icon button | **Destructive** — clears the entire matrix |
| Randomize | Button | **Destructive** — regenerates the entire matrix randomly |
| Save preset / Load preset | Two text+icon buttons | Persist/restore a named matrix |
| Import / Export | Two ghost text+icon buttons | Spreadsheet (.xlsx/.xls/.csv) round-trip |
| Format help | Tooltip `(i)` | Explains the spreadsheet format |
| **The matrix** | Editable table | Rows = participants (rank, flag, name, running total). Columns = voting countries (flag headers). Cells = numeric inputs. |
| Drag-and-drop overlay | Full-body overlay | Appears when a spreadsheet file is dragged over: "Drop to import" |

Matrix cell details:
- Cells are colour-weighted by value (12s and 10s get progressively stronger
  fills) so patterns are readable at a glance — see screenshot 1.
- A participant cannot vote for itself → that cell is disabled/blank (visible as
  the diagonal).
- In `Total` view the cells are read-only aggregates; editing happens in
  `Jury`/`Televote`.
- Each voter column carries a **validity indicator** (complete / invalid /
  incomplete) since every voter must award the full points set exactly once.

### 4.3 Rank mode

Shares the same header as Detailed (stage name, badges, preset + spreadsheet
rows, reset), **minus** the sort toggle and Randomize. Adds:

| Element | Type | Behaviour |
|---|---|---|
| Randomize ranking | Button | Re-rolls the order using each country's odds |
| Randomize points | Button | Generates a vote matrix matching the current order, and **reveals** per-row totals |
| Layout toggle | 2-way icon tabs | Grid ⇄ list presentation of the rank list |
| Drag hint | Body text | "Drag countries to set the final ranking. Press 'Randomize points'…" |
| **Rank list** | Drag-to-reorder list | Each row: drag handle, position number, flag, country name, and (once revealed) its points total. Top 3 get medal accents. |

### 4.4 Totals mode

| Element | Type | Behaviour |
|---|---|---|
| Save preset / Load preset | Two text+icon buttons | Persists the typed totals |
| Sort toggle | Icon button | By points ⇄ alphabetical |
| Reset | Icon button | Clears **all** typed totals |
| Intro paragraph | Body text (2–3 lines) | Explains targets, blanks, and that values may be adjusted |
| **Budget bars** | 1 or 2 progress meters | One per channel (Jury + Televote, or a single bar). Shows `used / total allocated`, a fill-count line ("19 of 19 countries filled — the rest are generated automatically"), and, when infeasible, a concrete red warning e.g. *"Croatia: 200 exceeds the 180 maximum for one country (15 × 12)"*. States: green (ok) / amber (near budget) / red (infeasible). |
| Generate / Regenerate breakdown | Button | Builds the real vote matrix from the typed targets. **Disabled when already in sync** (see §6). |
| Status hint | Body text beside the button | One of three messages: not yet generated / edits pending / already in sync |
| Adjustments callout | Info panel | Appears when targets couldn't be met exactly: "Some totals were adjusted" + explanation |
| **Totals table** | Editable table | Columns: Rank, Country, Jury Points, Televote Points, Total Points (the jury/televote pair collapses to one column in single-channel modes). |
| Per-field clear | Small `×` per input | Resets that field to **blank** (≠ 0 — see §6) |
| "Adjusted" badge | Chip on a row | Tooltip: "Adjusted: you entered 200, closest achievable is 180" |
| Over-max field | Red input border | Live, no generation needed |

---

## 5. States & feedback to preserve

- **Voter validity dots** on matrix columns (complete / incomplete / invalid).
- **Budget bar colour states** + concrete infeasibility messages.
- **Breakdown freshness**: `ungenerated` → `stale` (targets edited) → `fresh`.
  Save and the Generate button both key off this.
- **Adjusted rows** after generation.
- **Disabled Breakdown share** when the matrix is empty.
- **Drag-over state** for spreadsheet import.
- **Save validation failure** currently uses a native `alert()` listing offending
  voters — this is ugly and a good redesign candidate (see §9).

---

## 6. Domain rules a designer needs to understand

These are non-obvious and drive several UI decisions:

1. **Blank ≠ 0.** In Totals, an empty field means "let the engine decide"; a typed
   `0` pins that country to nul points. This is why per-field clear buttons exist
   and why the fill-count line is shown. The distinction must remain legible.
2. **Not every set of totals is achievable.** Each voting country hands out a
   fixed points set (12,10,8…1) exactly once, so a channel's total is fixed
   (`voters × 58`) and one country can't exceed `voters × 12`. Impossible targets
   get clamped, and the UI must explain *why* a number changed. This is what the
   budget bars and "Adjusted" badges are for.
3. **Generation is destructive and deterministic.** Generating rebuilds every
   ballot. Because it's deterministic, regenerating unchanged targets produces the
   same totals with a different internal structure — pure loss. Hence Generate is
   disabled while in sync.
4. **Share source follows the active tab.** Scoreboard/Split/Summary use the
   typed totals on the Totals tab and the real matrix on Detailed/Rank; Breakdown
   always uses the matrix. **This is currently invisible to the user and is a
   known weakness worth solving.**
5. **Self-voting is impossible** — the matrix diagonal is always empty.

---

## 7. Scale & density constraints

- Participants: typically **15–26**, up to ~40. Voting countries: up to **~40+**
  (can exceed participants; includes a "Rest of the World" voter).
- The Detailed matrix is therefore up to ~40×40 → it **must scroll on both axes**
  with sticky row/column headers. Density here is a feature: users want to see
  many cells at once to spot patterns.
- The Totals table is one row per participant with 2–3 numeric inputs each.
- Any proposal must survive both the small case (5 countries) and the large one.

---

## 8. Hard technical constraints

**Palette — important.** Colours come from 16 year-based themes injected as CSS
variables. Only these tokens exist:

- `primary-700`, `primary-750`, `primary-800`, `primary-900`, `primary-950`
- `gray-500`, `gray-600`, `gray-900`

There is **no `primary-100…600`** — those classes appear in the codebase but
silently emit no CSS. A design must not depend on light primary tints. Neutral
transparency (`white/10`, `white/60`, …) is the established way to get
intermediate surfaces and text, plus standard Tailwind status colours
(`red-500`, `amber-500`, `green-500`) for feedback.

Other constraints:
- **Themeable**: the whole palette shifts per contest year (blue, orange, pink…).
  Don't hard-code hues except for semantic status colours.
- **Icons**: `lucide-react`.
- **Existing components** worth reusing: `Modal`, `Tabs` (animated pill tab bar),
  `Button` (`primary` / `secondary` / `tertiary` / `destructive` / `winner`),
  `Input`, `Badge`, `Tooltip`, `RankableCountryList`.
- **i18n**: 9 locales (en, de, fr, es, it, pt, pl, uk, el). German and Greek
  strings run **30–50% longer** than English — button labels must tolerate wrap
  or truncation. Avoid designs that depend on short labels.
- **Icon-only buttons must keep `title`/`aria-label`**; there's an existing
  user setting that renders tooltips for icon-only buttons.

---

## 9. Known problems, ranked

1. **Top chrome density** (§2) — the headline problem.
2. **Flat action hierarchy** — destructive (`Randomize`, `Reset`), primary
   (`Generate`), and utility (presets, import/export) actions look alike.
3. **Power-user tools always visible** — presets and spreadsheet I/O could be
   progressively disclosed (overflow menu, drawer, contextual placement).
4. **Unlabelled, context-dependent share icons** — no indication of what will be
   shared or from which source.
5. **Three scopes of "clear"** with near-identical affordances.
6. **Instructional text is heavy** in Totals; could become inline/contextual help.
7. **`alert()` for save-validation errors** — should become in-UI feedback,
   ideally pointing at the offending voter columns.
8. **The stage name is nearly invisible** despite being the modal's subject; a
   user with several stages has weak orientation.

---

## 10. Functional invariants (must not be lost)

- Three modes, mutually switchable, all writing one shared vote matrix, with
  Totals re-seeding from the matrix on entry.
- Per-channel editing via the Total/Jury/Televote selector (where applicable).
- Sort toggle (points ⇄ alphabetical) in Detailed and Totals.
- Full-matrix reset; full-totals reset; per-field clear preserving blank-vs-zero.
- Randomize (matrix), Randomize ranking, Randomize points.
- Drag-to-reorder ranking with grid/list layouts and reveal-on-generate points.
- Budget/feasibility feedback and adjustment explanations.
- Generate/Regenerate gated on freshness.
- Preset save/load for both Detailed and Totals.
- Spreadsheet import/export **including drag-and-drop onto the body**.
- Four share outputs, with Breakdown disabled when empty.
- Save (validated, blocked in Totals until generated) and Close (confirmed).
- Voter validity indication; self-vote cells disabled.

---

## 11. Open questions for the designer

1. Should the three modes stay a peer tab bar, or is one of them (Detailed) the
   "home" with the others as generators that feed into it?
2. Where do the power tools (presets, spreadsheet, share) belong — an overflow
   menu, a collapsible utility rail, or a footer bar?
3. Should the Total/Jury/Televote selector be a sub-tab, a segmented control near
   the table, or a column-grouping affordance on the matrix itself?
4. Can share output be made explicit ("Share what?") rather than four
   unlabelled, context-sensitive icons?
5. How should destructive actions (Randomize, Reset) be visually demoted or
   guarded without slowing down the users who use them constantly?
6. Is there a better home for the Totals intro/status text than a paragraph
   stack above the inputs?
7. Mobile: is the Detailed matrix usable at all under 480px, or should small
   screens steer users toward Rank/Totals?

## 12. Non-goals

- Changing the vote-generation algorithms or the data model.
- Redesigning the downstream share-image modals (separate surface).
- Adding new authoring modes or new outputs.
- Changing the theme system or introducing new palette tokens.
