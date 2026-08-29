import { useMemo } from 'react';

import { Country } from '../../../models';
import { useScoreboardStore } from '../../../state/scoreboardStore';

import { SENTINEL } from '@/data/data';
import { toFixedIfDecimalFloat } from '@/helpers/toFixedIfDecimal';

export const useCountryDisplay = () => {
  const winnerCountry = useScoreboardStore((state) => state.winnerCountry);

  // Narrow subscription: only the viewed stage's countries array. Subscribing
  // to the whole `eventStages` array here re-rendered the entire board hook
  // tree on every award.
  const countries = useScoreboardStore((state) => {
    const stage =
      state.eventStages.find((s) => s.id === state.viewedStageId) ||
      state.getCurrentStage();

    return stage?.countries;
  });

  // The all-participants merge is the only consumer of every stage; keep the
  // wide subscription scoped to that mode so it costs nothing during voting.
  const allStagesForParticipantsView = useScoreboardStore((state) =>
    state.showAllParticipants && state.winnerCountry ? state.eventStages : null,
  );

  const allCountriesToDisplay = useMemo(() => {
    if (!allStagesForParticipantsView || !winnerCountry) {
      return countries;
    }

    // Get all unique countries that participated in any stage
    const allEventParticipantsMap = new Map<string, Country>();

    allStagesForParticipantsView.forEach((stage) => {
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
        points: toFixedIfDecimalFloat(existingCountry?.points ?? SENTINEL),
        lastReceivedPoints: existingCountry?.lastReceivedPoints ?? SENTINEL,
        isVotingFinished: existingCountry?.isVotingFinished ?? true,
      };
    });
  }, [countries, winnerCountry, allStagesForParticipantsView]);

  return allCountriesToDisplay ?? [];
};
