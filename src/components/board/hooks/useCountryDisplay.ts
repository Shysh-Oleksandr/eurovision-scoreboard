import { useMemo } from 'react';

import { Country } from '../../../models';
import { useCountriesStore } from '../../../state/countriesStore';
import { useScoreboardStore } from '../../../state/scoreboardStore';

export const useCountryDisplay = () => {
  const { countries, winnerCountry, showAllParticipants } =
    useScoreboardStore();
  const { selectedCountries } = useCountriesStore();

  const allCountriesToDisplay = useMemo(() => {
    if (!showAllParticipants || !winnerCountry) {
      return countries;
    }

    const countryMap = new Map<string, Country>(
      countries.map((c) => [c.code, c]),
    );

    const allEventParticipants = selectedCountries.map((country) => {
      const existingCountry = countryMap.get(country.code);

      return {
        ...country,
        points: existingCountry?.points ?? -1,
        lastReceivedPoints: existingCountry?.lastReceivedPoints ?? 0,
        isVotingFinished: existingCountry?.isVotingFinished ?? true,
      };
    });

    return allEventParticipants;
  }, [countries, showAllParticipants, winnerCountry, selectedCountries]);

  return allCountriesToDisplay;
};
