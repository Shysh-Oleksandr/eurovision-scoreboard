import React from 'react';

import { PlusIcon } from '../../assets/icons/PlusIcon';
import { BaseCountry, CountryAssignmentGroup, EventMode } from '../../models';
import Button from '../Button';

import { GRAND_FINAL_GROUPS, SEMI_FINALS_GROUPS } from './constants';
import { CountrySelectionList } from './CountrySelectionList';
import { useCountrySearch } from './hooks/useCountrySearch';
import SearchInputIcon from './SearchInputIcon';
import SectionWrapper from './SectionWrapper';

interface NotParticipatingSectionProps {
  notParticipatingCountries: BaseCountry[];
  activeTab: EventMode;
  handleBulkCountryAssignment: (
    countries: BaseCountry[],
    group: CountryAssignmentGroup,
  ) => void;
  handleCountryAssignment: (
    countryCode: string,
    group: CountryAssignmentGroup,
  ) => void;
  getCountryGroupAssignment: (country: BaseCountry) => CountryAssignmentGroup;
  handleOpenEditModal: (country: BaseCountry) => void;
  handleOpenCreateModal: () => void;
}

const NotParticipatingSection = ({
  notParticipatingCountries,
  activeTab,
  handleBulkCountryAssignment,
  handleCountryAssignment,
  getCountryGroupAssignment,
  handleOpenEditModal,
  handleOpenCreateModal,
}: NotParticipatingSectionProps) => {
  const {
    countriesSearch,
    handleCountriesSearch,
    clearSearch,
    expandedCategories,
    handleToggleCategory,
    groupedNotParticipatingCountries,
    sortedCategories,
  } = useCountrySearch(notParticipatingCountries);

  const availableGroups =
    activeTab === EventMode.GRAND_FINAL_ONLY
      ? GRAND_FINAL_GROUPS
      : SEMI_FINALS_GROUPS;

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-white text-base md:text-lg font-semibold">
          Not Participating
        </p>
        <div className="relative">
          <input
            className="sm:max-w-[200px] w-full py-3 pl-3 pr-10 rounded-md bg-primary-900 bg-gradient-to-bl from-[10%] from-primary-900 to-primary-800/60 transition-colors duration-300 placeholder:text-white/55 text-white lg:text-[0.95rem] text-sm border-solid border-transparent border-b-2 hover:bg-primary-800 focus:bg-primary-800 focus:border-white "
            name="countriesSearch"
            id="countriesSearch"
            placeholder="Search countries..."
            value={countriesSearch}
            onChange={handleCountriesSearch}
          />
          <SearchInputIcon
            showClearIcon={countriesSearch.length > 0}
            onClick={() => countriesSearch.length > 0 && clearSearch()}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {sortedCategories.map((category) => (
          <SectionWrapper
            key={category}
            title={category}
            countriesCount={groupedNotParticipatingCountries[category].length}
            isExpanded={!!expandedCategories[category]}
            onToggle={() => handleToggleCategory(category)}
            onBulkAssign={(group) =>
              handleBulkCountryAssignment(
                groupedNotParticipatingCountries[category],
                group,
              )
            }
            availableGroups={availableGroups}
            currentGroup={CountryAssignmentGroup.NOT_PARTICIPATING}
            getLabel={
              category === 'Custom'
                ? (itemsCount) => (itemsCount === 1 ? 'entry' : 'entries')
                : undefined
            }
          >
            <CountrySelectionList
              countries={groupedNotParticipatingCountries[category]}
              onAssignCountryAssignment={handleCountryAssignment}
              getCountryGroupAssignment={getCountryGroupAssignment}
              availableGroups={availableGroups}
              onEdit={handleOpenEditModal}
              extraContent={
                category === 'Custom' && (
                  <Button
                    onClick={handleOpenCreateModal}
                    className="normal-case sm:!text-base !text-sm mr-1 !py-2 w-fit"
                  >
                    <PlusIcon className="w-6 h-6" />
                  </Button>
                )
              }
            />
          </SectionWrapper>
        ))}
      </div>
    </>
  );
};

export default NotParticipatingSection;
