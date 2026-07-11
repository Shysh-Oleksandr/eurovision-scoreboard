# Voting Simulation Engine & Diaspora / Affinity Layer

This document describes the rework of how **random (predefined) votes** are simulated when
users don't vote manually — the new probability engine, the diaspora/affinity layer, the
rank-based odds input, the supporting data pipeline, and the plan for **Phase 2 (v2)**.

The whole thing was calibrated against **~20 years of real Eurovision results** so simulated
scoreboards resemble real ones in shape (winner margins, mid-table spread, nul-points, etc.).

---

## 1. The random-vote engine (Plackett–Luce)

**File:** `src/state/scoreboard/votesPredefinition.ts` → `predefineStageVotes(...)`.

Each participant has per-channel **odds** (`juryOdds`, `televoteOdds`, 1–99-ish, default 50). The
old engine multiplied `odds^exponent` and sampled with a temperature + a "baked luck" perturbation
— three overlapping, opaque knobs that fought each other. It was replaced by a structural
**Plackett–Luce (Gumbel-max) ranking sampler**.

### Model

For each voting country, each candidate `i` gets a latent quality:

```
theta_i = beta * ln(odds_i)  +  luckMag * N_i          (+ diaspora offset, see §2)
```

- A voter's ranking = sort candidates by `theta_i + Gumbel(0,1)` descending.
  (Adding Gumbel noise and taking the argsort **is** a draw from a Plackett–Luce distribution with
  weights `odds_i^beta`.) Top-N of that ranking receive the points system's values (12,10,8…1).
- `N_i ~ Normal(0,1)` is drawn **once per contest** and shared by every voter (a country's "luck"
  is consistent across the whole contest, as the old engine intended).

### The two knobs (each now has ONE clear job)

| Setting | Maps to | Effect |
|---|---|---|
| **Points Spread** (0–100) | `beta` (odds exponent) | How much odds separate countries — the *gaps*. |
| **Randomness** (0–100) | `luckMag` (shared luck shock) | How much the result *deviates from the odds* — the *unpredictability*. |

Exact mappings (`deriveEngineParams`):
- `betaJury  = 0.8 + s*3.0`  → 0.8 … **2.3** (default) … 3.8
- `betaTele  = 1.0 + s*3.2`  → 1.0 … **2.6** (default) … 4.2   *(televote is steeper = spikier)*
- `luckMag   = 2.6 * r**2.0` (convex): r=0 → favourite wins ~100%; r=0.5 → ~80% (modest);
  r=1 → ~22% (chaotic but favourite is still the best single bet).

### Jury vs televote differ *in kind*

Both are a **single** PL draw, but with different `beta`. Jury uses a lower beta → smoother,
consensual boards that rarely hand out nul-points (real juries rank everyone). Televote uses a
higher beta → spikier, more concentrated, more zeros. **Do not** average multiple juror draws —
that over-sharpens and manufactures zeros the data doesn't want (verified in `tunePlackettLuce.ts`).

### Voting modes

`JURY_ONLY`, `TELEVOTE_ONLY`, `JURY_AND_TELEVOTE`, and `COMBINED` are all supported. `COMBINED`
draws a jury ranking and a televote ranking per voter and merges them by **rank-sum** (tie-break by
televote), matching the pre-2016 single-vote regime. `allowMultiplePointsToSameEntry` samples the
point slots with replacement (independent PL draws).

### Calibration

The target is the **historical shape envelope** (`scripts/historicalShapeEnvelope.json`), a set of
scale-invariant metrics (Gini, winner margin, `max/median`, decay curve, zero-count, effective #
of contenders) averaged over 2016–2026 (split jury/televote) and 2003–2015 (combined). The default
knobs were tuned so the simulated jury/televote shapes land on those targets. See §6.

---

## 2. Diaspora / Affinity layer

**Files:** `src/state/scoreboard/diaspora.ts` (logic + settings), `src/data/diasporaPresets.json`
(data).

A **directed** affinity `affinity[from][to]` on a **−100…+100** scale captures how much one country
over- or under-votes another *beyond song quality* — neighbour blocs, migrant diaspora, and
rivalries. It's derived from 20+ years of real country-to-country votes.

### How it plugs into the engine

Affinity is a per-voter additive term on `theta` (i.e. a multiply on the candidate's selection
weight in log-space):

```
theta_{voter->i} += (affinity[voter][i] / 100) * K            (televote)
                 += (affinity[voter][i] / 100) * K * juryScale (jury)
```

- **`K`** comes from the **Strength** slider: `strengthToK = strength/100 * K_MAX(5)`. Default
  strength **60 → K≈3** (pairs clearly visible; e.g. Cyprus reliably gives Greece 12).
- **`juryScale = 0.35`** — diaspora is much weaker in juries. This isn't a guess: the data's own
  jury/televote residual ratio is ~0.36 (`extractDiaspora.ts`).

### The `betaTele` compensation (important, non-obvious)

Applied broadly, *positive* affinity **flattens** the televote board (everyone sprinkles extra on
friends, lifting the tail). To keep the aggregate shape matched to history, the engine bumps the
televote beta:

```
betaTeleBoost = clamp( BOOST_COEF(0.0019) * K * positiveAffinityLoad, 0, 1.2 )
```

Because it scales with the **actual** positive-affinity mass in effect, the aggregate Gini/max-median
stay on the historical target for *any* config (blocs-only, full historical set, custom) — diaspora
then only adds **pair realism**, never changes overall competitiveness. Verified end-to-end in
`compareDiasporaConfigs.ts` (all configs land on ~Gini 0.54 televote / 0.43 total).

### Data pipeline (how the presets were derived)

1. **`eurovisionVotes.json`** (repo root) — flattened directed votes, 2004–2025, finals + semis,
   split jury/televote for 2016+ (generated externally from the EurovisionAPI dataset).
2. **`scripts/extractDiaspora.ts`** → `scripts/diasporaAffinities.json` — the key statistic is
   **residual affinity**: for each voter, rank candidates by how much *everyone else* gave them
   (leave-one-out), assign the 12→1 scale, and the surplus `actual − expected` is the bias beyond
   merit. Recency- and round-weighted, filtered by significance. This controls for song quality
   (the thing a naive "who gives whom the most points" gets wrong).
3. **`scripts/curatePresets.ts`** + **`scripts/rebuildSpecialPairs.ts`** →
   `scripts/diasporaPresets.json` (copied to `src/data/diasporaPresets.json`).

### Preset structure & default

`diasporaPresets.json` has:
- **`groups`** (blocs): 8 named blocs (Nordics, Baltics, Ex-Yugoslavia, Benelux, DACH, Hellenic,
  Anglophone, Francophone), each a set of countries with data-derived intra-bloc directed pairs.
- **`specialPairs`**: the **top-40** most influential directed pairs by |affinity| (including
  rivalries/negatives), *excluding* pairs already covered by a default bloc.
- **`rivalries`**: legacy negative set (now folded into `specialPairs`; kept in JSON, not used by
  the default UI).
- **`broadPreset`**: all ~323 significant historical pairs (the "All historical pairs" set).

**Default = "blocs-core":** blocs on + special pairs on; **rivalries and the broad set OFF**. This
is a deliberate product choice — the aggregate shape is identical whether the full set is on or off
(the compensation absorbs it), so the blocs are the primary, understandable controls, and the full
historical set is an advanced opt-in.

### Resolution & precedence

`resolveAffinityMap(settings)` builds `affinity[from][to]`, layering **later-wins**:

```
broadPreset  <  enabled groups  <  specialPairs  <  custom blocs  <  user overrides
```

`resolveDiaspora(settings)` returns `{ affinity, affinityK, juryScale, betaTeleBoost }`, or `null`
when disabled / strength 0 (engine then behaves exactly as before this feature).

### Settings & the "overrides = single sink" model

`DiasporaSettings` lives at `settings.diaspora` (persisted via the general store):

```ts
{ enabled, strength, enabledGroupIds[], useSpecialPairs, useBroadPreset,
  overrides: { from, to, affinity }[],
  customGroups: DiasporaCustomGroup[] }   // Phase 2, see §9a
```

**Every per-pair edit** — tuning a bloc pair, a special pair, or a historical pair, or adding a
custom pair — writes into the single `overrides` array (which wins in the resolver). The UI shows
`override ?? presetValue`, and "Your pairs" lists the overrides with their "was <preset>" baseline.
Setting an override to `0` cancels an inherited bias. Writes go through **race-safe store actions**
`updateDiasporaOverride` / `removeDiasporaOverride` (mutating inside the store updater, so
concurrent edits can't clobber via stale closures).

---

## 3. Rank-based odds (drag-to-rank)

**File:** `src/state/scoreboard/rankToOdds.ts` (pre-existing; feeds the engine).

Users can set odds by dragging countries into a ranked order instead of typing numbers.
`rankOrderToOdds(order, pointsSpread)` interpolates odds linearly from a top value down to a bottom
value inside a band from `bandFor(pointsSpread)` (spread 0 → [50,73], 50 → [33,85], 100 → [13,98]);
`oddsToRankOrder` is the inverse for entering the mode.

> **Follow-up:** `bandFor`'s comments still reference the *old* `odds^exponent` engine (the band was
> kept narrow because the exponent amplified it). With the new `beta·ln(odds)` engine that coupling
> no longer applies, so the band widths could be revisited/re-tuned. Functionally it still works.

---

## 4. Odds & data sources

- Per-year odds ship in `public/data/countries/countries-<YEAR>.json` (`juryOdds` / `televoteOdds`).
  `scripts/calculateCountriesOdds.ts` normalises real per-year jury/televote totals into odds.
- `scripts/realHistoricalPointsData.json` — final scoreboards 2003–2026 (for the shape envelope).
- `eurovisionVotes.json` (repo root) — directed votes for the diaspora extraction.

---

## 5. The Relations settings UI

New **Relations** tab in the settings modal. Wired in `SettingsModal.tsx`; strings under
`messages/*.json → settings.relations` (English is the fallback base for all locales).

Components in `src/components/settings/relations/`:
- `MasterBlock` — enable toggle + Strength slider.
- `GroupCard` — a bloc: toggle membership, expand (animated, like `CollapsibleSection`) to tune
  member pairs, "Reset to data defaults".
- `PairListCard` — expandable Special-pairs and All-historical-pairs cards; the historical one is
  **lazy** (rows mount on first open), **searchable**, sorted by |affinity|, visible-row-capped, and
  **interactive even when off** (browse-and-tune; edits become overrides).
- `PairRow` / `OverrideRow` — one tunable directed pair (label + `DivergingSlider`), each subscribed
  only to its own override.
- `DivergingSlider` (−100…+100, centre-fill, sign-coloured), `ValueChip`, `DirectedPairLabel`,
  `RelFlag`, `AddPairEditor` (two searchable country pickers), `countryMeta` (code→name/flag,
  **including custom entries**).

**Phase 2 components** (shipped, see §9): `RelSegmented` (the compact Blocs | By-country and
Votes given | got switcher), `CustomGroupCard` (a user bloc — CUSTOM badge, enable toggle,
Rename / Add-member / Delete, generated member-pair sliders), `CreateBlocEditor` (name + members +
default-affinity draft), `CountryLens` (the by-country view — flag rail + favors/snubs lists driven
by `collectLensRelations`).

Diverging favor/snub/warn colours are fixed CSS vars scoped to `.relations-tab` in `styles.css`
(accent/panel/ink use the app's `primary-*` / `white/NN` theme tokens).

---

## 6. Dev tooling / scripts (how to re-run)

All run via `npx ts-node --files -P tsconfig.scripts.json scripts/<file>.ts` (a few have `yarn`
aliases: `analyze-history`, `analyze-sim`).

Shape calibration:
- `analyzeHistoricalShape.ts` → writes `historicalShapeEnvelope.json` (the targets).
- `shapeMetrics.ts` — shared scale-invariant metrics (used by every harness, so real vs sim are
  measured by identical code).
- `analyzeSimShape.ts [rand] [spread] [runs] [diaspora0|1]` — production engine vs history.
- `plSampler.ts` + `prototypePlackettLuce.ts` / `tunePlackettLuce.ts` / `tuneRandomness.ts` —
  standalone PL for beta / luckMag sweeps.

Diaspora:
- `extractDiaspora.ts` → `diasporaAffinities.json` (residual affinities + suggested groups).
- `curatePresets.ts` / `rebuildSpecialPairs.ts` → `diasporaPresets.json`.
- `validateDiaspora.ts`, `calibrateDiaspora.ts`, `compareDiasporaConfigs.ts`, `prototypeDiaspora.ts`
  — validation / betaTele-compensation calibration / config comparison.

---

## 7. Verification approach

The historical envelope doubles as a **golden target**: run `analyzeSimShape.ts` and confirm the
simulated jury/televote/total Gini, max/median, decay curve and zero-counts fall on the historical
means. This replaced the old eyeball-tuning of a magic exponent. When changing engine knobs or
adding presets, re-run it (and `compareDiasporaConfigs.ts` for diaspora) and check the shape holds.

---

## 8. Known limitations & open decisions

- **Televote zero-count** is slightly under history (~1.0 vs ~1.4). This is a minor, televote-only-
  reveal cosmetic; diaspora does **not** fix it (broad positive affinity actually reduces zeros).
  A future option: a small heavier-tailed tweak to the `odds → theta` map. Not worth it yet.
- **Seeded RNG** — the engine uses `Math.random()`, so re-simulating gives fresh results. A seeded
  option would make re-sims reproducible and enable exact (non-statistical) golden tests. Open.
- **Rivalries data** was weak/sparse in the raw extraction (countries that boycott rarely
  co-compete); some values were hand-tuned. Rivalries are now folded into the top-40 special pairs.
- **`rankToOdds` band** comments are stale vs the new engine (see §3).
- **Per-stage diaspora override** (mirroring `stage-points-system-override.md`) — not built.

---

## 9. Phase 2 (v2) — **shipped**

Phase 1 shipped **blocs + special pairs + the historical browser + per-pair overrides**. Phase 2
added the two advanced surfaces from the original design (Variant D): **custom blocs** and the
**by-country lens**. Both are now implemented — this section documents what was built.

**Design handoff:** `currentTask/design_handoff_relations_tab/` (README + `relations-*.jsx`) had the
full spec for `CustomGroupCard`, `CreateBlocEditor`, and `CountryLens` — re-expressed with the app's
real primitives (as in Phase 1).

**Two product decisions taken during the build:**
- **Custom blocs have a working on/off toggle**, so `DiasporaCustomGroup` carries an `enabled`
  boolean (the design showed the toggle; the original type sketch omitted it). Off ⇒ its pairs stop
  applying but the bloc is kept; Delete removes it.
- **New UI strings live in `messages/en.json` only**; the other 8 locales fall back to English via
  `deepMergeMessages` in `src/i18n/request.ts`.

### 9a. Custom blocs

Let users create their own bloc from any countries, generating tunable directed member pairs.

- **Data model** — `DiasporaSettings.customGroups: DiasporaCustomGroup[]`
  (`src/state/scoreboard/diaspora.ts`):
  ```ts
  export type DiasporaCustomGroup = {
    id: string; name: string; memberCodes: string[];
    base: number;                 // affinity applied to every ordered member pair
    enabled: boolean;             // on/off toggle (decision above)
    pairs?: DiasporaOverride[];   // optional per-pair tweaks within the group
  };
  ```
  `DEFAULT_DIASPORA_SETTINGS.customGroups = []`. **Persisted state is guarded** with
  `s.customGroups ?? []` everywhere (the store's `merge` is shallow, so a returning user's persisted
  `diaspora` can lack the field). IDs come from `newDiasporaGroupId()`.
- **Resolver** — `resolveAffinityMap` layers custom groups **after** presets and **before** the
  `overrides` loop (so explicit overrides still win): for each *enabled* group, `set(a, b, base)`
  over every ordered member pair, then apply its `pairs`. `resolveDiaspora` /
  `positiveAffinityLoad` / `betaTeleBoostFor` are untouched (they run on the resolved map, so the
  shape compensation auto-accounts for custom mass).
- **Store** — race-safe actions mirroring the override actions:
  `addDiasporaCustomGroup` / `removeDiasporaCustomGroup` / `updateDiasporaCustomGroup`
  (rename, toggle, membership, base — shrinking membership `pruneGroupPairs` the tweaks) /
  `updateDiasporaCustomGroupPair` (upserts into that group's `pairs`).
- **UI** — `CustomGroupCard` (clones `GroupCard`: CUSTOM badge, enable toggle, header **Add-member
  (+)** and **Edit (pencil)** buttons, removable member chips, generated `k·(k−1)` member-pair
  sliders), `CustomGroupEditModal` (the pencil opens it — rename input + Delete-bloc button, built
  on the shared `Modal`, overlay `z-[1002]` to sit above the settings modal), and `CreateBlocEditor`
  (name input, member chips + a `CustomSelect` country picker, a "default affinity" `DivergingSlider`,
  live "N countries → N·(N−1) pairs" count). The create draft lives in local state until Create
  commits. Member-pair edits write to `customGroups[].pairs` (not global overrides).

### 9a-bis. Account persistence of relations settings

A whitelisted slice of client settings syncs to the logged-in user's profile — the diaspora
settings plus other global app/UX preferences. The **section-keyed** blob is
`{ settings, presentation, confirmations }`.

- **What syncs** (`src/state/syncedSettings.ts` — `SYNCED_SETTINGS_KEYS` / `SYNCED_PRESENTATION_KEYS`
  are the single source of truth; adding a synced setting is a one-line change):
  - `settings`: `diaspora` + the whitelisted global toggles (display/UI, audio, and voting/reveal
    *habits* — see the key list).
  - `presentation`: `presentationSpeedSeconds` / `presentationJuryGrouping` /
    `pauseAfterAnimatedPoints` / `scoreboardMobileLayout` (not the transient `isPresenting`).
  - `confirmations`: the whole `useConfirmationStore.preferences` ("don't ask again") map.
  - **Deliberately excluded:** contest-bound fields (points systems, `randomnessLevel`,
    `pointsSpread`, `splitPointsSystem`, `allowMultiplePointsToSameEntry`, odds, contest identity) —
    they're restored from a loaded contest, so syncing them would let a contest-load overwrite and
    then re-save your account default; device-local `customBgImage`/`shouldUseCustomBgImage`;
    per-export `imageCustomization`; and language (already on `profile.preferredLocale`).
- **Backend** (`douze-points-backend`): a free-form `preferences` blob on the Profile schema, with
  `GET`/`PATCH /profiles/me/preferences` (`UpdatePreferencesDto` declares the `settings` /
  `presentation` / `confirmations` sections; the global `whitelist` ValidationPipe drops anything
  else). `PATCH` merges at the section level.
- **Frontend**: `syncedSettings.ts` (`UserPreferences` type + `toUserPreferences` / `pickKeys` /
  `applyUserPreferences` / `mergeDiasporaPreference`), `useMyPreferencesQuery` /
  `useUpdatePreferencesMutation` in `api/profiles.ts` (keyed `['user','preferences']`, so
  login-invalidation refetches it and logout clears it), and the headless **`SyncUserPreferences`**
  (mounted in `app/providers.tsx`). On login it hydrates from the account (**server-wins** if it has
  data, else **seeds** the account from local); on change it **debounced-saves**. The save guard is
  **value-based on the serialized whitelisted slice**, so a hydrate can't swallow a real edit *and* a
  contest-load mutating contest-bound fields never triggers a save. Logged out it's a no-op — local
  `persist` still keeps everything on the device.
- **Custom blocs are account-only.** Creation is gated on `!!user` (a sign-in hint replaces the
  create button when logged out). On **logout**, `customGroups` is dropped but the rest of the
  diaspora settings (custom pairs, toggles, strength) stays and keeps persisting locally.

### 9b. By-country lens

A secondary read/tune view over the *same* data, filtered to one country.

- A **segmented switcher** (`RelSegmented`: Blocs | By country) sits in the browse-area header
  (Blocs stays default); the Curated + Your-pairs sections stay unchanged below in both modes.
- `CountryLens`: a searchable flag rail of every country that appears in any relationship (sorted by
  relationship count); a country header (favors/snubs counts + a "Votes given | Votes got" segmented
  toggle); two grouped lists (Favors/Snubs) of tunable rows with a source label (which
  bloc/special/rivalry/custom the value came from).
- **Derivation** is `collectLensRelations(settings)` in `diaspora.ts` — the same later-wins layering
  as `resolveAffinityMap` (enabled groups, special pairs, rivalries, enabled custom groups, then
  overrides), tagging each pair with its source. No second copy of the data. It **deliberately
  excludes the broad historical set** (323 pairs would swamp the rail and carry no per-pair source).
- Lens edits route through `updateDiasporaOverride` (the single overrides sink), so tuning a row in
  the lens creates/updates a global override, exactly like Phase 1's per-pair edits.

### 9c. Preset data polish (optional)

If desired before/with v2: hand-set a few obviously-real pairs that fell below the significance
cutoff and strengthen the sparse rivalries so the defaults "feel right"; re-run `rebuildSpecialPairs`.

### 9d. Broad ↔ blocs interaction (already handled in v1, keep in mind)

When "All historical pairs" is enabled it subsumes the blocs (broad < groups in the resolver, so
blocs still win for their pairs, but a *disabled* bloc's pairs are still supplied by broad). v1 shows
a note explaining this. If v2 wants a true per-bloc "mute" that subtracts from the broad set, that
needs an explicit exclusion mechanism in the resolver.
