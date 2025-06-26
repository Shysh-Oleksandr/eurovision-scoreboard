export const WHATS_NEW = [
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
    approximateDates: { start: '2025-06-27', end: '2025-06-29' },
    title: 'More custom themes',
  },
  {
    approximateDates: { start: '2025-06-29', end: '2025-06-30' },
    title: 'All countries in the world support',
  },
  {
    approximateDates: { start: '2025-06-30', end: '2025-07-02' },
    title: 'Custom country creation',
  },
  {
    approximateDates: { start: '2025-07-01', end: '2025-07-06' },
    title: 'Odds-based random voting',
  },
  {
    approximateDates: { start: '2025-07-06', end: '2025-07-07' },
    title: 'JESC support',
  },
  {
    // approximateDates: { start: '2025-12-01', end: '2025-12-07' },
    title: 'Custom animations for each contest',
  },
  {
    // approximateDates: { start: '2026-01-01', end: '2026-01-07' },
    title: 'Different voting rules support',
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
