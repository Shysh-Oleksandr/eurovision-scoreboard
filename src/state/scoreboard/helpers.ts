import { Country, EventStage, StageVotingMode } from '../../models';

export const compareCountriesByPoints = (a: Country, b: Country) => {
  const pointsComparison = b.points - a.points;

  if (pointsComparison === 0) {
    const televoteComparison = b.televotePoints - a.televotePoints;

    if (televoteComparison === 0) {
      return a.name.localeCompare(b.name);
    }

    return televoteComparison;
  }

  return pointsComparison;
};

export const getRemainingCountries = (
  countries: Country[],
  countryCode: string | undefined,
) =>
  countries.filter(
    (country) => !country.isVotingFinished && country.code !== countryCode,
  );

export const getLastCountryCodeByPoints = (remainingCountries: Country[]) =>
  remainingCountries.length
    ? remainingCountries.slice().sort(compareCountriesByPoints)[
        remainingCountries.length - 1
      ]?.code
    : '';

export const getLastCountryIndexByPoints = (
  countries: Country[],
  countryCode: string,
) => countries.findIndex((country) => country.code === countryCode) || 0;

export const isVotingOver = (lastCountryIndexByPoints: number) =>
  lastCountryIndexByPoints === -1;

export const getWinnerCountry = (countries: Country[]) => {
  if (countries.length === 0) {
    return null;
  }

  return countries.reduce((prev, current) => {
    if (current.points > prev.points) {
      return current;
    }
    if (current.points < prev.points) {
      return prev;
    }
    // points are equal, check televotePoints
    if (current.televotePoints > prev.televotePoints) {
      return current;
    }
    if (current.televotePoints < prev.televotePoints) {
      return prev;
    }

    // televotePoints are also equal, use alphabetical order (A-Z wins)
    return current.name.localeCompare(prev.name) < 0 ? current : prev;
  });
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
    winnerCountry = getWinnerCountry(updatedCountries);
  }

  if (showQualificationResults) {
    const sortedCountries = [...updatedCountries].sort(
      compareCountriesByPoints,
    );
    const qualifiersAmount =
      currentStage.qualifiesTo?.reduce(
        (sum, target) => sum + target.amount,
        0,
      ) || 0;
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
