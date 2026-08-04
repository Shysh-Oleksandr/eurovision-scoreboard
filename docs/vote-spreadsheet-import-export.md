# Vote spreadsheet import / export

This document describes the Excel/CSV spreadsheet feature for bulk **import** and **export** of predefined vote matrices in the Voting Predefinition flow, plus **export-only** from the simulation Final Stats breakdown.

---

## What it does

Users can move full per-voter score grids between the app and a spreadsheet instead of editing every cell in the Detailed tab.

- **Import** — read `.xlsx`, `.xls`, or `.csv`, parse vote sections, and apply them to the current stage’s predefined votes in the modal.
- **Export** — write the current vote matrix to a downloadable `.xlsx` file.

The format is intentionally flexible: country names are matched by label (not strict column order), sections are detected by headers, and the totals (`TOT`) column is optional.

---

## Where it appears in the UI

### Voting Predefinition modal (setup)

| Location | Import | Export |
|----------|--------|--------|
| **Detailed** tab — toolbar row (right of Save/Load preset) | Yes | Yes |
| **Detailed** tab — drag-and-drop on the tab content | Yes | — |
| Totals / Rank tabs | — | — |

Import and export are always visible on the **Detailed** tab (not gated on the Jury/Televote sub-badge).

Drag-and-drop only works on **Detailed**; dropping on other tabs is ignored. Accepted file types: `.xlsx`, `.xls`, `.csv`.

### Final Stats modal (after simulation)

| Location | Import | Export |
|----------|--------|--------|
| **Breakdown** tab header (`StatsHeader`) | — | Yes |

Export uses saved `predefinedVotes` for the selected finished stage. There is no import path from Final Stats.

---

## File layout

Each **section** is one voting channel (jury, televote, or combined). Sections are separated by **empty rows**.

### Section header row

```
[empty] | JURY Grand Final | TOT | Albania | Armenia | Azerbaijan | …
```

- Column A is usually empty (rank is on data rows).
- Column B is a label containing `JURY`, `TELEVOTE`, or `COMBINED` (case-insensitive substring match in the first few rows of the section).
- Column C is `TOT` when present (optional).
- Remaining columns are **voting countries** (voters), identified by country name.

### Data rows

```
1 | Ukraine | 175 | 12 | 10 | 5 | …
2 | France  | 169 | 10 | 12 | 8 | …
```

- **Rank** (column A) — optional; used for export ordering, not required for import.
- **Participant** (column B) — country name; matched flexibly to stage participants.
- **TOT** (column C) — optional; ignored on import (totals are derived from cell values).
- **Voter columns** — points awarded to that participant from that voter. Empty cell = no points. Diagonal (voter voting for itself) is left blank.

A section **without** a `TOT` column is also supported (participant names start immediately after the section title).

### Example structure (split or combined stage)

```
JURY section
[empty row]
TELEVOTE section
[empty row]
COMBINED section   ← see “Voting mode behavior” below
```

---

## Country name matching

Implemented in `voteSpreadsheetParse.ts`:

- Normalization: lowercase, `&` → `and`, strip punctuation, collapse whitespace.
- Match by **country code** or **display name**.
- **Rest of the World**: `Rest of the World`, `ROTW`, `WW`, etc. resolve to code `WW`.
- Unmatched labels are reported in a warning toast (first five names).

---

## Voting mode behavior

Predefined votes are stored in `StageVotes` channels: `jury`, `televote`, and `combined`. Which channels matter depends on `StageVotingMode`.

### Jury only (`JURY_ONLY`)

| Export | Import |
|--------|--------|
| One section: `JURY` | One section → `votes.jury` |

### Televote only (`TELEVOTE_ONLY`)

| Export | Import |
|--------|--------|
| One section: `TELEVOTE` | One section → `votes.televote` |

### Split jury + televote (`JURY_AND_TELEVOTE`)

| Export | Import |
|--------|--------|
| `JURY`, `TELEVOTE`, and `COMBINED` | `JURY` → `votes.jury`, `TELEVOTE` → `votes.televote` |

**Combined section on export** is **derived for reference**: each cell is jury points + televote points for that voter; row `TOT` is jury total + televote total. The simulation uses jury and televote separately; `votes.combined` is not stored.

**Combined section on import** is **skipped** (logged in `skippedSections`). Re-importing an exported file will not try to write combined data.

### Combined voting (`COMBINED`)

Junior Eurovision-style mode: three channels exist, but the **scoreboard and reveal use `votes.combined`**.

| Channel | Role |
|---------|------|
| `jury` | Full jury ballots (required for save validation) |
| `televote` | Full televote ballots (required for save validation) |
| `combined` | **Authoritative** ballots for standings and simulation |

`combined` is **not** the sum of jury + televote points. It is built from merged **rank positions** (jury rank index + televote rank index), then points are assigned from that merged ranking. See `generateCombinedVotes` / `buildCombinedBallotsFromJuryTelevote` in `votesPredefinition.ts`.

| Export | Import |
|--------|--------|
| `JURY`, `TELEVOTE`, and `COMBINED` (each from its own channel) | All three sections when present |

- **COMBINED** section → `votes.combined` (validated with the **jury** points system).
- If the file has jury/televote but **no** COMBINED section, `votes.combined` is **rebuilt** from the imported jury and televote ballots using the same rank-merge rules as generation.

In the Detailed tab, the **Total** badge (labeled “Combined”) reads `votes.combined`, not jury + televote.

---

## Import pipeline

```
File → readSpreadsheetGridFromFile (xlsx)
     → parseVoteSpreadsheetGrid
     → mergeImportedVotes (+ optional combined rebuild in COMBINED mode)
     → setVotes in useVotingPredefinition
```

### Parsing steps (`voteSpreadsheetParse.ts`)

1. Split grid into sections (empty rows).
2. Detect section type from header text (`jury` / `televote` / `combined`).
3. Find the voter header row (row with the most resolvable voter country columns).
4. Find the participant column (column with the most resolvable participant names, excluding voter columns).
5. Read numeric cells > 0 as point assignments.
6. Build per-voter ballots via `assignPointIdsForVoter` (`voteAssignmentHelpers.ts`), mapping point **values** to distinct `pointsId` entries from the active points system.

### Points systems on import

- Jury (and combined in COMBINED mode): stage `pointsSystem` (or stage override).
- Televote: `televotePointsSystem` when split points system is enabled; otherwise same as jury.

### Merge semantics

`mergeImportedVotes` **replaces whole channels** when a channel is present in the import result:

- Imported `jury` replaces the entire `votes.jury` map (not a per-voter merge).
- Same for `televote` and `combined`.
- Channels not present in the file are left as-is on the previous state.

After import, `isSorting` is set so the grid re-sorts by totals.

### Guards and validation

| Condition | Result |
|-----------|--------|
| `allowMultiplePointsToSameEntry` enabled | Import blocked |
| Empty file | Error toast |
| No recognizable vote sections | Error toast |
| No valid numeric assignments | Error toast |
| Incomplete ballots after import | Success toast + warning listing invalid voters |

Save validation (`validateAllBeforeSave`) still requires complete jury/televote ballots in split and combined modes. Combined channel completeness is **not** validated on save, but simulation reads combined in COMBINED mode.

Invalid voter detection after import mirrors save rules: every points-system slot used exactly once per voter (jury skips `WW`).

---

## Export pipeline

```
votes in modal or predefinedVotes (Final Stats)
     → buildExportSectionsForStageVotes
     → buildSpreadsheetRows
     → downloadVoteSpreadsheet (xlsx, sheet name "Results")
```

- Participants are ordered by current **rank** in the UI (or breakdown standings in Final Stats).
- Filename in predefinition: `{contestName}-{stageName}-votes.xlsx` (sanitized).
- Filename in Final Stats: `{stageName}-breakdown.xlsx`.

Export fails with `export-unavailable` if there are no sections to write (edge case).

---

## Code map

| File | Responsibility |
|------|----------------|
| `src/components/setup/voting-predefinition/voteSpreadsheetParse.ts` | Grid parsing, section detection, country resolution, merge |
| `src/components/setup/voting-predefinition/voteSpreadsheet.ts` | xlsx read/write, export section builder, file import wrapper |
| `src/components/setup/voting-predefinition/voteAssignmentHelpers.ts` | Map imported point values → `Vote` with `pointsId` |
| `src/components/setup/voting-predefinition/useVotingPredefinition.ts` | `importVotesFromSpreadsheet`, `exportVotesToSpreadsheet`, combined rebuild hook |
| `src/components/setup/voting-predefinition/VoteSpreadsheetButtons.tsx` | Import/Export buttons + format tooltip |
| `src/components/setup/voting-predefinition/VotingPredefinitionModal.tsx` | Drag-and-drop, toasts, button wiring |
| `src/components/setup/voting-predefinition/VotingPredefinitionHeader.tsx` | Toolbar layout (`endContent` for buttons) |
| `src/state/scoreboard/votesPredefinition.ts` | `buildCombinedBallotsFromJuryTelevote` for COMBINED import fallback |
| `src/components/simulation/finalStats/FinalStatsModal.tsx` | Breakdown export only |
| `src/components/simulation/finalStats/StatsHeader.tsx` | Export button on Breakdown tab |

### Tests

- `voteSpreadsheetParse.test.ts` — parsing, section split, combined vs split mode, merge
- `voteSpreadsheet.test.ts` — export section totals (split derived combined vs COMBINED channel)

Run: `yarn test:run voteSpreadsheet`

---

## i18n

Strings live under `setup.votingPredefinition.spreadsheet` in `messages/*.json`. Final Stats export success uses `simulation.finalStats.spreadsheetExportSuccess`.

---

## Related docs

- `docs/voting-simulation-engine-and-diaspora.md` — how random votes and combined rank-merge are generated
- `docs/multiple-points-to-same-entry.md` — why import is disabled when that setting is on
- `docs/stage-points-system-override.md` — per-stage points systems used during import validation
