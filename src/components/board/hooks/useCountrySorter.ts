import { useMemo } from 'react';

import { Country } from '../../../models';
import { useScoreboardStore } from '../../../state/scoreboardStore';

import { createCountriesComparator } from '@/state/scoreboard/helpers';
import { SENTINEL } from '@/data/data';

export const useCountrySorter = (countriesToDisplay: Country[]) => {
  const winnerCountry = useScoreboardStore((state) => state.winnerCountry);
  const showAllParticipants = useScoreboardStore(
    (state) => state.showAllParticipants,
  );
  const getCountryInSemiFinal = useScoreboardStore(
    (state) => state.getCountryInSemiFinal,
  );
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);

  const sortedCountries = useMemo(() => {
    const countriesToSort = [...countriesToDisplay];
    const currentStage = getCurrentStage();
    const runningOrder = currentStage?.runningOrder;
    const orderComparator = createCountriesComparator(runningOrder);
    const orderMap =
      runningOrder && runningOrder.length > 0
        ? new Map(runningOrder.map((code, idx) => [code, idx]))
        : null;

    if (showAllParticipants && winnerCountry) {
      return countriesToSort.sort((a, b) => {
        // Both countries are qualified (not non-qualified sentinel)
        if (a.points !== SENTINEL && b.points !== SENTINEL) {
          if (a.points === b.points) {
            const televoteComparison = b.televotePoints - a.televotePoints;

            if (televoteComparison === 0) {
              if (orderMap) {
                const aIdx = orderMap.get(a.code);
                const bIdx = orderMap.get(b.code);
                if (
                  aIdx !== undefined &&
                  bIdx !== undefined &&
                  aIdx !== bIdx
                ) {
                  return aIdx - bIdx;
                }
              }
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
            if (orderMap) {
              const aIdx = orderMap.get(a.code);
              const bIdx = orderMap.get(b.code);
              if (
                aIdx !== undefined &&
                bIdx !== undefined &&
                aIdx !== bIdx
              ) {
                return aIdx - bIdx;
              }
            }
            return a.name.localeCompare(b.name);
          }

          return televoteComparison;
        }

        return pointsComparison;
      });
    }

    return countriesToSort.sort(orderComparator);
  }, [
    countriesToDisplay,
    showAllParticipants,
    winnerCountry,
    getCountryInSemiFinal,
    getCurrentStage,
  ]);

  return sortedCountries;
};
