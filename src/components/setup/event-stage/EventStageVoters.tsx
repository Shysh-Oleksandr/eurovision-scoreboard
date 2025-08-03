import React, { useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import VotersCountriesSearch from './VotersCountriesSearch';
import VotersList from './VotersList';
import VotersSelectionHeader from './VotersSelectionHeader';

import { BaseCountry } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';

interface EventStageVotersProps {
  className?: string;
  stageId?: string;
}

const EventStageVoters: React.FC<EventStageVotersProps> = ({ stageId }) => {
  const { watch, setValue } = useFormContext();
  const votingCountries = useMemo(
    () => watch('votingCountries') || [],
    [watch],
  );

  const [localVotingCountries, setLocalVotingCountries] =
    useState<BaseCountry[]>(votingCountries);

  const getInitialVotingCountries = useCountriesStore(
    (state) => state.getInitialVotingCountries,
  );
  const getStageVotingCountries = useCountriesStore(
    (state) => state.getStageVotingCountries,
  );

  // Load existing voting countries for this stage if editing
  useEffect(() => {
    if (stageId) {
      const existingVotingCountries = getStageVotingCountries(stageId);

      if (existingVotingCountries.length > 0) {
        setLocalVotingCountries(existingVotingCountries);
        setValue('votingCountries', existingVotingCountries);
      }
    }
  }, [stageId, getStageVotingCountries, setValue]);

  // Update local state when form value changes
  useEffect(() => {
    setLocalVotingCountries(votingCountries);
  }, [votingCountries]);

  // Update form value when local state changes
  useEffect(() => {
    setValue('votingCountries', localVotingCountries);
  }, [localVotingCountries, setValue]);

  const handleAddVoter = (country: BaseCountry) => {
    if (!localVotingCountries.find((c) => c.code === country.code)) {
      setLocalVotingCountries((prev) => [...prev, country]);
    }
  };

  const handleReset = () => {
    setLocalVotingCountries(getInitialVotingCountries(stageId));
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

    setLocalVotingCountries([...sortedCountries]);
  };

  return (
    <div className="flex flex-col gap-4 p-2">
      <div>
        <div>
          <VotersSelectionHeader onReset={handleReset} onSort={handleSort} />
          <VotersList
            localVotingCountries={localVotingCountries}
            setLocalVotingCountries={setLocalVotingCountries}
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
