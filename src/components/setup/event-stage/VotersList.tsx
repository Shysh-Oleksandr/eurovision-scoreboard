import { useTranslations } from 'next-intl';
import React from 'react';
import SortableList from 'react-easy-sort';

import { VoterItem } from './VoterItem';

import { BaseCountry } from '@/models';

interface VotersListProps {
  localVotingCountries: BaseCountry[];
  setLocalVotingCountries: React.Dispatch<React.SetStateAction<BaseCountry[]>>;
}

const VotersList: React.FC<VotersListProps> = ({
  localVotingCountries,
  setLocalVotingCountries,
}) => {
  const t = useTranslations('setup.eventStageModal');
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
      {localVotingCountries.length === 0 ? (
        <p className="text-white/60 text-sm">
          {t('noVotingCountriesSelected')}
        </p>
      ) : (
        <SortableList
          onSortEnd={handleSortEnd}
          className="grid lg:grid-cols-5 sm:grid-cols-4 2cols:grid-cols-3 grid-cols-2 gap-2"
          draggedItemClassName="dragged"
        >
          {localVotingCountries.map((country) => (
            <VoterItem
              key={country.code}
              id={country.code}
              country={country}
              onRemove={() => handleRemoveVoter(country.code)}
            />
          ))}
        </SortableList>
      )}
    </>
  );
};

export default VotersList;
