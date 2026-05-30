## Page Routes

| Route | View | Purpose |
|-------|------|---------|
| `/` (main) | `Main.tsx` | The single-page app core -- setup + simulation |
| `/about` | `About.tsx` | Google OAuth2 disclosure, copyright, contact info |
| `/privacy` | `PrivacyPolicy.tsx` | Privacy policy page |
| `/admin/errors` | Admin-only | Error monitoring dashboard |
| `/api/image-proxy` | API route | Proxies images (for CORS) |
| `/api/locale` | API route | Locale detection |

The app is essentially a **single-page application** -- everything happens at `/`. The other pages are secondary/legal.

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
  - Qualifier targets: count-based (N entries advance) or rank-based (different rank ranges go to different follow-up stages)
- **Stage reordering** (`StageReorderModal`): Drag-and-drop reorder of stages
- **Custom country/entry creation** (`CustomCountryModal`): Add fictional or non-standard entries with custom flags, reuse existing flags
- **Custom entry categories**: Organize custom entries into groups
- **Bulk selection**: Multi-select entries in a section and move them in bulk to another stage (`SectionMultiselectContext`)
- **Not Participating section**: Manage excluded countries, create custom entries
- **Post-Setup Modal** with two tabs:
  - **Running order**: Drag-and-drop reorder, quick sort options, share running order as image
  - **Voters**: Select/manage which countries vote in each stage, including "Rest of the World"
- **Voting Predefinition** (`VotingPredefinitionModal`): Pre-define all votes before simulation, with:
  - Full voting table (voter x country matrix) — used to actually run the simulation
  - Totals tab (enter total points per country directly) — share-only, not usable for simulation
  - Presets: Save/Load/Delete named presets (stored locally in the browser via `votingPresetsStore`)
  - Share predefined results as image or stats
  - Sort by points or alphabetically

### 2. Widgets Section (`components/setup/widgets-section/`)

Three widget cards in the setup modal:

#### Profile Widget
- **Google OAuth2 login/logout**
- **Profile modal** with two tabs:
  - **Your Profile**: View profile header (avatar, display name, follower count), your custom themes, your contests
  - **Following feed**: Activity feed from followed users
- **Edit Profile modal**: Change display name, profile picture
- **User Profile modal** (other users): View public themes, contests, follow/unfollow

#### Themes Widget
- **Themes modal** with tabs:
  - **Your Themes**: List of user-created custom themes
  - **Public Themes**: Browse community-shared themes
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
  - **Sound effects**: Custom sounds for point reveals with delay control
  - **Simulation background audio**
  - Interface font selection
  - Live preview with `ThemePreviewCountryItem`
- **Theme sharing** (`ThemeShareModal`): Share by link, view shared themes
- **Theme duplication**: Copy and customize existing themes
- **Like/save themes**

#### Contests Widget
- **Contests modal** with tabs:
  - **Your Contests**: User's saved contests
  - **Public Contests**: Browse community contests
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
  - **Winner Confetti** (`WinnerConfetti.tsx`): Canvas confetti animation

- **Final Stats** (`finalStats/`):
  - **Breakdown tab**: Full voting breakdown table (who gave what to whom)
  - **Split Stats tab**: Jury vs Televote comparison
  - **Summary Stats tab**: Aggregate statistics
  - **Share Stats** as image

- **Share Results** (`share/`):
  - **ShareResultsModal**: Generate a customizable screenshot of the scoreboard with:
    - Custom title/subtitle
    - Column layout (1-4 columns)
    - Max countries shown
    - Show/hide rankings, points
    - Short country names
    - Multiple aspect ratios (Landscape 16:9, Square 1:1, Portrait 3:4)
    - Font size controls (title, subtitle, branding)
    - Padding controls
    - High-quality toggle
    - Download as PNG
    - Native share API
  - **ShareStatsModal**: Share stats as generated image

### 4. Settings (`components/settings/`)

Two tabs: **General** and **Odds**

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
- Winner confetti toggle
- Fullscreen mode
- Jury voting progress bar
- Blur modal background
- Custom background image (from file)
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

#### Odds Settings
- Per-country jury and televote odds
- Year-based odds presets (based on actual results)
- Odds import/export

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
