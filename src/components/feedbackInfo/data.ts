export const WHATS_NEW = [
  {
    date: '2025-08-13',
    title:
      'Added the 2016-2022 JESC presets and 2021-2022 themes',
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
    title:
      'Added the settings for the contest name, year, and host country',
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

export const UPCOMING_FEATURES = [
  {
    approximateDates: { start: '2025-08-15', end: '2025-08-17' },
    title: 'Save and load contest presets',
  },
  {
    // approximateDates: { start: '2025-08-02', end: '2025-08-03' },
    title: 'Semi-finals voting by selection (without awarding points)',
  },
  {
    // approximateDates: { start: '2025-08-02', end: '2025-08-03' },
    title:
      'The 2016-18 televote announcement order (from lowest points to highest)',
  },

  {
    // approximateDates: { start: '2025-07-14', end: '2025-07-15' },
    title: 'Presentation mode',
  },
  {
    // approximateDates: { start: '2025-12-01', end: '2025-12-07' },
    title: 'Custom animations for each contest',
  },
];

export const getTabs = (shouldShowNewChangesIndicator: boolean) => {
  return [
    { label: 'Feedback', value: 'feedback' },
    {
      label: 'Updates',
      value: 'whats-new',
      showIndicator: shouldShowNewChangesIndicator,
    },
    { label: 'Upcoming', value: 'upcoming' },
  ];
};
