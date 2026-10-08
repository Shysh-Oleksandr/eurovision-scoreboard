import { Country, EventStage, StageVotingMode, VotingCountry } from '@/models';
import type { StageVotes, Vote } from '@/state/scoreboard/types';

/**
 * Stand-in contest for `live` designs when no contest is running, so starters
 * and community designs never preview an empty scoreboard or stats table:
 * the ESC 2026 Grand Final lineup with made-up votes. Every voter's ballot
 * comes from a seeded simulation of the lineup's odds, so the scoreboard and
 * the stats tables agree and the result is the same on every load. Neither
 * the points nor the running order are the real ones.
 */

/** Code, name, jury odds, televote odds (from countries-2026.json). */
const FINALISTS: [string, string, number, number][] = [
  ['AL', 'Albania', 43, 41.5],
  ['AU', 'Australia', 84, 51],
  ['AT', 'Austria', 20, 21.5],
  ['BE', 'Belgium', 33.5, 20],
  ['BG', 'Bulgaria', 99, 99],
  ['HR', 'Croatia', 40, 38],
  ['CY', 'Cyprus', 35.5, 28.5],
  ['CZ', 'Czechia', 60, 22.5],
  ['DK', 'Denmark', 84, 40],
  ['FI', 'Finland', 74.5, 55],
  ['FR', 'France', 75.5, 23.5],
  ['DE', 'Germany', 24.5, 20],
  ['GR', 'Greece', 48, 57],
  ['IL', 'Israel', 67.5, 75.5],
  ['IT', 'Italy', 72, 57],
  ['LT', 'Lithuania', 23.5, 23],
  ['MT', 'Malta', 51, 22],
  ['MD', 'Moldova', 36.5, 66.5],
  ['NO', 'Norway', 64.5, 25],
  ['PL', 'Poland', 71.5, 24.5],
  ['RO', 'Romania', 44.5, 78.5],
  ['RS', 'Serbia', 34.5, 33],
  ['SE', 'Sweden', 33, 24],
  ['UA', 'Ukraine', 40.5, 62.5],
  ['GB', 'United Kingdom', 20, 20],
];

/** The 2026 semi-finalists that did not qualify (they still vote). */
const NON_QUALIFIERS: [string, string][] = [
  ['AM', 'Armenia'],
  ['AZ', 'Azerbaijan'],
  ['EE', 'Estonia'],
  ['GE', 'Georgia'],
  ['LV', 'Latvia'],
  ['LU', 'Luxembourg'],
  ['ME', 'Montenegro'],
  ['PT', 'Portugal'],
  ['SM', 'San Marino'],
  ['CH', 'Switzerland'],
];

const SCALE = [12, 10, 8, 7, 6, 5, 4, 3, 2, 1];
/** Spread of each voter's taste around the odds (odds are 1–99). */
const NOISE = 22;

/** mulberry32: small, fast, seedable. */
const seeded = (seed: number) => {
  let a = seed;

  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const random = seeded(2026);
/** Box–Muller: one standard normal draw. */
const gauss = () =>
  Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());

const ballot = (voterCode: string, odds: 2 | 3): Vote[] =>
  FINALISTS.filter(([code]) => code !== voterCode)
    .map((row) => ({ code: row[0], score: row[odds] + gauss() * NOISE }))
    .sort((a, b) => b.score - a.score)
    .slice(0, SCALE.length)
    .map(({ code }, i) => ({
      countryCode: code,
      points: SCALE[i],
      pointsId: i,
      showDouzePointsAnimation: false,
    }));

const juryVoters: VotingCountry[] = [
  ...FINALISTS.map(([code, name]) => ({ code, name })),
  ...NON_QUALIFIERS.map(([code, name]) => ({ code, name })),
].sort((a, b) => a.name.localeCompare(b.name));

const televoteVoters: VotingCountry[] = [
  ...juryVoters,
  { code: 'WW', name: 'Rest of the World' },
];

const ballots = (voters: VotingCountry[], odds: 2 | 3) =>
  Object.fromEntries(voters.map((v) => [v.code, ballot(v.code, odds)]));

const jury = ballots(juryVoters, 2);
const televote = ballots(televoteVoters, 3);

export const SAMPLE_VOTES: StageVotes = { jury, televote };

const received = (votes: Record<string, Vote[]>, code: string) =>
  Object.values(votes).reduce(
    (sum, list) =>
      sum + (list.find((v) => v.countryCode === code)?.points ?? 0),
    0,
  );

/** Ranked like the board: total, then televote. */
export const SAMPLE_COUNTRIES: Country[] = FINALISTS.map(([code, name]) => {
  const juryPoints = received(jury, code);
  const televotePoints = received(televote, code);

  return {
    code,
    name,
    juryPoints,
    televotePoints,
    points: juryPoints + televotePoints,
    lastReceivedPoints: null,
    isQualified: true,
    isVotingFinished: true,
  };
}).sort((a, b) => b.points - a.points || b.televotePoints - a.televotePoints);

/** Illustrative draw (not the official one). */
export const SAMPLE_RUNNING_ORDER: string[] = [
  'MD',
  'SE',
  'HR',
  'GR',
  'GB',
  'AL',
  'DE',
  'NO',
  'RS',
  'FR',
  'MT',
  'AT',
  'IL',
  'CZ',
  'FI',
  'BE',
  'DK',
  'LT',
  'RO',
  'IT',
  'CY',
  'PL',
  'AU',
  'UA',
  'BG',
];

export const SAMPLE_STAGE: EventStage = {
  id: 'sample-grand-final',
  name: 'Grand Final',
  order: 0,
  votingMode: StageVotingMode.JURY_AND_TELEVOTE,
  countries: SAMPLE_COUNTRIES,
  votingCountries: juryVoters,
  isOver: true,
  isJuryVoting: false,
  isLastStage: true,
  runningOrder: SAMPLE_RUNNING_ORDER,
};

/** Stats table columns per channel (the store answers this for real stages). */
export const SAMPLE_VOTERS: Record<'jury' | 'televote', VotingCountry[]> = {
  jury: juryVoters,
  televote: televoteVoters,
};
