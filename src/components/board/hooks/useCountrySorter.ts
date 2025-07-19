import { useMemo } from 'react';

import { Country } from '../../../models';
import { useScoreboardStore } from '../../../state/scoreboardStore';

import { compareCountriesByPoints } from '@/state/scoreboard/helpers';

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

        if (pointsComparison === 0) {
          const televoteComparison = b.televotePoints - a.televotePoints;

          if (televoteComparison === 0) {
            return a.name.localeCompare(b.name);
          }

          return televoteComparison;
        }

        return pointsComparison;
      });
    }

    return countriesToSort.sort(compareCountriesByPoints);
  }, [
    countriesToDisplay,
    showAllParticipants,
    winnerCountry,
    getCountryInSemiFinal,
  ]);

  return sortedCountries;
};
