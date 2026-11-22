## Page Routes

| Route | View | Purpose |
|-------|------|---------|
| `/` (main) | `Main.tsx` | The single-page app core -- setup + simulation |
| `/about` | `About.tsx` | Google OAuth2 disclosure, copyright, contact info |
| `/privacy` | `PrivacyPolicy.tsx` | Privacy policy page |
| `/admin/errors` | Admin-only | Error monitoring dashboard |
| `/api/image-proxy` | API route | Proxies images (for CORS) |
| `/api/locale` | API route | Locale detection |

The app is essentially a **single-page application** -- everything happens at `/`. The other pages are secondary/legal. `/about`, `/privacy`, `/admin/errors` and `/dev/*` are `page.web.tsx` files: website-only, left out of the native apps' export (`docs/native-apps.md`).

---

## Navigation & Layout Structure

**There is no persistent header, sidebar, or footer.** The entire UI is modal-driven from the main page:

1. **Root layout** (`app/layout.tsx`): Providers, FOUC prevention script, toast root, analytics. No nav bar.

2. **`PageWrapper`**: Full-screen background with the active theme's background image/colors.

3. **Two states on the main page:**
   - **No simulation active (shouldn't happen normally)**: A single centered "Open Setup" button
   - **Simulation active**: `SimulationHeader` + `PhaseActions` + `Board` + `ControlsPanel` + `PresentationPanel`

4. **`SetupHeader`** (inside the EventSetupModal): This is the closest thing to a "navbar" and contains:
   - **Contest year dropdown** (ESC 2004-2026, JESC, quick-select user contests)
   - **Theme dropdown** (year themes + user custom themes)
   - **Sync theme button** (when theme is out of sync with year)
   - **Settings gear icon** (opens SettingsModal)
   - **GuideButton** (`BookOpen` icon, opens GuideModal — 5-tab feature guide)
   - **FeedbackInfoButton** (info/megaphone icon, top-right; pulsing dot when new updates exist)

5. **Copyright footer**: A simple `© Copyright` line at the bottom of the setup modal content.

---

## Comprehensive Feature Inventory

### 1. Event Setup (`components/setup/`)

- **Year/Contest selection**: Dropdown supporting ESC 2004-2026, JESC 2016-2025 editions, and user-saved custom contests with quick-select
- **Grand Final Only toggle**: Reduces the event to GF only (no semi-finals)
- **Theme selection**: Year-based themes (2004-2026), JESC themes, user custom themes, quick-select saved themes, sync button
- **Country assignment**: Moving countries between stages (Semi-Final 1, Semi-Final 2, GF, Not Participating, Not Qualified)
- **Flexible stage creation** (`EventStageModal`): Create unlimited custom stages (Heats, Quarter-finals, etc.) with:
  - Custom stage name
  - Voting mode per stage: **Jury + Televote** (two separate rounds), **Televote only**, **Jury only**, **Combined** (both in one round per country)
  - Who goes through (qualifier targets): "How many" (N entries advance) or "Which places" (different place ranges go to different follow-up stages); the editor reads the result back in one line and names gaps and overlaps while you type
- **Stage reordering** (`StageReorderModal`): Drag-and-drop reorder of stages
- **Custom country/entry creation** (`CustomCountryModal`, `setup/custom-entry/`): Add fictional or non-standard entries; a live preview draws the entry as the theme's board row; one flag picker (your flags, presets, country flags, an upload or an image link); its colours ("From the flag", or up to three picked by hand, used by the douze animations' flag colours and the winner confetti: `data/countries/entryColors.ts`); "Add another" for making many in a row; the + on a group's header starts an entry in that group. Design rules in DESIGN.md "Custom entry editor"
- **Custom entry categories**: Organize custom entries into groups
- **A country's own name and flag in a contest** (`EntryOverrideModal`, a standard country's tile menu → "Edit name and flag"): F.Y.R. Macedonia for North Macedonia, a globe for the Rest of the World. The country keeps its code, so its stats stay one entry; saved with the contest (`setup.entryOverrides`). See `docs/entry-overrides.md`
- **Bulk selection**: Multi-select entries in a section and move them in bulk to another stage (`SectionMultiselectContext`)
- **Not Participating section**: Manage excluded countries, create custom entries
- **Stage setup** (`PostSetupModal`, `setup/post-setup/`), opened by Start before each stage, in the libraries' frame (the stage's name, four tabs, ×; the footer reads the stage back beside Start, and closing asks only when something changed). Design rules in DESIGN.md "Stage setup":
  - **Running order**: the theme's board rows in two columns reading down; drag to reorder; the Order menu (A to Z, Z to A, Shuffle, Draw / Remove halves, Back to the saved order) leaves a line with Undo; halves are the two columns; Share opens the running order as an image
  - **Voters**: numbered in spokesperson order, with an Add voters column (search, groups) beside them or a sheet on phones; Set voters replaces the list (the year's real voters, this stage's entries, other stages', every entry), sorts or clears it, with Undo; Channels turns the list into a Jury / Televote table (`docs/voter-channels.md`); "Rest of the World" can be added
  - **Odds**: Settings' Odds tab on a per-stage draft (`docs/stage-odds-override.md`)
  - **General**: voting mode (with its hint), predefined votes for the stage, and the stage's points (says whether they're Settings' or its own)
- **Voting Predefinition** (`VotingPredefinitionModal`): Pre-define all votes before simulation, with:
  - Full voting table (voter x country matrix) — used to actually run the simulation
  - Totals tab (enter total points per country directly) — share-only, not usable for simulation
  - Presets: Save/Load/Delete named presets (stored locally in the browser via `votingPresetsStore`)
  - Share predefined results as image or stats
  - Sort by points or alphabetically

### 2. Widgets Section (`components/setup/widgets-section/`)

Three widget cards in the setup modal (Themes, Contests, Graphics). Profile
moved to the header cluster as an identity button (`hub/ProfileButton.tsx`:
avatar, name and followers count; "Sign in" when signed out).

#### Profile (header button)
- **Google OAuth2 login/logout**
- **Profile modal** with two tabs:
  - **Your Profile**: View profile header (avatar, display name, follower count), your custom themes, your contests
  - **Following feed**: Activity feed from followed users
- **Edit profile modal**: what other fans see (picture, name, @username, country), saved with Save; hints under each field, errors in all nine languages
- **Account modal** (Profile → Account): sign-in methods, blocked users, Log out, Delete account; every action applies at once, so it has Close but no Save
- **User Profile modal** (other users): View public themes, contests, follow/unfollow

#### Themes Widget
- **Themes modal** (`widgets-section/library/` frame, see DESIGN.md "Libraries") with three places:
  - **Yours**: your custom themes, in groups, with the theme in use on top and New theme
  - **Saved**: other people's themes you saved
  - **Community**: everyone's public themes; Sort by, Created and Includes (audio, custom fonts, background video)
- **Custom Theme Builder** (`CustomizeThemeModal` - 1405 lines!): Extensive customization:
  - Primary hue/shade color picker
  - Background image URL
  - Font selection
  - Color overrides for: ranking colors (per state), background colors with opacity, gradient support
  - Flag shapes, points container shapes
  - Rounded country container (2026 style)
  - Jury points panel rounding, underline removal
  - Uppercase entry names toggle
  - Hover effect customization
  - Douze points animation, and **Customize animation** for each of them: its colours (the douze colours live here, not in Colors; flag colours; custom for ESC 2022), speed (0.5–2×), which parts play, hearts over the flag, and for ESC 2022 glow and veil strength and the veil's colour; every change replays on the preview — see `theme-animations-and-specifics.md` §10
  - **Sound effects**: Custom sounds for point reveals with delay control
  - **Simulation background audio**
  - Interface font + optional separate scoreboard font, from built-in fonts or the **font library** (upload your own WOFF2/WOFF/TTF/OTF, reuse across themes, add other users' public fonts) — see `custom-fonts-and-font-library.md`
  - Live preview with `ThemePreviewCountryItem`
- **Theme sharing** (`ThemeShareModal`): Share by link, view shared themes
- **Theme duplication**: Copy and customize existing themes
- **Like/save themes**

#### Contests Widget
- **Contests modal** (same frame) with three places:
  - **Yours**: your saved contests, in groups, with the loaded contest on top, Save current contest and Your entry stats
  - **Saved**: other people's contests you saved
  - **Community**: everyone's public contests; Sort by and Created, and the Country leaderboard
- **Create Contest modal**: Save current simulation setup + results as a contest with:
  - Name, description, year, venue, hosts
  - Hosting country selection
  - Theme association
  - Public/private toggle
- **Load Contest modal**: Load a contest's general info, setup, or full simulation
- **Contest sharing** (`ContestShareModal`): Share by link
- **Global Country Leaderboard** (`GlobalLeaderboardModal`): Aggregated country rankings across all users' completed public contests with sortable columns, year range filtering
- **My Leaderboard** (`MyLeaderboardModal`): Personal country statistics from your own completed contests
- **Country Stats** (`CountryStatsModal`/`CountryStatsPickerModal`): Per-country performance stats across contests

#### Graphics Widget (beta)
- **Graphics modal** with tabs: **My designs** (drafts kept in this browser, with the published copy's Public/Private chip), **Explore** (built-in starters + every public community design), **Saved**
- **Design editor** and **Publish**: public by default (listed in Explore for everyone to use and remix) or private; fillable fields are optional — see `graphics-studio.md`

### 3. Simulation (`components/simulation/`)

- **Scoreboard Board** (`Board.tsx`): The main scoreboard with animated country items showing:
  - Country flags (heart icons, round flags, square flags, minimalistic flags)
  - Entry names (artist/song)
  - Points (jury + televote + total)
  - Rankings with rank change indicators
  - Animated reordering (GSAP)
  - DouzePoints animation for 12-point awards (custom trigger per point value)
  - Count-up points animation
  - Two-column mobile layout option

- **Simulation Header** (`SimulationHeader.tsx`): Top bar with:
  - Phase title (e.g., "Semi-Final 1 - Jury Voting")
  - Hosting country logo
  - **Cancel simulation** button (with confirmation)
  - **Undo** button (temporal state history, up to 100 states)
  - **Restart** button
  - **Share** button (opens ShareResultsModal)
  - **Setup** button (reopen setup modal)

- **Controls Panel** (`ControlsPanel.tsx`): Voting interface with:
  - Current voting country info (flag, name) during jury voting
  - **Voting buttons**: Click country items on the board to award points
  - **Voting points info panel**: Shows which jury points are being given
  - **Televote input**: Manual televote point entry

- **Presentation Panel** (`PresentationPanel.tsx`): Auto-play mode with:
  - Play/Pause button
  - Speed slider (0.5s - 7.5s between actions)
  - Points grouping: Individual vs Grouped jury points
  - Pause after animated points toggle
  - One-column / Two-column layout toggle (mobile)

- **Phase Actions** (`PhaseActions.tsx`):
  - "View Stats" button (opens FinalStatsModal)
  - "Show NQs" toggle (show non-qualifiers after event)
  - Stage selector dropdown (view results from any stage)
  - "Continue to [next phase]" button

- **Qualification** subsystem:
  - **Pick Qualifiers mode**: Select qualifiers without awarding points
  - **Qualification Results modal**: Shows who qualified
  - **Split Screen Qualifier Reveal** (`SplitScreenQualifierModal`): ESC 2025-style dramatic reveal with configurable candidate count (2-6)
  - **Qualification Board**: Specialized board for qualifier selection

- **Winner celebration**:
  - **Winner Modal** (`WinnerModal.tsx`): Sparkle effects, flag display, points, delay-open animation
  - **Winner Confetti** (`WinnerConfetti.tsx` → `effects/confetti/ConfettiShower.tsx`): canvas confetti drawn with the user's amount, duration, fall speed and colours (Rainbow, the theme's accents, or the winner's flag read off its image by `confettiColors.ts`, or a custom entry's own colours); `confettiPlan.ts` maps the settings to react-confetti options. It marks `isWinnerAnimationAlreadyDisplayed` once the last piece has fallen

- **Final Stats** (`finalStats/`, `FinalStatsModal`; look in DESIGN.md "Stats modal"):
  - **Summary** (opens first, `SummaryView`): the result with total, jury and televote points and places, and a jury / televote bar under each name
  - **Split** (`SplitView`): the total, jury and televote rankings side by side (one at a time below 720px); pointing at an entry lights it in all three
  - **Breakdown** (`BreakdownView`): every voter × every entry with Total / Jury / Televote; frozen header row and country column, shading by points, a crosshair and a line that spells out the hovered or tapped vote; spreadsheet Export on the website
  - Stage picker once two stages have finished; rankings for Summary and Split in `statsRankings.ts`
  - **Share Stats** as image (the share image draws its own tables: `SummaryStats`, `SplitStats`, `StatsTable`)

- **Share Results** (`share/`):
  - **ShareResultsModal**: the scoreboard (or a running order) as an image, ready to save when the modal opens:
    - Format: Wide (1200 × 630), Square, Tall
    - Title and subtitle, all countries / top 10 / a custom number
    - Places, points and short names on or off
    - Columns and row size, Auto by default
    - Save image, Share (system sheet), Copy image (desktop browsers)
    - "Open in the graphics editor" for fonts, sizes and spacing
  - **ShareStatsModal**: the same modal for the stats tables (table switch, background picture, grid lines). Both share one frame, `ShareImageModal`; see `docs/graphics-studio.md` §6

- **Keyboard shortcuts** (`src/shortcuts/`, `SimulationShortcuts.tsx`): Space for Random, N / V / F for the random scopes, ⌘Z / Ctrl+Z undo, R restart (asks first), Enter continue, S setup, P present, M minimal view, T stats, ? for their settings, ⌘S / Ctrl+S to start a stage. Buttons show the key in a corner on the website with a mouse or trackpad; Settings → Keyboard shortcuts changes any key or turns them off. See `docs/keyboard-shortcuts.md`.

### 4. Settings (`components/settings/`)

Three tabs: **General**, **Odds** and **Relations**, in the libraries' frame: the title with the tabs beside it and × in the header; on phones the tabs sit in a bar at the bottom (`SettingsModal.tsx`, `common/SegmentedTabs.tsx`).

#### General Settings - Contest Section
- Contest name (Eurovision / Junior Eurovision)
- Contest year
- Contest description
- Hosting country selection (searchable dropdown)
- Show hosting country logo toggle

#### General Settings - Voting Section
- **Points system configuration**: Custom point values, add/remove points, predefined system presets (default, ESC pre-2016, etc.)
- **Split points system**: Different point scales for jury and televote
- Pick qualifiers without awarding points
- Split screen qualifier reveal mode (with candidate count)
- Split screen for last qualifier
- Televote reveal order (lowest-to-highest, like ESC 2016-2018)
- Limit manual televote points
- Group random jury voting
- Enable predefined voting
- Presentation mode toggle
- Auto-start presentation
- Randomness level slider (0-100) for odds

#### General Settings - UI Preferences
- Language selector (8 languages)
- Heart flag icons toggle
- Always show rankings
- Rank change indicator
- Qualifiers popup toggle
- Winner popup toggle
- Winner confetti toggle, with amount, duration, fall speed, colours and a Preview button
- Fullscreen mode
- Jury voting progress bar
- Blur modal background
- Minimalistic flags (round/square)
- Hide voting hints
- Winter effects (snowfall) with intensity slider
- Override theme font + font selector
- **Audio preferences**:
  - Disable all theme audio
  - Hide sound volume HUD
  - Theme sound volume (0-100%)
  - Theme ambience volume (0-100%)

#### General Settings - Confirmations
- Per-action confirmation toggles

#### Odds Settings (`OddsSettings.tsx`, `settings/odds/`)
- Laid out like the simulation: the countries on the left, one column of controls on the right that stays put; below 700px the column folds above the list and the two sliders into combos
- **Numbers**: a table with Jury and Televote columns; headers sort (A–Z, highest first) on click; Enter / ↓ / ↑ move down and up a column; either decimal mark; empty counts as 50; values over 1000 become 1000
- **Ranking**: the countries as the theme's board rows with their real odds in the points box; dragging one (or Space, arrows, Space) re-spaces that channel's odds by the order and Points spread
- **Set all odds** menu: Default odds (the year's, from the real results), Even odds (all 50), Random odds, copy jury ↔ televote; every bulk change and every drop can be undone from the line it leaves
- Randomness and Points spread sliders
- The same tab is Edit stage → Odds on a per-stage draft, where "Global odds" leads the menu (`docs/stage-odds-override.md`)

### 5. Feedback & Info (`components/feedbackInfo/`, `components/guide/`)

- **FeedbackInfoButton**: Icon button with "new updates" indicator (pulsing dot); lazy-loads `FeedbackModal`
- **FeedbackModal** with three tabs:
  - **Feedback**: Bug report instructions (GitHub Issues link, email), GitHub Discussions link, translation issue reporting
  - **What's New**: Chronological changelog (extensive, going back to June 2025)
  - **Upcoming Features**: Roadmap items with approximate dates
- **GuideButton**: `BookOpen` icon button in SetupHeader; lazy-loads `GuideModal`
- **GuideModal** with five tabs (all content driven from `messages/en.json` under `"guide"`):
  - **Start**: App overview / full flow walkthrough, sign-in & what it unlocks, saving contests, custom entries
  - **Setup**: Year data, country assignment, GF Only, custom stages, voting modes, voting countries, running order
  - **Voting**: Custom points system, predefined voting, odds, presentation mode, pick qualifiers, more options
  - **Themes**: Year themes & sync, community themes, custom theme builder, sound effects, visual details
  - **More**: Final stats, split stats, share scoreboard, share stats, leaderboard, my stats, following, UI preferences, confirmations, language, feedback

### 6. Effects (`components/effects/`)
- **SnowfallAnimation**: Falling snow particles
- **SnowPileEffect**: Decorative snow accumulation on UI elements

### 7. Floating UI (`components/floating/`)
- **ThemeSoundVolumeHud**: Floating volume control that appears when custom theme sounds are active

### 8. State Stores Summary

| Store | Purpose |
|-------|---------|
| `scoreboardStore` | Event stages, voting state, current stage, winner, undo history (temporal), predefined votes, country points |
| `generalStore` | Year, theme, custom theme, settings (all UI/voting/contest prefs), points system, presentation settings, image customization, active contest, profile user navigation |
| `countriesStore` | Country data per year, event assignments, configured stages, custom countries, odds, voting countries |
| `useAuthStore` | JWT auth, Google OAuth, user profile, login/logout/refresh |
| `confirmationStore` | Confirmation dialog state |
| `votingPresetsStore` | Saved voting presets |
| `statsCustomizationStore` | Stats display customization |

### 9. Social Features
- Google OAuth2 login
- User profiles (view/edit)
- Follow/unfollow users
- Following activity feed
- Public theme browsing & liking
- Public contest browsing
- Share by link (themes, contests, profiles)
- Global country leaderboard (aggregated across all public contests)
- Personal country leaderboard (from own contests)

### 10. Internationalization
- 8 languages supported via `next-intl`
- Translation files with extensive key coverage

---
