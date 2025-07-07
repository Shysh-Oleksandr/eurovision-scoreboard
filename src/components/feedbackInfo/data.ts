export const WHATS_NEW = [
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
    approximateDates: { start: '2025-07-08', end: '2025-07-09' },
    title: 'Semi-finals voting by selection (without awarding points)',
  },
  {
    approximateDates: { start: '2025-07-12', end: '2025-07-13' },
    title: 'Odds-based random voting. Detailed voting breakdown',
  },
  {
    approximateDates: { start: '2025-07-13', end: '2025-07-14' },
    title: 'JESC support with custom themes',
  },
  {
    approximateDates: { start: '2025-07-14', end: '2025-07-15' },
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
      label: "What's New",
      value: 'whats-new',
      showIndicator: shouldShowNewChangesIndicator,
    },
    { label: 'Upcoming Features', value: 'upcoming' },
  ];
};
