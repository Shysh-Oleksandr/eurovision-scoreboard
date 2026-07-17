import { Country, EventStage, StageVotingMode } from '../../models';

export const createCountriesComparator = (runningOrder?: string[]) => {
  const orderMap =
    runningOrder && runningOrder.length > 0
      ? new Map(runningOrder.map((code, idx) => [code, idx]))
      : null;

  return (a: Country, b: Country) => {
    const pointsComparison = b.points - a.points;

    if (pointsComparison !== 0) {
      return pointsComparison;
    }

    const televoteComparison = b.televotePoints - a.televotePoints;

    if (televoteComparison !== 0) {
      return televoteComparison;
    }

    if (orderMap) {
      const aIdx = orderMap.get(a.code);
      const bIdx = orderMap.get(b.code);

      if (aIdx !== undefined && bIdx !== undefined && aIdx !== bIdx) {
        // Earlier in running order wins as last resort
        return aIdx - bIdx;
      }
    }

    // Safety fallback when running order is missing/unknown
    return a.name.localeCompare(b.name);
  };
};

export const compareCountriesByPoints = (a: Country, b: Country) => {
  return createCountriesComparator()(a, b);
};

export const getRemainingCountries = (
  countries: Country[],
  countryCode: string | undefined,
) =>
  countries.filter(
    (country) => !country.isVotingFinished && country.code !== countryCode,
  );

export const getLastCountryCodeByPoints = (
  remainingCountries: Country[],
  runningOrder?: string[],
) =>
  remainingCountries.length
    ? remainingCountries.slice().sort(createCountriesComparator(runningOrder))[
        remainingCountries.length - 1
      ]?.code
    : '';

export const getLastCountryIndexByPoints = (
  countries: Country[],
  countryCode: string,
) => countries.findIndex((country) => country.code === countryCode) || 0;

export const isVotingOver = (lastCountryIndexByPoints: number) =>
  lastCountryIndexByPoints === -1;

/**
 * Determines whether the Grand Final "final televote reveal" is eligible for the
 * given stage: last stage, televote phase, exactly one country still unfinished,
 * and that country is not already winning (so there is real tension to show).
 *
 * Returns the leader/last codes and the points the last country needs to overtake,
 * or `null` when the reveal should not be shown. This is the single source of truth
 * shared by the trigger (`Simulation.tsx`) and the televote-award guard
 * (`giveTelevotePoints`) so they can never disagree.
 */
export const getFinalRevealInfo = (
  stage: EventStage | undefined | null,
  enableFinalReveal: boolean,
): { leaderCode: string; lastCode: string; pointsNeeded: number } | null => {
  if (!enableFinalReveal) return null;
  if (!stage || !stage.isLastStage || stage.isJuryVoting || stage.isOver) {
    return null;
  }
  if (
    stage.votingMode !== StageVotingMode.TELEVOTE_ONLY &&
    stage.votingMode !== StageVotingMode.JURY_AND_TELEVOTE
  ) {
    return null;
  }

  const unfinished = stage.countries.filter((c) => !c.isVotingFinished);

  if (unfinished.length !== 1) return null;
  const [lastCountry] = unfinished;

  if (!lastCountry) return null;

  const otherCountries = stage.countries.filter(
    (c) => c.code !== lastCountry.code,
  );

  if (otherCountries.length === 0) return null;

  const leaderCountry = otherCountries.reduce((best, c) =>
    c.points > best.points ? c : best,
  );
  const pointsNeeded = leaderCountry.points - lastCountry.points + 1;

  if (pointsNeeded <= 0) return null;

  return {
    leaderCode: leaderCountry.code,
    lastCode: lastCountry.code,
    pointsNeeded,
  };
};

export const getWinnerCountry = (
  countries: Country[],
  runningOrder?: string[],
) => {
  if (countries.length === 0) {
    return null;
  }

  const comparator = createCountriesComparator(runningOrder);
  return countries.slice().sort(comparator)[0] ?? null;
};

export const handleStageEnd = (
  countries: Country[],
  currentStage: EventStage,
  isEventEnded = true,
): {
  winnerCountry: Country | null;
  showQualificationResults: boolean;
  countries: Country[];
} => {
  let winnerCountry: Country | null = null;
  const showQualificationResults = !currentStage.isLastStage;

  let updatedCountries = [...countries];

  if (currentStage.isLastStage && isEventEnded) {
    updatedCountries = updatedCountries.map((country) => ({
      ...country,
      isVotingFinished: true,
      showDouzePointsAnimation:
        currentStage.votingMode === StageVotingMode.TELEVOTE_ONLY ||
        currentStage.votingMode === StageVotingMode.JURY_AND_TELEVOTE
          ? false
          : country.showDouzePointsAnimation,
    }));
    winnerCountry = getWinnerCountry(
      updatedCountries,
      currentStage.runningOrder,
    );
  }

  if (showQualificationResults) {
    const sortedCountries = [...updatedCountries].sort(
      createCountriesComparator(currentStage.runningOrder),
    );
    const qualifiersAmount =
      currentStage.qualifiesTo?.reduce((sum, target) => {
        // If using rank ranges, calculate based on ranges
        if (target.minRank && target.maxRank) {
          return sum + (target.maxRank - target.minRank + 1);
        }
        // Amount-based (backward compatibility)
        return sum + target.amount;
      }, 0) || 0;
    const qualifiedCountries = sortedCountries.slice(0, qualifiersAmount);

    updatedCountries = updatedCountries.map((country) => ({
      ...country,
      qualifiedFromStageIds: qualifiedCountries.some(
        (c) => c.code === country.code,
      )
        ? [...(country.qualifiedFromStageIds ?? []), currentStage.id]
        : country.qualifiedFromStageIds,
    }));
  }

  return {
    winnerCountry,
    showQualificationResults,
    countries: updatedCountries,
  };
};
