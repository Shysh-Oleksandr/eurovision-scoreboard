import { useCallback, useMemo } from 'react';

import { useShallow } from 'zustand/shallow';

import { useCountriesStore } from '../../../state/countriesStore';
import { useScoreboardStore } from '../../../state/scoreboardStore';

import { useGeneralStore } from '@/state/generalStore';

export const useVoting = () => {
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
  const globalPointsSystem = useGeneralStore((state) => state.pointsSystem);
  const revealTelevoteLowestToHighest = useGeneralStore(
    (state) => state.settings.revealTelevoteLowestToHighest,
  );
  const globalAllowMultiple = useGeneralStore(
    (state) => state.settings.allowMultiplePointsToSameEntry,
  );
  const stagePointsOverride = useScoreboardStore(
    (state) => state.getCurrentStage()?.overrides?.pointsSystem ?? null,
  );

  const allowMultiplePointsToSameEntry =
    stagePointsOverride?.allowMultiplePointsToSameEntry ?? globalAllowMultiple;
  const MAX_COUNTRY_WITH_POINTS =
    stagePointsOverride?.pointsSystem.length ?? globalPointsSystem.length;

  // Reactive narrow reads: the countries array reference changes only when an
  // award actually lands, so voting state stays fresh without a board-wide
  // `eventStages` subscription. `votingCountryIndex` is subscribed explicitly
  // because `getVotingCountry()` below reads it imperatively — without this,
  // its freshness would silently depend on every index write also changing
  // the countries array reference.
  const { countries, isJuryVoting } = useScoreboardStore(
    useShallow((state) => {
      const currentStage = state.getCurrentStage();

      return {
        countries: currentStage?.countries,
        isJuryVoting: currentStage?.isJuryVoting,
      };
    }),
  );

  useScoreboardStore((state) => state.votingCountryIndex);

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
    () =>
      !allowMultiplePointsToSameEntry &&
      countriesWithPointsLength === MAX_COUNTRY_WITH_POINTS &&
      isJuryVoting,
    [
      allowMultiplePointsToSameEntry,
      MAX_COUNTRY_WITH_POINTS,
      countriesWithPointsLength,
      isJuryVoting,
    ],
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
