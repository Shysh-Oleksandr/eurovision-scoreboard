import { toFixedIfDecimalFloat } from '@/helpers/toFixedIfDecimal';
import {
  BaseCountry,
  Country,
  EventStage,
  StageVotingMode,
  VotingCountry,
} from '@/models';
import type { StageVotes, Vote } from '@/state/scoreboard/types';

/** Which way the points flow, seen from the country in the middle. */
export type VotesDirection = 'received' | 'given';

/** One flag on the ring: who it is and what went between it and the middle. */
export interface VotesLink {
  code: string;
  total: number;
  jury: number;
  televote: number;
}

/**
 * Where a country stands in (or around) the stage, for the band's line and
 * the info card: the winner, a place (and whether it went through), or a
 * voter that isn't an entry here.
 */
export type VotesStatus =
  | { kind: 'winner' }
  | { kind: 'place'; place: number; qualified?: boolean }
  | { kind: 'out'; stageName: string }
  | { kind: 'competes'; stageName: string }
  | { kind: 'votesOnly' };

export interface VotesCountry {
  code: string;
  name: string;
  /** For `getFlagPath`: a custom or overridden flag rides along. */
  country: BaseCountry;
  isEntry: boolean;
  isVoter: boolean;
  /** The stage's place, entries only. */
  place?: number;
  /** The stage's total, entries only. */
  points?: number;
  status: VotesStatus;
}

export interface VotesStageData {
  /** Every country the graphic can show, keyed by code. */
  countries: Map<string, VotesCountry>;
  /** Entries by place. */
  entries: VotesCountry[];
  /** Voters that aren't entries in this stage, in voting order. */
  votersOnly: VotesCountry[];
  /** Jury and televote are separate channels: the ring shows both pills. */
  split: boolean;
  /** The biggest points one voter gave one entry: the size scale's top. */
  maxLink: number;
  received: (code: string) => VotesLink[];
  given: (code: string) => VotesLink[];
}

type Channel = 'jury' | 'televote' | 'combined';

interface Cell {
  jury: number;
  televote: number;
  combined: number;
}

const add = (a: number, b: number) => toFixedIfDecimalFloat(a + b);

/** The channels a stage's points are counted in. */
const countedChannels = (mode: StageVotingMode): Channel[] => {
  switch (mode) {
    case StageVotingMode.JURY_ONLY:
      return ['jury'];
    case StageVotingMode.TELEVOTE_ONLY:
      return ['televote'];
    case StageVotingMode.COMBINED:
      return ['combined'];
    default:
      return ['jury', 'televote'];
  }
};

/**
 * The voter's status when it isn't an entry here: out in an earlier stage,
 * competing in another one, or only voting.
 */
const voterStatus = (
  code: string,
  stage: EventStage,
  stages: readonly EventStage[],
): VotesStatus => {
  const others = stages.filter(
    (other) =>
      other.id !== stage.id &&
      other.countries.some((country) => country.code === code),
  );
  const [out] = others
    .filter(
      (other) =>
        other.order < stage.order &&
        other.isOver &&
        !other.countries
          .find((country) => country.code === code)
          ?.qualifiedFromStageIds?.includes(other.id),
    )
    .sort((a, b) => b.order - a.order);

  if (out) return { kind: 'out', stageName: out.name };

  const [competes] = [...others].sort((a, b) => a.order - b.order);

  if (competes) return { kind: 'competes', stageName: competes.name };

  return { kind: 'votesOnly' };
};

const isFinalStage = (stage: EventStage) =>
  !!stage.isLastStage || !stage.qualifiesTo?.length;

const entryStatus = (
  country: Country,
  place: number,
  stage: EventStage,
): VotesStatus => {
  if (place === 1 && isFinalStage(stage)) return { kind: 'winner' };

  return {
    kind: 'place',
    place,
    qualified: stage.qualifiesTo?.length
      ? !!country.qualifiedFromStageIds?.includes(stage.id)
      : undefined,
  };
};

/**
 * Everything the Votes view draws for one finished stage: who the entries
 * and voters are, and every voter → entry total split by channel. `ranked`
 * is the stage's entries by total (the Summary's order); `voters` the
 * stage's voters in voting order, every channel.
 */
export function buildVotesStageData({
  stage,
  stages,
  ranked,
  voters: allVoters,
  votes,
  getPoints,
}: {
  stage: EventStage;
  stages: readonly EventStage[];
  ranked: readonly Country[];
  voters: readonly VotingCountry[];
  votes: Partial<StageVotes> | null | undefined;
  getPoints: (country: Country) => number;
}): VotesStageData {
  // One flag per country, even if a voter list repeats one.
  const seen = new Set<string>();
  const voters = allVoters.filter((voter) =>
    seen.has(voter.code) ? false : (seen.add(voter.code), true),
  );
  const channels = countedChannels(stage.votingMode);
  const split = stage.votingMode === StageVotingMode.JURY_AND_TELEVOTE;

  // voter → entry → points per channel
  const cells = new Map<string, Map<string, Cell>>();
  const cellFor = (voter: string, entry: string) => {
    let row = cells.get(voter);

    if (!row) {
      row = new Map();
      cells.set(voter, row);
    }

    let cell = row.get(entry);

    if (!cell) {
      cell = { jury: 0, televote: 0, combined: 0 };
      row.set(entry, cell);
    }

    return cell;
  };

  channels.forEach((channel) => {
    const ballots: Record<string, Vote[]> | undefined = votes?.[channel];

    if (!ballots) return;

    Object.entries(ballots).forEach(([voter, list]) => {
      list.forEach((vote) => {
        if (!vote.points || vote.countryCode === voter) return;
        const cell = cellFor(voter, vote.countryCode);

        cell[channel] = add(cell[channel], vote.points);
      });
    });
  });

  const totalOf = (cell: Cell) =>
    channels.reduce((sum, channel) => add(sum, cell[channel]), 0);

  const countries = new Map<string, VotesCountry>();
  const voterCodes = new Set(voters.map((voter) => voter.code));

  const entries = ranked.map((country, index): VotesCountry => {
    const entry: VotesCountry = {
      code: country.code,
      name: country.name,
      country,
      isEntry: true,
      isVoter: voterCodes.has(country.code),
      place: index + 1,
      points: getPoints(country),
      status: entryStatus(country, index + 1, stage),
    };

    countries.set(country.code, entry);

    return entry;
  });

  const votersOnly: VotesCountry[] = [];

  voters.forEach((voter) => {
    if (countries.has(voter.code)) return;
    const entry: VotesCountry = {
      code: voter.code,
      name: voter.name,
      country: voter as BaseCountry,
      isEntry: false,
      isVoter: true,
      status: voterStatus(voter.code, stage, stages),
    };

    countries.set(voter.code, entry);
    votersOnly.push(entry);
  });

  const voterOrder = new Map(voters.map((voter, index) => [voter.code, index]));
  const placeOf = (code: string) => countries.get(code)?.place ?? Infinity;

  const toLink = (code: string, cell: Cell): VotesLink => ({
    code,
    total: totalOf(cell),
    jury: cell.jury,
    televote: cell.televote,
  });

  // Most points first; a tie goes to the televote, then the voting order
  // (who gave it) or the place (who got it).
  const byPoints =
    (tieBreak: (code: string) => number) => (a: VotesLink, b: VotesLink) =>
      b.total - a.total ||
      b.televote - a.televote ||
      tieBreak(a.code) - tieBreak(b.code);

  const received = (code: string): VotesLink[] =>
    voters
      .map((voter) => {
        const cell = cells.get(voter.code)?.get(code);

        return cell ? toLink(voter.code, cell) : null;
      })
      .filter((link): link is VotesLink => !!link && link.total > 0)
      .sort(byPoints((voter) => voterOrder.get(voter) ?? Infinity));

  const given = (code: string): VotesLink[] =>
    Array.from(cells.get(code) ?? [])
      .filter(([entry]) => countries.get(entry)?.isEntry)
      .map(([entry, cell]) => toLink(entry, cell))
      .filter((link) => link.total > 0)
      .sort(byPoints(placeOf));

  let maxLink = 0;

  cells.forEach((row) =>
    row.forEach((cell) => {
      maxLink = Math.max(maxLink, totalOf(cell));
    }),
  );

  return {
    countries,
    entries,
    votersOnly,
    split,
    maxLink,
    received,
    given,
  };
}

/** The totals of a view, for the band and the legend. */
export const sumLinks = (links: readonly VotesLink[]) =>
  links.reduce(
    (sum, link) => ({
      total: add(sum.total, link.total),
      jury: add(sum.jury, link.jury),
      televote: add(sum.televote, link.televote),
    }),
    { total: 0, jury: 0, televote: 0 },
  );

/**
 * The direction a country can be shown in: an entry that didn't vote only
 * received, a voter that isn't an entry only gave.
 */
export const directionFor = (
  country: VotesCountry | undefined,
  wanted: VotesDirection,
): VotesDirection => {
  if (!country) return wanted;
  if (wanted === 'received' && !country.isEntry) return 'given';
  if (wanted === 'given' && !country.isVoter) return 'received';

  return wanted;
};
