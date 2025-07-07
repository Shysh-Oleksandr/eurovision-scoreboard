import { CountryAssignmentGroup, EventMode } from '../../models';

export const TABS = [
  {
    label: 'Semi-Finals + Grand Final',
    value: EventMode.SEMI_FINALS_AND_GRAND_FINAL,
  },
  {
    label: 'Grand Final Only',
    value: EventMode.GRAND_FINAL_ONLY,
  },
];

export const CATEGORY_ORDER = [
  'Custom',
  'All-Time Participants',
  'Europe',
  'Asia',
  'Africa',
  'North America',
  'South America',
  'Oceania',
];

export const SEMI_FINALS_GROUPS = [
  CountryAssignmentGroup.AUTO_QUALIFIER,
  CountryAssignmentGroup.SF1,
  CountryAssignmentGroup.SF2,
  CountryAssignmentGroup.NOT_PARTICIPATING,
];
