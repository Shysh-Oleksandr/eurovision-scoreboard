import { useMemo } from 'react';

import { Country } from '../../../models';
import { useScoreboardStore } from '../../../state/scoreboardStore';

import { compareCountriesByPoints } from '@/state/scoreboard/helpers';
import { SENTINEL } from '@/data/data';

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
        // Both countries are qualified (not non-qualified sentinel)
        if (a.points !== SENTINEL && b.points !== SENTINEL) {
          if (a.points === b.points) {
            const televoteComparison = b.televotePoints - a.televotePoints;

            if (televoteComparison === 0) {
              return a.name.localeCompare(b.name);
            }

            return televoteComparison;
          }

          // Sort qualified countries by points (higher points first, including negative points)
          return b.points - a.points;
        }

        // One is qualified, one is non-qualified
        if (a.points !== SENTINEL && b.points === SENTINEL) {
          return -1; // a (qualified) comes first
        }
        if (a.points === SENTINEL && b.points !== SENTINEL) {
          return 1; // b (qualified) comes first
        }

        // Both are non-qualified (sentinel), sort by semi-final points
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
