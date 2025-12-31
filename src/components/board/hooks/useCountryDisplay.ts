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

  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);

  const { countries } =
    eventStages.find((s) => s.id === viewedStageId) || getCurrentStage() || {};

  const allCountriesToDisplay = useMemo(() => {
    if (!showAllParticipants || !winnerCountry) {
      return countries;
    }

    // Get all unique countries that participated in any stage
    const allEventParticipantsMap = new Map<string, Country>();
    eventStages.forEach((stage) => {
      stage.countries.forEach((country) => {
        if (!allEventParticipantsMap.has(country.code)) {
          allEventParticipantsMap.set(country.code, country);
        }
      });
    });

    const allEventParticipants = Array.from(allEventParticipantsMap.values());

    // Merge with current stage's country data for points/state
    const countryMap = new Map<string, Country>(
      countries?.map((c) => [c.code, c]) ?? [],
    );

    return allEventParticipants.map((country) => {
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
  }, [countries, showAllParticipants, winnerCountry, eventStages]);

  return allCountriesToDisplay ?? [];
};
