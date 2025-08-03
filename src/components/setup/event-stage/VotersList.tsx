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
        <p className="text-gray-400 text-sm">
          No voting countries selected. Add countries from the list below.
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
