import { useMemo } from 'react';

import { Country } from '../../../models';
import { useCountriesStore } from '../../../state/countriesStore';
import { useScoreboardStore } from '../../../state/scoreboardStore';
import { SENTINEL } from '@/data/data';

export const useCountryDisplay = () => {
  const winnerCountry = useScoreboardStore((state) => state.winnerCountry);
  const showAllParticipants = useScoreboardStore(
    (state) => state.showAllParticipants,
  );
  const viewedStageId = useScoreboardStore((state) => state.viewedStageId);
  const eventStages = useScoreboardStore((state) => state.eventStages);

  const selectedCountries = useCountriesStore(
    (state) => state.selectedCountries,
  );

  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);

  const { countries } =
    eventStages.find((s) => s.id === viewedStageId) || getCurrentStage() || {};

  const allCountriesToDisplay = useMemo(() => {
    if (!showAllParticipants || !winnerCountry) {
      return countries;
    }

    const countryMap = new Map<string, Country>(
      countries?.map((c) => [c.code, c]) ?? [],
    );

    const allEventParticipants = selectedCountries.map((country) => {
      const existingCountry = countryMap.get(country.code);

      return {
        ...country,
        juryPoints: existingCountry?.juryPoints ?? 0,
        televotePoints: existingCountry?.televotePoints ?? 0,
        points: existingCountry?.points ?? SENTINEL,
        lastReceivedPoints: existingCountry?.lastReceivedPoints ?? SENTINEL,
        isVotingFinished: existingCountry?.isVotingFinished ?? true,
      };
    });

    return allEventParticipants;
  }, [countries, showAllParticipants, winnerCountry, selectedCountries]);

  return allCountriesToDisplay ?? [];
};
