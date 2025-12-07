import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import VotersCountriesSearch from '../event-stage/VotersCountriesSearch';
import VotersList from '../event-stage/VotersList';
import VotersSelectionHeader from '../event-stage/VotersSelectionHeader';

import { PostSetupStageFormData } from './hooks/usePostSetupStageForm';

import { BaseCountry, EventStage, VotingCountry } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';

const mapToVotingCountry = (country: BaseCountry) => ({
  code: country.code,
  name: country.name,
  flag: country.flag,
});

interface EventStageVotersProps {
  className?: string;
  stage: EventStage;
  onLoaded?: () => void;
}

const EventStageVoters: React.FC<EventStageVotersProps> = ({
  stage,
  onLoaded,
}) => {
  const { control, setValue } = useFormContext<PostSetupStageFormData>();
  const votingCountries = useWatch({
    control,
    name: 'votingCountries',
    defaultValue: [],
  }) as VotingCountry[];

  const [localVotingCountries, setLocalVotingCountries] = useState<
    VotingCountry[]
  >(votingCountries || []);

  const getInitialVotingCountries = useCountriesStore(
    (state) => state.getInitialVotingCountries,
  );

  const getContestParticipants = useCountriesStore(
    (state) => state.getContestParticipants,
  );

  const participatingVoters = useMemo(
    () => stage.countries.map(mapToVotingCountry),
    [stage.countries],
  );

  const initialVotingCountries = useMemo(
    () => getInitialVotingCountries(stage.id),
    [getInitialVotingCountries, stage.id],
  );

  // Helper to update both local state and form value without causing loops
  const setLocalVotingCountriesAndForm: React.Dispatch<
    React.SetStateAction<BaseCountry[]>
  > = useCallback(
    (updater) => {
      setLocalVotingCountries((prev) => {
        const next =
          typeof updater === 'function'
            ? (updater as (prev: BaseCountry[]) => BaseCountry[])(prev)
            : updater;

        // Keep form value in sync when local changes
        setValue('votingCountries', next as any, { shouldDirty: true });

        return next;
      });
    },
    [setLocalVotingCountries, setValue],
  );

  const handleAddVoter = (country: BaseCountry) => {
    if (!localVotingCountries.find((c) => c.code === country.code)) {
      setLocalVotingCountriesAndForm((prev) => [...prev, country]);
    }
  };

  const handleReset = () => {
    setLocalVotingCountriesAndForm(participatingVoters);
  };

  const handleClearAll = () => {
    setLocalVotingCountriesAndForm([]);
  };

  const handleSort = (sort: 'az' | 'za' | 'shuffle') => {
    let sortedCountries = [...localVotingCountries];

    if (sort === 'az') {
      sortedCountries = localVotingCountries.sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    } else if (sort === 'za') {
      sortedCountries = localVotingCountries.sort((a, b) =>
        b.name.localeCompare(a.name),
      );
    } else if (sort === 'shuffle') {
      sortedCountries = localVotingCountries.sort(() => Math.random() - 0.5);
    }

    setLocalVotingCountriesAndForm([...sortedCountries]);
  };

  const handleFilter = (
    action: 'inStage' | 'otherStage' | 'allParticipants' | 'yearData',
  ) => {
    if (action === 'yearData') {
      setLocalVotingCountriesAndForm(initialVotingCountries);
    } else if (action === 'inStage') {
      setLocalVotingCountriesAndForm(participatingVoters);
    } else {
      const contestParticipants =
        getContestParticipants().map(mapToVotingCountry);

      if (action === 'otherStage') {
        setLocalVotingCountriesAndForm(
          contestParticipants.filter(
            (c) => !participatingVoters.find((v) => v.code === c.code),
          ),
        );
      } else if (action === 'allParticipants') {
        setLocalVotingCountriesAndForm(contestParticipants);
      }
    }
  };

  // Load existing voting countries for this stage
  useEffect(() => {
    setLocalVotingCountriesAndForm(participatingVoters);

    onLoaded?.();
  }, [onLoaded, participatingVoters, setLocalVotingCountriesAndForm]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="space-y-3">
          <VotersSelectionHeader
            onReset={handleReset}
            onClearAll={handleClearAll}
            onSort={handleSort}
            votersAmount={localVotingCountries.length}
            handleFilter={handleFilter}
            disableLoadYearData={initialVotingCountries.length <= 1}
          />
          <VotersList
            localVotingCountries={localVotingCountries}
            setLocalVotingCountries={setLocalVotingCountriesAndForm}
            stageId={stage.id}
          />
        </div>
        <div className="h-px bg-primary-800 w-full my-4" />

        <VotersCountriesSearch
          localVotingCountries={localVotingCountries}
          onAddVoter={handleAddVoter}
          stageId={stage.id}
        />
      </div>
    </div>
  );
};

export default EventStageVoters;
