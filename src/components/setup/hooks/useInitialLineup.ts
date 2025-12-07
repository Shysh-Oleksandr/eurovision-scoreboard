import { useEffect } from 'react';

import { EventStage, StageId, StageVotingMode } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';

export const useInitialLineup = () => {
  const isGfOnly = useGeneralStore((state) => state.isGfOnly);
  const eventSetupModalOpen = useCountriesStore(
    (state) => state.eventSetupModalOpen,
  );
  const allCountriesForYear = useCountriesStore(
    (state) => state.allCountriesForYear,
  );
  const configuredEventStages = useCountriesStore(
    (state) => state.configuredEventStages,
  );
  const setConfiguredEventStages = useCountriesStore(
    (state) => state.setConfiguredEventStages,
  );

  useEffect(() => {
    if (!eventSetupModalOpen) return;
    if (configuredEventStages.length > 0 || allCountriesForYear.length === 0)
      return;

    const sf1Id = StageId.SF1;
    const sf2Id = StageId.SF2;
    const gfId = StageId.GF;

    const hasSf1 = allCountriesForYear.some(
      (c) => c.semiFinalGroup?.toLowerCase() === sf1Id.toLowerCase(),
    );
    const hasSf2 = allCountriesForYear.some(
      (c) => c.semiFinalGroup?.toLowerCase() === sf2Id.toLowerCase(),
    );
    const initialStages: EventStage[] = [];

    let order = 0;

    if (hasSf1 && !isGfOnly) {
      initialStages.push({
        id: sf1Id,
        name: `Semi-Final${hasSf2 ? ' 1' : ''}`,
        order: order++,
        votingMode: StageVotingMode.TELEVOTE_ONLY,
        qualifiersAmount: 10,
        qualifiesTo: [{ targetStageId: gfId, amount: 10 }],
        countries: [],
        isOver: false,
        isJuryVoting: false,
      });
    }
    if (hasSf2 && !isGfOnly) {
      initialStages.push({
        id: sf2Id,
        name: 'Semi-Final 2',
        order: order++,
        votingMode: StageVotingMode.TELEVOTE_ONLY,
        qualifiersAmount: 10,
        qualifiesTo: [{ targetStageId: gfId, amount: 10 }],
        countries: [],
        isOver: false,
        isJuryVoting: false,
      });
    }
    initialStages.push({
      id: gfId,
      name: 'Grand Final',
      order: order++,
      votingMode: StageVotingMode.JURY_AND_TELEVOTE,
      countries: [],
      isOver: false,
      isJuryVoting: false,
    });
    setConfiguredEventStages(initialStages);
  }, [
    eventSetupModalOpen,
    allCountriesForYear,
    configuredEventStages.length,
    setConfiguredEventStages,
    isGfOnly,
  ]);
};
