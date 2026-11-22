# Entry overrides (a contest's own country names and flags)

A contest can show a standard country under another name or flag: F.Y.R.
Macedonia for `MK` in a 2008 contest, Czech Republic for `CZ`, a globe for the
Rest of the World (`WW`). The country **keeps its code**, so everything keyed
by code is unaffected: odds, votes, relations, running orders, the allocation
draw, entry stats and both leaderboards (a renamed country's results still
count towards it, not towards a second entry). Only what the contest shows
changes. That is the difference from a custom entry, which gets its own
`custom-…` code and so its own stats.

Users asked for it as "changing names of participants (F.Y.R. Macedonia before
North Macedonia, Czech Republic before Czechia)" and "changing the flag of the
Rest of the World".

Three things feed a contest's overrides: **historical names** for the chosen
edition (on by default, §6), the account's **own defaults** for new contests
(§7), and the user's edits in the name and flag editor (§4), which can use an
**uploaded flag** (§5).

## 1. The model — `src/data/countries/entryOverrides.ts`

```ts
type EntryOverride = { name?: string; flag?: string };
type EntryOverrides = Record<string, EntryOverride>; // by country code
```

- Only **standard countries** (codes in `ALL_COUNTRIES`) can have one
  (`canOverrideEntry`); custom entries have their own editor.
- An override keeps only what differs from the built-in country
  (`normalizeEntryOverride`): an empty name, the built-in name or the
  country's own flag (`/flags/<code>.svg`) mean "as it ships", and an
  override with nothing left is removed.
- `flag` is one of:
  - **another country's flag**, as the flag picker names it (`/flags/yu.svg`).
    `countryFlagCode` turns it back into that code, so the theme's round and
    square variants, minimalistic flags and heart logos are drawn from that
    country's files (see §3);
  - **a preset** (`/flags/earth.svg`, the same list as custom entries);
  - **an image URL** (`https://…`): a flag the user uploaded in the editor
    (§5), or one of their custom entries' uploads or links. `data:` URLs (old
    custom entries' inlined flags) are not accepted: they're too big to
    repeat in a contest.
- `sanitizeEntryOverrides` applies the same rules to anything untrusted (a
  loaded contest, persisted state).

## 2. Where they live and how they reach the screen

`countriesStore.entryOverrides` (persisted in `countries-storage`) holds the
current contest's overrides.

- **`getAllCountries()`** returns the standard countries with the overrides
  applied (memoized per overrides map, `standardCountriesFor`), then the
  custom entries. Everything contest-scoped builds from it (the lineup, the
  start of a show, voters, the allocation draw, the hosting select), so names
  and flags flow into every copy (`EventStage.countries`,
  `votingCountries`, the winner) through the existing `name`/`flag` fields.
- **`getCanonicalCountries()`** is the same list as it ships. Use it on
  surfaces that span contests: entry stats and their picker, both
  leaderboards, the contests list (winner), Edit profile, relations, contest
  detail dialogs, and the flag picker's Countries tab.
- `getInitialVotingCountries` (a preset's voters, plus `WW`) applies them too.
- Components that memoize `getAllCountries()` must also depend on
  `entryOverrides` (the function's identity never changes): see
  `useLineupModel`, `useCountryAssignments`, `useAllocationDraw`,
  `useContestDirtyState`.

**Changing one** (`setEntryOverride(code, override | null)`,
`replaceEntryOverrides(map)`) redraws every copy already made, so nothing keeps
the old name: the setup stages' voters (`configuredEventStages`), the running
show (`eventStages`, `winnerCountry`) and every step of its undo/redo history
(zundo `pastStates`/`futureStates`, with recording paused so the redraw isn't a
step). `applyEntryOverride(country, next, previous)` restores the built-in name
or flag only for what the previous override set, so a name that came from
elsewhere (the 2004–2012 presets' "Turkey" voters) is left alone.

**Lifecycle**

- Saved in the snapshot as `setup.entryOverrides` (only when non-empty, every
  override, not just the line-up's), so the contest's dirty fingerprint sees
  them too.
- Loading a contest (`applyContestSnapshotToStores`, setup or simulation)
  replaces them with the contest's, before voters and stages are rebuilt; a
  contest without any shows every country as it ships.
- Switching the edition (`updateCountriesForYear`, also the Grand-Final-only
  switch) resets them with the line-up, to `freshEntryOverrides({ year,
  historicalNames, defaults })`: that edition's historical names, then the
  account's defaults on top, field by field (§6, §7). Seeding once, rather
  than layering at read time, keeps saved contests self-contained: a contest
  shows what it was saved with, whoever opens it.
- Next year (`applyNextYear`) keeps them, it's the same contest universe, but
  moves the historical names to the new year (`swapHistoricalNames`: from
  2018 to 2019, F.Y.R. Macedonia goes back to North Macedonia).
- The graphics studio's saved-contest rows (`resolveSnapshotCountries`) read
  them from the snapshot.

## 3. Flags and hearts — `getFlagPath`, `getHostingCountryLogo`

`flagSourceCode(country)` (`helpers/getFlagPath.ts`) says whose flag files draw
a country: its own code without `flag`, the referenced code for another
country's flag, and null for an image of its own (presets, URLs, every custom
entry with a flag). `getFlagPath` draws shapes from that code, and
`getHostingCountryLogo(ForImageGeneration)` looks the heart up by it: a
country shown with Sweden's flag gets Sweden's heart, one with a preset or an
upload gets no heart (its flag is drawn as is). Flag colours for the douze
animations and confetti are read from the rendered flag, so they follow.

## 4. The editor — `components/setup/entry-override/EntryOverrideModal.tsx`

Opened from a standard country's tile menu in the setup hub ("Edit name and
flag", `LineupActions.onEditEntryOverride`); when the country has an override
the menu also offers "Use the original name and flag". Rest of the World is a
tile in the pool's Rest of Europe category, so the same menu reaches it.

It's the custom entry editor's layout (DESIGN.md "Name and flag editor"): the
board-row preview (`EntryRowPreview` with the country's `code`, so the flag is
drawn in the theme's shapes), the name (prefilled with the current name, the
built-in one as placeholder, empty = built-in), Upload image with the same
hint line, staged-upload Undo and desktop drop as the custom entry editor,
the same `FlagPicker` (Your flags = uploaded flags and the linked flags of
the user's custom entries; Presets; Countries, with the country's own flag
ringed by default), and a "Use in my new contests" check (§7). The footer
(`EntryActionBar`) has a quiet "Use the original" while the draft differs
from the built-in country; Save is enabled only when something would change.

Save uploads a staged image first (`useUploadEntryFlagMutation`), then
stores the override with the upload's URL. A failed upload keeps the dialog
open with its error in the hint line and changes nothing. Uploading needs an
account ("Sign in to upload a flag." otherwise); everything else works signed
out.

## 5. Uploaded flags — `/entry-flags`

Custom-entry uploads are tied to an entry (`POST /custom-entries/:id/flag`)
and deleted once no entry uses them, so a contest's own flags have a library
of their own, in the backend's custom-entries module:

- `POST /entry-flags` (signed in, multipart `file`, at most 500 KB) checks the
  bytes (`entry-flag-file.ts` `sniffEntryFlag`: PNG, JPEG, WebP, or an SVG
  without script, event handlers or `foreignObject`), hashes them and stores
  `entry-flags/<userId>/<sha256 prefix>.<ext>` in R2 with an immutable cache
  header, plus an `EntryFlag` document (`userId`, `key`, `url`, `sha256`).
  The same image uploaded again returns the first one. 200 flags per account
  (`entry_flag_limit`).
- `GET /entry-flags/me` lists them, newest first (`useEntryFlagsQuery`,
  query key `['user', 'entry-flags']`, kept offline like the other account
  lists and cleared on logout). They show up under Your flags in both the
  name and flag editor and the custom entry editor (`collectYourFlags(entries,
  uploads)`; an upload no entry uses is labelled "Uploaded flag").
- They stay until the account is deleted (`CustomEntriesService.deleteAllForUser`
  → `EntryFlagsService.deleteAllForUser`): saved contests point at them by
  URL. There is no delete in the UI yet.

## 6. Historical names

`HISTORICAL_NAMES` (`entryOverrides.ts`) lists the names countries competed
under before a rename, with the last year of each:

| Code | Name | Until |
|---|---|---|
| MK | F.Y.R. Macedonia | 2018 (Prespa agreement in force from 2019; JESC 2018 still used it) |
| CZ | Czech Republic | 2022 (the broadcaster entered as Czechia from 2023) |
| TR | Turkey | 2022 (Türkiye from mid-2022) |

`historicalNamesFor(year)` gives a year's names. They are ordinary overrides
once seeded (the user can rename them again or use the original), and the
setting **Historical names** (`settings.useHistoricalNames`, Settings →
Contest, synced, on by default) decides whether new editions get them.
Flipping the switch (`SwitchItem.onChange`) also moves the open contest:
`swapHistoricalNames({}, names)` on, `swapHistoricalNames(names, {})` off.
`rebaseHistoricalNames` only removes a name that is still the period's own
and only adds one where the user has no name, so their own names and every
flag stay. Contests loaded from the account keep what they were saved with
(older ones have no historical names; they're not added on load).

## 7. The account's own defaults

`settings.defaultEntryOverrides` (synced with the account like the other
settings, kept on the device when signed out) holds the names and flags the
user wants in every new contest, by code. The editor's "Use in my new
contests" check sets the default to what Save stores (or removes it when the
country is back to its original). It starts ticked when the contest already
shows the country the way the default does; unticking it then removes the
default. Settings → Contest → "Your names and flags" (`EntryDefaultsList`)
lists them with a remove button; removing one leaves contests that use it
alone. Defaults win over historical names field by field (a default with
only a flag keeps the historical name).

## 8. Backend — `douze-points-backend/src/contests/entry-overrides.ts`

- `withSanitizedEntryOverrides` runs in `prepareSnapshot` (create and update):
  standard-looking codes only, names trimmed to 100 characters, flags limited
  to `/flags/<file>.svg` and `http(s)` URLs, at most 300 entries; the field is
  dropped when nothing in it is valid.
- `standardWinner` fills `Contest.winner` for a standard country: the code
  alone without an override, otherwise its name and flag. A renamed winner is
  always sent with a flag (its own `/flags/` path when only the name changed),
  because app bundles from before overrides draw a winner that has a `name`
  from `winner.flag` alone. `ContestListItem` reads `winner.name ?? built-in
  name` and `getFlagPath({ code, name, flag })`.
- Stats and leaderboards need nothing: they work by code.

Older app bundles ignore `setup.entryOverrides` (they show the built-in names)
and drop it if they re-save such a contest.

## 9. Not covered yet

- Deleting an uploaded flag from Your flags (contests that use it would lose
  it, so it needs the same "still in use" care as custom entries).
- An image link (rather than an upload) in the name and flag editor.
- The graphics studio's standalone flag element (picks a country by code and
  draws its built-in flag) and a short code of the contest's own for a
  renamed country (the sports-style code stays the country's). The hosting
  country's header logo does follow an override (`getHostingCountry` reads
  `getAllCountries`).
- More historical names: add a row to `HISTORICAL_NAMES` (and its test).
