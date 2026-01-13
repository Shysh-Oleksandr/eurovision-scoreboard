const OLD_WHATS_NEW = [
  {
    date: '2025-12-14',
    title: 'Added winter effects. Added JESC 2025 theme',
  },
  {
    date: '2025-12-13',
    title: 'Added JESC 2025',
  },
  {
    date: '2025-12-09',
    title: 'More fixes with the contest setup',
  },
  {
    date: '2025-12-08',
    title: 'Fixed the issue with the qualifier targets validation',
  },
  {
    date: '2025-12-07',
    title:
      'Flexible contest setup: create unlimited stages with custom qualifier targets (e.g., Heats, Quarter-finals, etc.). Improved voting country selection. Various small enhancements.',
  },
  {
    date: '2025-11-23',
    title: 'Small improvements & bug fixes',
  },
  {
    date: '2025-11-22',
    title: 'Added localization for 8 languages',
  },
  {
    date: '2025-11-15',
    title:
      'Fixed some crashes. Added the ability to reuse existing flags when adding custom entries',
  },
  {
    date: '2025-11-14',
    title: 'Fixed some issues. Added automatic error reporting',
  },
  {
    date: '2025-11-06',
    title:
      'The shade selector for the interface colors. Copying colors from one field to another. Small fixes',
  },
  {
    date: '2025-11-05',
    title:
      'Added the ability to save and like custom themes. Small improvements',
  },
  {
    date: '2025-11-02',
    title:
      'Custom theme builder. The ability to use public themes. Small improvements',
  },
  {
    date: '2025-10-11',
    title:
      'Saving custom entries in user profile (with migration from locally stored entries). Persisting the setup and scoreboard progress.',
  },
  {
    date: '2025-10-10',
    title: 'Fixed authentication issues on iOS',
  },
  {
    date: '2025-10-06',
    title: 'Added user authentication, profile creation and editing',
  },
  {
    date: '2025-09-28',
    title: 'Bug fixes & small improvements',
  },
  {
    date: '2025-09-21',
    title: 'The ability to predefine voting (enable in settings)',
  },
  {
    date: '2025-09-13',
    title: 'Presentation mode',
  },
  {
    date: '2025-09-13',
    title: 'Performance improvements',
  },
  {
    date: '2025-09-07',
    title:
      'Added the ability to share simulation results during voting. Small layout improvements',
  },
  {
    date: '2025-09-06',
    title: 'Share stats improvements',
  },
  {
    date: '2025-08-31',
    title:
      'Added split stats and summary stats. Added the ability to generate the stats image',
  },
  {
    date: '2025-08-27',
    title:
      'The 2016-18 televote reveal order (from lowest points to highest). Small improvements',
  },
  {
    date: '2025-08-26',
    title: 'Fixed the board reordering issue on desktop',
  },
  {
    date: '2025-08-25',
    title:
      'Added the ability to pick qualifiers for semi-finals by selection (without awarding points)',
  },
  {
    date: '2025-08-23',
    title:
      'Added the ability to generate, customize, and download a screenshot of the final scoreboard results for sharing',
  },
  {
    date: '2025-08-16',
    title: 'Added the ability to save and load custom presets',
  },
  {
    date: '2025-08-14',
    title: 'Added the ability to use custom background images',
  },
  {
    date: '2025-08-13',
    title: 'Added the 2016-2022 JESC presets and 2021-2022 themes',
  },
  {
    date: '2025-08-12',
    title:
      'Added the Junior Eurovision support with custom themes for 2023 and 2024',
  },
  {
    date: '2025-08-10',
    title:
      'Added the heart flag icons for all Eurovision countries, the search for hosting countries, the televote progress bar, and settings for limiting manual televote points',
  },
  {
    date: '2025-08-09',
    title: 'Added the settings for the contest name, year, and host country',
  },
  {
    date: '2025-08-08',
    title:
      'Added the ability to sync voters with participants (enabled by default)',
  },
  {
    date: '2025-08-03',
    title:
      'Added voting countries selection, reordering, correct initial order for all years, Rest of the World voting, and auto-qualifier voting in semi-finals',
  },
  {
    date: '2025-08-01',
    title: 'Small bug fixes',
  },
  {
    date: '2025-07-29',
    title:
      'Added the ability to assign the DouzePoints animation for specific points. Small bug fixes',
  },
  {
    date: '2025-07-27',
    title: 'Added the points system configuration. Small UI improvements/fixes',
  },
  {
    date: '2025-07-20',
    title:
      'Added the Undo button, full screen mode option, and confirmation before leaving the page during simulation. Allowed to view the scoreboard for semi-finals after the final results. Small UI improvements',
  },
  {
    date: '2025-07-19',
    title:
      'Added UI Preferences settings. Added the ability to always display the rankings. Small improvements',
  },
  {
    date: '2025-07-17',
    title: 'Small bug fixes',
  },
  {
    date: '2025-07-14',
    title:
      'Remade the random voting logic. Added configurable odds with presets for each year based on the actual results. Added detailed voting breakdown for each stage and voting mode',
  },
  {
    date: '2025-07-11',
    title: 'Improved the animation performance',
  },
  {
    date: '2025-07-08',
    title:
      'Added the Grand Final editing. Increased the custom entries storage capacity',
  },
  {
    date: '2025-07-07',
    title:
      'Added semi-finals creation and editing. Allowed to select voting mode for each stage',
  },
  {
    date: '2025-07-03',
    title: 'Added 2016 theme. Improved assets loading for better performance',
  },
  {
    date: '2025-07-02',
    title:
      'Migrated from Vercel to Cloudflare. Set up the new domain - douzepoints.app. Added 2017 theme',
  },
  {
    date: '2025-06-30',
    title: 'Added 2019 and 2018 themes. Added confetti for the winner 🎉',
  },
  {
    date: '2025-06-29',
    title: 'Added custom entry creation and bulk assignment',
  },
  {
    date: '2025-06-28',
    title:
      'Decoupled the theme from the year. Added all countries in the world for selection',
  },
  {
    date: '2025-06-27',
    title: 'Added 2021 theme and 2020 countries',
  },
  {
    date: '2025-06-26',
    title:
      'Improved the feedback and updates modal. Added 2022 theme. Fixed the layout issue on iPad',
  },
  {
    date: '2025-06-25',
    title: 'Improved the board reordering animation. Fixed UI bugs',
  },
  {
    date: '2025-06-24',
    title:
      'Added the ability to see the final results of all participating countries. Improved semi-finals functionality',
  },
  {
    date: '2025-06-24',
    title: 'Added the semi-finals and custom countries selection',
  },
];

export const WHATS_NEW = [
  {
    date: '2026-01-13',
    title: 'Added ESC 2026 setup',
  },
  {
    date: '2026-01-10',
    title:
      'Added the ability to quick select themes and contests from the dropdowns',
  },
  {
    date: '2026-01-09',
    title:
      'Fixed the issue with the image generation when it includes custom entries',
  },
  {
    date: '2026-01-08',
    title:
      'Added saving and loading a theme with a contest. Added two-column scoreboard layout on mobile. Improved the long entry names display',
  },
  {
    date: '2026-01-06',
    title:
      'Added the ability to load contest parts (general info, setup, simulation) and present the contest simulation with the same results as the original contest.',
  },
  {
    date: '2026-01-03',
    title:
      'Added custom confirmation popups for certain actions. Added loading spinner.',
  },
  {
    date: '2026-01-02',
    title:
      'Added rank-based qualifier targets. Added saving custom entries from other contests (to do this, load the contest → remove custom entries from participants → open the Imported section → click the "Save to your custom entries" button).',
  },
  {
    date: '2026-01-01',
    title:
      'Added reordering all stages during adding/editing a stage. Minor fixes',
  },
  {
    date: '2025-12-31',
    title:
      'Contests - saving the simulation setup and results. Public contests browsing and loading.',
  },
  {
    date: '2025-12-24',
    title: 'Allowed the negative points in the points system',
  },

  ...OLD_WHATS_NEW,
];

export const UPCOMING_FEATURES = [
  {
    approximateDates: { start: '2026-01-17', end: '2026-01-18' },
    title: 'Better theme customization',
  },
  {
    title: 'Running order setup',
  },
  {
    title: 'Separate points system for jury and televote',
  },
  {
    title: 'Pre-1975 points system support',
  },
];
