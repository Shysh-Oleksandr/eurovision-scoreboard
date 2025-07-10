import { Country, EventStage } from '../../models';

export const getRemainingCountries = (
  countries: Country[],
  countryCode: string | undefined,
) =>
  countries.filter(
    (country) => !country.isVotingFinished && country.code !== countryCode,
  );

export const getLastCountryCodeByPoints = (remainingCountries: Country[]) =>
  remainingCountries.length
    ? remainingCountries.slice().sort((a, b) => {
        const pointsComparison = b.points - a.points;

        return pointsComparison !== 0
          ? pointsComparison
          : a.name.localeCompare(b.name);
      })[remainingCountries.length - 1].code
    : '';

export const getLastCountryIndexByPoints = (
  countries: Country[],
  countryCode: string,
) => countries.findIndex((country) => country.code === countryCode);

export const isVotingOver = (lastCountryIndexByPoints: number) =>
  lastCountryIndexByPoints === -1;

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
    }));
    winnerCountry = updatedCountries.reduce((prev, current) => {
      if (prev.points > current.points) {
        return prev;
      }
      if (current.points > prev.points) {
        return current;
      }

      return prev.name.localeCompare(current.name) < 0 ? prev : current;
    });
  }

  if (showQualificationResults) {
    const sortedCountries = [...updatedCountries].sort((a, b) => {
      const pointsComparison = b.points - a.points;

      return pointsComparison !== 0
        ? pointsComparison
        : a.name.localeCompare(b.name);
    });
    const qualifiersAmount = currentStage.qualifiersAmount || 0;
    const qualifiedCountries = sortedCountries.slice(0, qualifiersAmount);

    updatedCountries = updatedCountries.map((country) => ({
      ...country,
      isQualifiedFromSemi: qualifiedCountries.some(
        (c) => c.code === country.code,
      ),
    }));
  }

  return {
    winnerCountry,
    showQualificationResults,
    countries: updatedCountries,
  };
};
