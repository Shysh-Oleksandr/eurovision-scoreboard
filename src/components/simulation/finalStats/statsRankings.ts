import { Country, EventStage, StageVotingMode } from '@/models';

type GetPoints = (
  country: Country,
  type?: 'jury' | 'televote' | 'combined',
) => number;

export interface StageRankings {
  /** The stage has separate jury and televote results to compare. */
  hasSplit: boolean;
  byTotal: Country[];
  byJury: Country[];
  byTelevote: Country[];
  juryPlace: Map<string, number>;
  televotePlace: Map<string, number>;
  /** The winner's total: the full length of the Summary's split bars. */
  maxTotal: number;
}

export const stageHasSplit = (stage: EventStage | undefined): boolean =>
  !!stage &&
  (stage.votingMode === StageVotingMode.JURY_AND_TELEVOTE ||
    stage.votingMode === StageVotingMode.COMBINED);

/**
 * The stage's rankings for the Summary and Split views: by total (ties go to
 * the televote, then the running order), and by jury and by televote alone
 * (ties go to the running order). Independent of the Breakdown's channel
 * switch, which re-ranks `useFinalStats`'s `rankedCountries`.
 */
export function buildStageRankings(
  stage: EventStage | undefined,
  countries: readonly Country[],
  getPoints: GetPoints,
): StageRankings {
  const runningOrder = stage?.runningOrder ?? [];
  const order = new Map(runningOrder.map((code, index) => [code, index]));

  const byRunningOrder = (a: Country, b: Country) => {
    const aIndex = order.get(a.code);
    const bIndex = order.get(b.code);

    if (aIndex !== undefined && bIndex !== undefined && aIndex !== bIndex) {
      return aIndex - bIndex;
    }

    return a.name.localeCompare(b.name);
  };

  const byChannel = (type: 'jury' | 'televote') =>
    [...countries].sort(
      (a, b) => getPoints(b, type) - getPoints(a, type) || byRunningOrder(a, b),
    );

  const byTotal = [...countries].sort(
    (a, b) =>
      getPoints(b, 'combined') - getPoints(a, 'combined') ||
      getPoints(b, 'televote') - getPoints(a, 'televote') ||
      byRunningOrder(a, b),
  );

  const hasSplit = stageHasSplit(stage);
  const byJury = hasSplit ? byChannel('jury') : [];
  const byTelevote = hasSplit ? byChannel('televote') : [];

  const places = (list: Country[]) =>
    new Map(list.map((country, index) => [country.code, index + 1]));

  return {
    hasSplit,
    byTotal,
    byJury,
    byTelevote,
    juryPlace: places(byJury),
    televotePlace: places(byTelevote),
    maxTotal: byTotal.length ? getPoints(byTotal[0], 'combined') : 0,
  };
}
