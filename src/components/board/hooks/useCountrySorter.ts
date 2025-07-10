import { useMemo } from 'react';

import { Country } from '../../../models';
import { useScoreboardStore } from '../../../state/scoreboardStore';

export const useCountrySorter = (countriesToDisplay: Country[]) => {
  const winnerCountry = useScoreboardStore((state) => state.winnerCountry);
  const showAllParticipants = useScoreboardStore(
    (state) => state.showAllParticipants,
  );
  const getCountryInSemiFinal = useScoreboardStore(
    (state) => state.getCountryInSemiFinal,
  );

  const sortedCountries = useMemo(() => {
    const countriesToSort = [...countriesToDisplay];

    if (showAllParticipants && winnerCountry) {
      return countriesToSort.sort((a, b) => {
        if (a.points >= 0 && b.points >= 0) {
          return b.points - a.points;
        }
        if (a.points >= 0 && b.points === -1) {
          return -1;
        }
        if (a.points === -1 && b.points >= 0) {
          return 1;
        }

        const aSemiPoints = getCountryInSemiFinal(a.code)?.points ?? 0;
        const bSemiPoints = getCountryInSemiFinal(b.code)?.points ?? 0;
        const pointsComparison = bSemiPoints - aSemiPoints;

        return pointsComparison !== 0
          ? pointsComparison
          : a.name.localeCompare(b.name);
      });
    }

    return countriesToSort.sort((a, b) => {
      const pointsComparison = b.points - a.points;

      return pointsComparison !== 0
        ? pointsComparison
        : a.name.localeCompare(b.name);
    });
  }, [
    countriesToDisplay,
    showAllParticipants,
    winnerCountry,
    getCountryInSemiFinal,
  ]);

  return sortedCountries;
};
