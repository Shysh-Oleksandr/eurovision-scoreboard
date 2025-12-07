import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';
import SortableList from 'react-easy-sort';

import { VoterItem } from './VoterItem';

import { BaseCountry } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';

interface VotersListProps {
  localVotingCountries: BaseCountry[];
  setLocalVotingCountries: React.Dispatch<React.SetStateAction<BaseCountry[]>>;
  stageId: string;
}

const VotersList: React.FC<VotersListProps> = ({
  localVotingCountries,
  setLocalVotingCountries,
  stageId,
}) => {
  const t = useTranslations('setup.eventStageModal');

  const allCountriesForYear = useCountriesStore(
    (state) => state.allCountriesForYear,
  );

  const currentVotingCountries = useMemo(
    () =>
      localVotingCountries.map((country) => ({
        ...country,
        aqSemiFinalGroup: allCountriesForYear.find(
          (c) => c.code === country.code,
        )?.aqSemiFinalGroup,
      })),
    [allCountriesForYear, localVotingCountries],
  );

  const handleSortEnd = (oldIndex: number, newIndex: number) => {
    const newVotingCountries = [...localVotingCountries];
    const [movedItem] = newVotingCountries.splice(oldIndex, 1);

    newVotingCountries.splice(newIndex, 0, movedItem);
    setLocalVotingCountries(newVotingCountries);
  };

  const handleRemoveVoter = (countryCode: string) => {
    setLocalVotingCountries((prev) =>
      prev.filter((country) => country.code !== countryCode),
    );
  };

  return (
    <>
      {currentVotingCountries.length === 0 ? (
        <p className="text-white/60 text-sm">
          {t('noVotingCountriesSelected')}
        </p>
      ) : (
        <SortableList
          onSortEnd={handleSortEnd}
          className="grid lg:grid-cols-5 sm:grid-cols-4 2cols:grid-cols-3 grid-cols-2 gap-2"
          draggedItemClassName="dragged"
        >
          {currentVotingCountries.map((country) => (
            <VoterItem
              key={country.code}
              id={country.code}
              country={country}
              stageId={stageId}
              onRemove={() => handleRemoveVoter(country.code)}
            />
          ))}
        </SortableList>
      )}
    </>
  );
};

export default VotersList;
