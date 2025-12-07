import { useCallback, useMemo } from 'react';

import { useCountriesStore } from '../../../state/countriesStore';
import { useScoreboardStore } from '../../../state/scoreboardStore';

import { useGeneralStore } from '@/state/generalStore';

export const useVoting = () => {
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const giveJuryPoints = useScoreboardStore((state) => state.giveJuryPoints);
  const giveTelevotePoints = useScoreboardStore(
    (state) => state.giveTelevotePoints,
  );
  const giveManualTelevotePointsInRevealMode = useScoreboardStore(
    (state) => state.giveManualTelevotePointsInRevealMode,
  );
  const getVotingCountry = useCountriesStore((state) => state.getVotingCountry);
  const currentRevealTelevotePoints = useScoreboardStore(
    (state) => state.currentRevealTelevotePoints,
  );
  const pointsSystem = useGeneralStore((state) => state.pointsSystem);
  const revealTelevoteLowestToHighest = useGeneralStore(
    (state) => state.settings.revealTelevoteLowestToHighest,
  );

  const MAX_COUNTRY_WITH_POINTS = pointsSystem.length;

  const { countries, isJuryVoting } = getCurrentStage() || {};

  const { countriesWithPointsLength, wasTheFirstPointsAwarded } =
    useMemo(() => {
      let length = 0;
      let hasPoints = false;

      for (const country of countries ?? []) {
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
    () => countriesWithPointsLength === MAX_COUNTRY_WITH_POINTS && isJuryVoting,
    [MAX_COUNTRY_WITH_POINTS, countriesWithPointsLength, isJuryVoting],
  );

  const onClick = useCallback(
    (countryCode: string) => {
      if (revealTelevoteLowestToHighest && !isJuryVoting) {
        // In reveal mode, route through action that also swaps predefined votes if needed
        giveManualTelevotePointsInRevealMode(countryCode);
      } else {
        // Normal mode - give jury points
        giveJuryPoints(countryCode);
      }
    },
    [
      revealTelevoteLowestToHighest,
      isJuryVoting,
      currentRevealTelevotePoints,
      giveManualTelevotePointsInRevealMode,
      giveTelevotePoints,
      giveJuryPoints,
    ],
  );

  return {
    votingCountry: getVotingCountry(),
    wasTheFirstPointsAwarded,
    hasCountryFinishedVoting,
    onClick,
  };
};
