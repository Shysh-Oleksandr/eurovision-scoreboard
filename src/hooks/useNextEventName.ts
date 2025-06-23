import { useMemo } from 'react';

import { EventPhase } from '../models';
import { useCountriesStore } from '../state/countriesStore';
import { useScoreboardStore } from '../state/scoreboardStore';

export const useNextEventName = () => {
  const { selectedCountries } = useCountriesStore();
  const { eventPhase } = useScoreboardStore();
  const hasOneSemiFinal = useMemo(
    () =>
      selectedCountries.filter((country) => country.semiFinalGroup === 'SF2')
        .length === 0,
    [selectedCountries],
  );
  const isSemiFinal1 = eventPhase === EventPhase.SEMI_FINAL_1;
  const nextPhase =
    isSemiFinal1 && !hasOneSemiFinal ? 'Semi-Final 2' : 'Grand Final';

  return { nextPhase, hasOneSemiFinal };
};
