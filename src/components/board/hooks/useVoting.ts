import { useCallback, useEffect, useMemo, useRef } from 'react';

import { ANIMATION_DURATION, POINTS_ARRAY } from '../../../data/data';
import { useCountriesStore } from '../../../state/countriesStore';
import { useScoreboardStore } from '../../../state/scoreboardStore';

const MAX_COUNTRY_WITH_POINTS = POINTS_ARRAY.length;

export const useVoting = () => {
  const {
    getCurrentStage,
    giveJuryPoints,
    resetLastPoints,
    shouldShowLastPoints,
  } = useScoreboardStore();
  const { getVotingCountry } = useCountriesStore();

  const { countries } = getCurrentStage();

  const timerId = useRef<number | null>(null);

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
    [countriesWithPointsLength],
  );

  const handleResetPoints = useCallback(() => {
    if (timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }
    resetLastPoints();
  }, [resetLastPoints]);

  const onClick = useCallback(
    (countryCode: string) => {
      if (countriesWithPointsLength >= MAX_COUNTRY_WITH_POINTS) {
        handleResetPoints();
      }
      if (countriesWithPointsLength === MAX_COUNTRY_WITH_POINTS - 1) {
        timerId.current = setTimeout(handleResetPoints, ANIMATION_DURATION);
      }
      giveJuryPoints(countryCode);
    },
    [countriesWithPointsLength, giveJuryPoints, handleResetPoints],
  );

  useEffect(() => {
    if (!shouldShowLastPoints && timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }
  }, [shouldShowLastPoints]);

  return {
    votingCountry: getVotingCountry(),
    wasTheFirstPointsAwarded,
    hasCountryFinishedVoting,
    onClick,
  };
};
