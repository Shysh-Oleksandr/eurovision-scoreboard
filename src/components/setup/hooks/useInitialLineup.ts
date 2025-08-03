import { useEffect } from 'react';

import { EventStage, StageId, StageVotingMode } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';

export const useInitialLineup = () => {
  const eventSetupModalOpen = useCountriesStore(
    (state) => state.eventSetupModalOpen,
  );
  const loadCustomCountries = useCountriesStore(
    (state) => state.loadCustomCountries,
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
  const getInitialVotingCountries = useCountriesStore(
    (state) => state.getInitialVotingCountries,
  );

  useEffect(() => {
    loadCustomCountries();
  }, [loadCustomCountries]);

  useEffect(() => {
    if (!eventSetupModalOpen) return;
    if (configuredEventStages.length > 0) return;

    const hasSf1 = allCountriesForYear.some((c) => c.semiFinalGroup === 'SF1');
    const hasSf2 = allCountriesForYear.some((c) => c.semiFinalGroup === 'SF2');
    const initialStages: EventStage[] = [];

    if (hasSf1) {
      initialStages.push({
        id: StageId.SF1,
        name: `Semi-Final${hasSf2 ? ' 1' : ''}`,
        votingMode: StageVotingMode.TELEVOTE_ONLY,
        qualifiersAmount: 10,
        countries: [],
        isOver: false,
        isJuryVoting: false,
        votingCountries: getInitialVotingCountries(StageId.SF1),
      });
    }
    if (hasSf2) {
      initialStages.push({
        id: StageId.SF2,
        name: 'Semi-Final 2',
        votingMode: StageVotingMode.TELEVOTE_ONLY,
        qualifiersAmount: 10,
        countries: [],
        isOver: false,
        isJuryVoting: false,
        votingCountries: getInitialVotingCountries(StageId.SF2),
      });
    }
    initialStages.push({
      id: StageId.GF,
      name: 'Grand Final',
      votingMode: StageVotingMode.JURY_AND_TELEVOTE,
      countries: [],
      isOver: false,
      isJuryVoting: false,
      votingCountries: getInitialVotingCountries(StageId.GF),
    });
    setConfiguredEventStages(initialStages);
  }, [
    eventSetupModalOpen,
    allCountriesForYear,
    configuredEventStages.length,
    setConfiguredEventStages,
    getInitialVotingCountries,
  ]);
};
