import { useCallback, useMemo } from 'react';

import { useCountriesStore } from '../../../state/countriesStore';
import { useScoreboardStore } from '../../../state/scoreboardStore';

import { useGeneralStore } from '@/state/generalStore';

export const useVoting = () => {
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const giveJuryPoints = useScoreboardStore((state) => state.giveJuryPoints);
  const getVotingCountry = useCountriesStore((state) => state.getVotingCountry);
  const pointsSystem = useGeneralStore((state) => state.pointsSystem);

  const MAX_COUNTRY_WITH_POINTS = pointsSystem.length;

  const { countries } = getCurrentStage();

  const { countriesWithPointsLength, wasTheFirstPointsAwarded } =
    useMemo(() => {
      let length = 0;
      let hasPoints = false;

      for (const country of countries) {
        if (country.lastReceivedPoints !== null) {
          length += 1;
        }
        if (country.points > 0) {
          hasPoints = true;
        }
      }

      return {
        countriesWithPointsLength: length,
        wasTheFirstPointsAwarded: hasPoints,
      };
    }, [countries]);

  const hasCountryFinishedVoting = useMemo(
    () => countriesWithPointsLength === MAX_COUNTRY_WITH_POINTS,
    [MAX_COUNTRY_WITH_POINTS, countriesWithPointsLength],
  );

  const onClick = useCallback(
    (countryCode: string) => {
      giveJuryPoints(countryCode);
    },
    [giveJuryPoints],
  );

  return {
    votingCountry: getVotingCountry(),
    wasTheFirstPointsAwarded,
    hasCountryFinishedVoting,
    onClick,
  };
};
