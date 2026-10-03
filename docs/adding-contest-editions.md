# Adding contest editions (ESC / JESC / ESC Asia / new series)

Step-by-step guide for adding an official contest lineup to the **Contest** select of the Event Setup modal. Use it as a checklist: every step lists the files to touch and how to verify the result.

There are three tasks:

- **A. A new year of an existing series.** For example JESC 2027, ESC 2027 or ESC Asia 2027.
- **B. Updating an edition after new information arrives.** For example the semi-final results, the running order, odds or the spokesperson order.
- **C. A new contest series.** This is rare, for example a hypothetical "Eurovision Canada".

---

## 1. How contest editions work

| Concept | Where | Notes |
| --- | --- | --- |
| `ContestType` (`'esc' \| 'jesc' \| 'asia'`) | `src/data/contestTypes.ts` | Stored in `settings.contestType` (generalStore, persisted) and in saved snapshots as `setup.contestType`, only when it isn't ESC. |
| Contest key | `getContestKey` / `parseContestKey` in `contestTypes.ts` | The value of a select option and the key of its theme: `2026`, `JESC-2026`, `ASIA-2026`. ESC keys have no prefix. |
| Default contest name | `CONTEST_TYPE_NAMES` in `contestTypes.ts` | Written to `settings.contestName` when the user switches series ("Eurovision", "Junior Eurovision", "Eurovision Asia"). |
| Supported years per series | `src/data/data.ts`: `SUPPORTED_YEARS`, `JUNIOR_SUPPORTED_YEARS`, `ASIA_SUPPORTED_YEARS` | These lists build the select options (`ESC_YEAR_OPTIONS`, `JESC_YEAR_OPTIONS`, `ASIA_YEAR_OPTIONS`). |
| Select groups | `src/components/setup/hub/hooks/useContestField.ts` (`contestGroups`, `YEAR_OPTIONS`) | Groups are labelled "ESC", "JESC" and "ESC Asia". |
| Lineup data | `public/data/countries/{countries,junior-countries,asia-countries}-<year>.json` | Fetched at runtime by `buildCountriesUrl` in `src/data/countries/countriesDataUrl.ts`. **These JSON files are the source of truth.** |
| Hosting country and logo | `src/theme/hosting.ts`: `hostingLogosByYear`, `juniorHostingLogosByYear`, `asiaHostingLogosByYear` | Sets the select option icon and `settings.hostingCountryCode`. |
| Built-in theme (optional) | `src/theme/themes.ts` | Keyed by contest key. If a year has no theme, "sync theme to contest" leaves the current theme in place. |
| `Year` type | `src/config/index.ts` (`years`) | Lists ESC years. Other series cast their year strings to `Year`. |

Legacy data: settings and snapshots saved before `contestType` existed carry `isJuniorContest: boolean`. `resolveContestType()` maps that to `'jesc'` / `'esc'`. Never write `isJuniorContest` again.

---

## 2. The lineup JSON format

The file is either a plain array of countries or an object:

```jsonc
{
  "semiFinalVotingMode": "JURY_AND_TELEVOTE", // optional; StageVotingMode for the semi-finals
  "countries": [ /* BaseCountry[] */ ]
}
```

With a plain array, `semiFinalVotingMode` defaults to `TELEVOTE_ONLY`, which is correct for ESC 2004–2009 and 2023–2025. Use the object form when the semi-finals have a jury, as in ESC 2010–2022 and 2026.

Country entry (`BaseCountry` in `src/models/index.ts`; only the preset fields are listed):

| Field | Required | Meaning / rule |
| --- | --- | --- |
| `name` | yes | **Must match** the `name` in `src/data/countries/common-countries.ts`, for example `"North Macedonia"` or `"South Korea"`. |
| `code` | yes | ISO-like code from `common-countries.ts`, for example `"MK"`. |
| `category` | yes | Copy it from `common-countries.ts`, for example `"All-Time Participants"` or `"Asia"`. |
| `semiFinalGroup` | ESC with semis | `"SF1"` or `"SF2"`. The semi-final stages are created only when at least one country has this field. Leave it out for single-show contests (JESC, ESC Asia). |
| `isAutoQualified` | AQs | `true` for countries that go straight to the final: the Big Five plus the host in ESC, and **every** entry in single-show contests. |
| `aqSemiFinalGroup` | ESC AQs | The semi-final in which an auto-qualifier votes (`"SF1"` / `"SF2"`). This adds it to that semi-final's voters. |
| `isQualified` | yes | `true` if the entry is in the Grand Final. For a semi-finalist it is the **real** qualification result. Before the semi-finals have taken place, set it to `false` for every semi-finalist. In "Grand Final only" mode only the auto-qualifiers are then placed in the final. Set it to `true` for every entry in single-show contests. |
| `juryOdds`, `televoteOdds` | optional | 1–99 strength, derived from **real results** (see §5). **Leave them out before the contest takes place.** Missing values default to 50/50 (`resolveYearOddsFor` in `countriesStore.ts`). |
| `spokespersonOrder` | optional | 0-based order in which the juries are called in the final. Grand Final voters are sorted by it, and missing values count as `0`, so a stable sort keeps the file order. Leave it out until the order is announced. |

Order the array by the **official running order** when it is known, otherwise alphabetically by name. Note: the app does **not** read the running order from this file. The Running Order tab always starts A–Z (see `docs/running-order-and-tiebreaking.md`). The file order only affects the voter order when there is no spokesperson order.

Every `code` used in the file needs:

- an entry in `COMMON_COUNTRIES` (`src/data/countries/common-countries.ts`). Check with `grep -n "code: 'XX'"`.
- a flag at `public/flags/<code lowercase>.svg`. If the country is in the list of supported round or square flags in `src/helpers/getFlagPath.ts`, it also needs a flag in `public/flags-shapes/{round,square}/`.

If a country is missing, see §4.4.

Generate the file with a small script (for example Python) that looks up `name` and `category` in `common-countries.ts` by code, so you don't make typos. Do **not** use `yarn generate-countries-json`: it reads `COUNTRIES_<year>` TypeScript exports that no longer exist, and would skip every year.

---

## 3. Task A: a new year of an existing series

Example: JESC 2027 (single show).

1. **Collect facts** from Wikipedia ("Junior Eurovision Song Contest 2027") or eurovisionworld.com. Check each one against a second source when it matters:
   - the participating countries (artists and songs are **not** stored)
   - the host country
   - the format: semi-finals or a single show, and whether the semi-finals have a jury
   - the running order and spokesperson order, if known
   - the results and points, if the contest has already taken place
2. **Data file:** create `public/data/countries/junior-countries-2027.json` following §2. For an edition that hasn't taken place yet, leave out the odds and the spokesperson order.
3. **Supported years** in `src/data/data.ts`: extend the list.
   - JESC: `JUNIOR_SUPPORTED_YEARS` (`{ length: N }` starting at 2016). Increase `length` by 1.
   - ESC: `SUPPORTED_YEARS` (`{ length: N }` starting at 2004).
   - ESC Asia: `ASIA_SUPPORTED_YEARS`, an explicit array. Append the year.
4. **Hosting logo** in `src/theme/hosting.ts`: add `'2027': { code: '<host ISO>', logo: '/hostingCountryLogos/<file>' }` to the right map.
   - Look for an existing logo first: `ls public/hostingCountryLogos | grep -i <country>`. Files are named either `<Country><Year>.svg` (official ESC logos) or `Euro<Spanish country name>.svg` (generic hearts, for example `EuroTailandia.svg` or `EuroMalta.svg`).
   - Without a logo, the option shows the logo of the map's fallback year. Prefer adding an SVG.
   - Check that `code` is the **host country**, not a copy of the previous row. JESC 2026 once had `FR` with the Malta logo.
5. **ESC only, when the year is new to the whole app** (for example the first ESC 2027 entry):
   - Add `'2027'` to `years` in `src/config/index.ts`. `hostingLogosByYear` is a `Record<Year, …>`, so the type check then requires its entry.
   - Optionally move the app's **default** year. Update all of these together, or the document preload and the first load will disagree:
     - `INITIAL_YEAR` / `INITIAL_THEME_YEAR` in `src/state/generalStore.ts`
     - `INITIAL_COUNTRIES_URL` in `src/data/countries/countriesDataUrl.ts`
     - the first-visit `setInitialCountriesForYear('2026', …)` in `src/app/app-bootstrap.tsx`
     - the FOUC fallback `themeYear || '2026'` in `src/app/layout.tsx`
     - the fallback year in `getHostingCountryByYear` (`src/theme/hosting.ts`)

     Only do this when the user asks for it.
   - JESC and ESC Asia years do **not** need to be added to `years`.
6. **Cache-bust:** set `COUNTRIES_DATA_VERSION` in `src/data/countries/countriesDataUrl.ts` to today's date. The JSON is fetched with `cache: 'force-cache'`, so without this browsers keep stale data. Do this for **any** change to a countries JSON file.
7. **Theme (optional and separate):** a built-in theme for the edition is a separate design task. See `docs/theme-animations-and-specifics.md`. The edition works without one.
8. **User-facing copy:**
   - Add an entry at the top of `WHATS_NEW` in `src/components/feedbackInfo/data.ts`: `{ date: 'YYYY-MM-DD', title: 'Added JESC 2027' }`. This shows the "new updates" dot to users.
   - The guidebook in `messages/*.json` (9 locales) states the year range of each series, for example `"JESC (2016–2026)"`. Find it with `grep -n "2016–20" messages/*.json` and update every locale, then run `yarn gen:messages` (this regenerates `src/i18n/messagesManifest.generated.ts` and `public/messages/`).
9. **Verify** (§6).

## 4. Task B: updating an existing edition

Edit the JSON file and **bump `COUNTRIES_DATA_VERSION`** in every case.

- **After the semi-finals:** set `isQualified: true` for the qualifiers and `false` for the rest.
- **Spokesperson order announced:** add `spokespersonOrder` (0-based) to every voter. The browser snippet in `scripts/addSpokespersonOrder.ts` extracts the list from Wikipedia's "Spokespersons" section.
- **After the contest:** compute the odds from the real points with `scripts/calculateCountriesOdds.ts` (`yarn calculate-odds`):
  1. Paste the finalists' points (jury and televote split from 2016 on) and the non-finalists' points into the `finalists` / `nonFinalists` arrays in the script. The browser snippets in its header comment scrape them from eurovisionworld.com.
  2. Set `IS_JESC` to match the contest.
  3. Run it and copy each `juryOdds` / `televoteOdds` into the JSON. The scale is ESC finalists 20–99, JESC finalists 5–99, non-finalists 1–20, rounded to 0.5. There is no separate Asia scale: use `IS_JESC = true` (single show, no non-finalists).
  4. Revert the script's pasted data afterwards, unless the user wants it kept.
- **A country withdraws or joins:** remove or add its entry, following §2.

### 4.4 A country that isn't in `COMMON_COUNTRIES`

1. Add `Name: { name, code, category }` to `COMMON_COUNTRIES` (`src/data/countries/common-countries.ts`). Use the continent category, or `'All-Time Participants'` only for countries that have taken part in ESC.
2. Add `public/flags/<code>.svg`. Round and square variants are needed only if the code is added to the supported lists in `getFlagPath.ts`.
3. For a hosting country, add a logo (§3 step 4), or add a `countryDefaultHostingLogos` override in `hosting.ts`.

---

## 5. Task C: a new contest series

ESC Asia was added this way and is the reference implementation. Search for `asia` / `ASIA_` to see every place it touches.

1. `src/data/contestTypes.ts`:
   - extend `ContestType`
   - add a prefix to `CONTEST_KEY_PREFIXES` (for example `'CAN-'`)
   - add a default name to `CONTEST_TYPE_NAMES`
2. `src/data/countries/countriesDataUrl.ts`: add the file prefix to `COUNTRIES_FILE_PREFIXES`, for example `'canada-countries'`.
3. `src/data/data.ts`: add `<SERIES>_SUPPORTED_YEARS` and `<SERIES>_YEAR_OPTIONS` (copy `ASIA_YEAR_OPTIONS`).
4. `src/components/setup/hub/hooks/useContestField.ts`: add the options to `YEAR_OPTIONS` and add a group to `contestGroups`.
5. `src/theme/hosting.ts`: add a `<series>HostingLogosByYear` map and a branch in `getHostingCountryByYear`.
6. Check the series-specific rules that branch on `contestType`. `grep -rn "contestType ===\|contestType !==" src` lists them:
   - **Rest of the World voter:** `getInitialVotingCountries` in `src/state/countriesStore.ts` adds RoW unless the type is `jesc`, and only from 2023 on. Decide whether the new series has a RoW vote.
   - **404 fallback:** `loadCountriesByPreset` in `countriesStore.ts` falls back to the ESC file when a JESC file is missing. New series should **not** fall back.
7. Add the data files, the cache-bust, the copy and the verification as in Task A.
8. You don't need to change the backend: snapshot `setup` is stored as `Record<string, any>`.

Things that need no change: the snapshot save/load (`contestSnapshot.ts`), the dirty-state fingerprint (`contestFingerprint.ts`, `useContestDirtyState.ts`), the persisted settings migration (`generalStore.ts` `merge`) and theme sync (`syncThemeToContest.ts`). They all work with any `ContestType`.

---

## 6. Verification

1. `yarn lint:types-cli`: must pass.
2. `npx eslint <changed files>`: no **new** errors. Some touched files already have lint errors, so compare against the errors that were there before your change.
3. `npx vitest run src/helpers/contestFingerprint.test.ts src/i18n/messagesManifest.test.ts`. The manifest test fails if you edited `messages/*.json` without running `yarn gen:messages`.
4. Validate the JSON and the codes:

   ```bash
   python3 - <<'EOF'
   import json, re, os
   f = 'public/data/countries/junior-countries-2027.json'   # adjust
   src = open('src/data/countries/common-countries.ts').read()
   known = {m.group(2): m.group(1) for m in re.finditer(r"name: '([^']+)',\s*code: '([A-Z]{2})'", src)}
   d = json.load(open(f)); c = d['countries'] if isinstance(d, dict) else d
   for x in c:
       assert known.get(x['code']) == x['name'], x
       assert os.path.exists(f"public/flags/{x['code'].lower()}.svg"), x
   print(len(c), 'entries OK')
   EOF
   ```

5. **In the browser:** start `yarn dev` (port 3000) and use a **fresh isolated context**, because persisted Zustand state hides first-load bugs. Then:
   - Open the Contest select. The new option should be in the right group, with the right host logo.
   - Select it. The setup header should read "<Contest name> <year>" and show the expected participant count and stages. For a single show that is one stage, "Grand Final".
   - Run `JSON.parse(localStorage['general-storage']).state.settings`. It should show the expected `contestType` and `hostingCountryCode`.
   - In the Network panel, the expected `…-countries-<year>.json?v=<new version>` should be requested.
   - Press Start, open the Voters tab and press "Load year data". Rest of the World should be present or absent, as expected for the series.
   - Switch back to another series and year. The other series' lineup and theme should come back.

---

## 7. Pitfalls

- A missing `COUNTRIES_DATA_VERSION` bump means returning users keep the old JSON.
- A name in the JSON that doesn't match `common-countries.ts` causes subtle mismatches in lookups by name and in scraped-data scripts. Always generate the file from codes.
- `isQualified: true` on semi-finalists before the semi-finals have taken place puts them in the final in "Grand Final only" mode.
- Odds made up for an edition that hasn't taken place yet: leave the fields out instead. 50/50 is the intended default.
- Hosting `code` copied from the previous row instead of the real host.
- Writing `isJuniorContest` anywhere: it exists only for reading legacy data.
- Changing a fingerprint input (`generalInfo` in `contestFingerprint.ts`) without a migration makes every persisted loaded contest look "unsaved". See the `isLegacyContestType` handling in `generalStore.ts` `merge`.
