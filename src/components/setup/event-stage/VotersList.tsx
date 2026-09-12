import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

import { CountrySortableItem } from './CountrySortableItem';

import { SortableList } from '@/components/common/sort/SortableList';
import { BaseCountry, VoterChannelMode, VoterChannels } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';
import { getVoterChannelMode } from '@/state/scoreboard/voterChannels';

interface VotersListProps {
  localVotingCountries: BaseCountry[];
  setLocalVotingCountries: React.Dispatch<React.SetStateAction<BaseCountry[]>>;
  stageId: string;
  /** When provided, chips show channel badges (and toggles in editing mode). */
  voterChannels?: VoterChannels;
  showChannelControls?: boolean;
  onChannelModeChange?: (code: string, mode: VoterChannelMode) => void;
}

const VotersList: React.FC<VotersListProps> = ({
  localVotingCountries,
  setLocalVotingCountries,
  stageId,
  voterChannels,
  showChannelControls = false,
  onChannelModeChange,
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
          // The J / T toggles need room next to the name, so widen the chips
          // (5 → 3 columns on desktop, 2 → 1 on phones) while editing channels.
          className={`grid gap-x-2 lg:gap-y-3 gap-y-[10px] ${
            showChannelControls
              ? 'lg:grid-cols-4 sm:grid-cols-3 2xs:grid-cols-2 grid-cols-1'
              : 'lg:grid-cols-5 sm:grid-cols-4 2cols:grid-cols-3 grid-cols-2'
          }`}
          draggedItemClassName="dragged"
        >
          {currentVotingCountries.map((country) => (
            <CountrySortableItem
              key={country.code}
              id={country.code}
              country={country}
              stageId={stageId}
              onRemove={() => handleRemoveVoter(country.code)}
              channelMode={
                onChannelModeChange
                  ? getVoterChannelMode(country.code, voterChannels)
                  : undefined
              }
              showChannelControls={showChannelControls}
              onChannelModeChange={
                onChannelModeChange
                  ? (mode) => onChannelModeChange(country.code, mode)
                  : undefined
              }
            />
          ))}
        </SortableList>
      )}
    </>
  );
};

export default VotersList;
