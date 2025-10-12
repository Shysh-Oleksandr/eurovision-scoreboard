import React, { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { EventStageFormData } from './hooks';
import VotersCountriesSearch from './VotersCountriesSearch';
import VotersList from './VotersList';
import VotersSelectionHeader from './VotersSelectionHeader';

import { BaseCountry } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';

interface EventStageVotersProps {
  className?: string;
  stageId?: string;
  onLoaded?: () => void;
}

const EventStageVoters: React.FC<EventStageVotersProps> = ({
  stageId,
  onLoaded,
}) => {
  const { control, setValue } = useFormContext<EventStageFormData>();
  const votingCountries = useWatch({
    control,
    name: 'votingCountries',
    defaultValue: [],
  }) as BaseCountry[];

  const syncVotersWithParticipants = !!useWatch({
    control,
    name: 'syncVotersWithParticipants',
    defaultValue: true,
  });

  const [localVotingCountries, setLocalVotingCountries] = useState<
    BaseCountry[]
  >(votingCountries || []);

  const getInitialVotingCountries = useCountriesStore(
    (state) => state.getInitialVotingCountries,
  );
  const getStageVotingCountries = useCountriesStore(
    (state) => state.getStageVotingCountries,
  );

  // Load existing voting countries for this stage if editing
  useEffect(() => {
    if (stageId) {
      const existingVotingCountries = getStageVotingCountries(stageId, false);

      if (existingVotingCountries.length > 0) {
        setLocalVotingCountries(existingVotingCountries);
        setValue('votingCountries', existingVotingCountries as any);
      }

      onLoaded?.();
    }
  }, [stageId, getStageVotingCountries, setValue, onLoaded]);

  // Update local state when form value changes
  useEffect(() => {
    setLocalVotingCountries(votingCountries || []);
  }, [votingCountries]);

  // Helper to update both local state and form value without causing loops
  const setLocalVotingCountriesAndForm: React.Dispatch<
    React.SetStateAction<BaseCountry[]>
  > = (updater) => {
    setLocalVotingCountries((prev) => {
      const next =
        typeof updater === 'function'
          ? (updater as (prev: BaseCountry[]) => BaseCountry[])(prev)
          : updater;

      // Keep form value in sync when local changes
      setValue('votingCountries', next as any, { shouldDirty: true });

      return next;
    });
  };

  const handleAddVoter = (country: BaseCountry) => {
    if (!localVotingCountries.find((c) => c.code === country.code)) {
      setLocalVotingCountriesAndForm((prev) => [...prev, country]);
    }
  };

  const handleReset = () => {
    setLocalVotingCountriesAndForm(
      getInitialVotingCountries(stageId).initialVotingCountries,
    );
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

  const handleSyncVotersChange = (sync: boolean) => {
    setValue('syncVotersWithParticipants', sync, { shouldDirty: true });
  };

  return (
    <div className="flex flex-col gap-4 p-2">
      <div>
        <div>
          <VotersSelectionHeader
            onReset={handleReset}
            onSort={handleSort}
            syncVotersWithParticipants={syncVotersWithParticipants}
            onSyncVotersChange={handleSyncVotersChange}
            votersAmount={localVotingCountries.length}
          />
          <VotersList
            localVotingCountries={localVotingCountries}
            setLocalVotingCountries={setLocalVotingCountriesAndForm}
          />
        </div>
        <div className="h-px bg-primary-800 w-full sm:my-6 my-4" />

        <VotersCountriesSearch
          localVotingCountries={localVotingCountries}
          onAddVoter={handleAddVoter}
        />
      </div>
    </div>
  );
};

export default EventStageVoters;
