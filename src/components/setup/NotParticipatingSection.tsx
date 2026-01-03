import { useTranslations } from 'next-intl';
import React from 'react';
import { toast } from 'react-toastify';

import { PlusIcon } from '../../assets/icons/PlusIcon';
import { BaseCountry, CountryAssignmentGroup } from '../../models';
import Button from '../common/Button';
import GoogleAuthButton from '../common/GoogleAuthButton';
import { Input } from '../Input';

import { CountrySelectionList } from './CountrySelectionList';
import { AvailableGroup } from './CountrySelectionListItem';
import { useCountrySearch } from './hooks/useCountrySearch';
import { useGetCategoryLabel } from './hooks/useGetCategoryLabel';
import SearchInputIcon from './SearchInputIcon';
import SectionWrapper from './SectionWrapper';

import { useBulkCreateCustomEntriesMutation } from '@/api/customEntries';
import { SaveIcon } from '@/assets/icons/SaveIcon';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';

interface NotParticipatingSectionProps {
  notParticipatingCountries: BaseCountry[];
  handleBulkCountryAssignment: (
    countries: BaseCountry[],
    group: string,
  ) => void;
  handleCountryAssignment: (countryCode: string, group: string) => void;
  getCountryGroupAssignment: (country: BaseCountry) => string;
  handleOpenEditModal: (country: BaseCountry) => void;
  handleOpenCreateModal: () => void;
  availableGroups: AvailableGroup[];
}

const NotParticipatingSection = ({
  notParticipatingCountries,
  handleBulkCountryAssignment,
  handleCountryAssignment,
  getCountryGroupAssignment,
  handleOpenEditModal,
  handleOpenCreateModal,
  availableGroups,
}: NotParticipatingSectionProps) => {
  const t = useTranslations('setup');
  const { user } = useAuthStore();
  const { importedCustomEntries, setImportedCustomEntries } = useGeneralStore();
  const bulkCreateMutation = useBulkCreateCustomEntriesMutation();
  const {
    countriesSearch,
    handleCountriesSearch,
    clearSearch,
    expandedCategories,
    handleToggleCategory,
    groupedNotParticipatingCountries,
    sortedCategories,
  } = useCountrySearch(notParticipatingCountries);

  // Filter out Imported category if empty
  const filteredSortedCategories = sortedCategories.filter(
    (category) =>
      !(
        category === 'Imported' &&
        groupedNotParticipatingCountries['Imported'].length === 0
      ),
  );

  const getCategoryLabel = useGetCategoryLabel();

  const { confirm } = useConfirmation();

  const handleSaveCustomEntries = () => {
    confirm({
      key: 'save-imported-custom-entries',
      title: t('eventSetupModal.areYouSureYouWantToSaveImportedEntries', {
        count: groupedNotParticipatingCountries['Imported'].length,
      }),
      description: t(
        'eventSetupModal.areYouSureYouWantToSaveImportedEntriesDescription',
      ),
      onConfirm: () => {
        const customEntries = groupedNotParticipatingCountries['Imported'].map(
          (country) => ({
            name: country.name,
            flagUrl: country.flag!,
          }),
        );

        bulkCreateMutation.mutate(
          { entries: customEntries },
          {
            onSuccess: () => {
              toast.success(
                t('eventSetupModal.customEntriesSavedSuccessfully', {
                  count: customEntries.length,
                }),
              );
              setImportedCustomEntries(
                importedCustomEntries.filter(
                  (entry) => !customEntries.some((c) => c.name === entry.name),
                ),
              );
            },
            onError: (error) => {
              console.error('Failed to save custom entries:', error);
              toast.error(t('eventSetupModal.failedToSaveCustomEntries'));
            },
          },
        );
      },
    });
  };

  const getExtraContent = (category: string) => {
    if (category === 'Imported') {
      return (
        <div className="flex flex-col items-start col-span-full gap-2">
          <p className="text-white/80 text-sm">
            {t('eventSetupModal.importedEntriesDescription')}
          </p>

          {user && (
            <Button
              onClick={handleSaveCustomEntries}
              variant="tertiary"
              Icon={<SaveIcon className="w-6 h-6" />}
              disabled={bulkCreateMutation.isPending}
              isLoading={bulkCreateMutation.isPending}
            >
              {t('eventSetupModal.saveToYourCustomEntries')}
            </Button>
          )}
        </div>
      );
    }

    if (category === 'Custom') {
      if (!user) {
        return (
          <div className="flex flex-col items-start col-span-full gap-2">
            <p className="text-white/80 text-sm">
              {t(
                'eventSetupModal.youNeedToBeLoggedInToCreateAndUseCustomEntries',
              )}
            </p>
            <GoogleAuthButton />
          </div>
        );
      }

      return (
        <Button
          onClick={handleOpenCreateModal}
          className="mr-1 !py-1 w-fit"
          title="Add Custom Country"
          aria-label="Add Custom Country"
        >
          <PlusIcon className="w-7 h-7" />
        </Button>
      );
    }

    return null;
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-white text-base md:text-lg font-semibold">
          {t('eventSetupModal.notParticipating')}
        </p>
        <div className="relative">
          <Input
            className="sm:w-[200px] lg:text-[0.95rem] text-sm pr-10"
            name="countriesSearch"
            id="countriesSearch"
            placeholder={t('eventSetupModal.searchCountries')}
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
        {filteredSortedCategories.map((category) => (
          <SectionWrapper
            key={category}
            title={getCategoryLabel(category)}
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
                ? (itemsCount) =>
                    t('eventSetupModal.entriesAmount', { count: itemsCount })
                : undefined
            }
          >
            <CountrySelectionList
              countries={groupedNotParticipatingCountries[category]}
              onAssignCountryAssignment={handleCountryAssignment}
              getCountryGroupAssignment={getCountryGroupAssignment}
              availableGroups={availableGroups}
              onEdit={handleOpenEditModal}
              extraContent={getExtraContent(category)}
            />
          </SectionWrapper>
        ))}
      </div>
    </>
  );
};

export default NotParticipatingSection;
