import { FolderPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useCallback, useState } from 'react';
import { toast } from 'react-toastify';

import { PlusIcon } from '../../assets/icons/PlusIcon';
import { BaseCountry, CountryAssignmentGroup } from '../../models';
import Button from '../common/Button';
import GoogleAuthButton from '../common/GoogleAuthButton';
import { Input } from '../Input';

import { CountrySelectionList } from './CountrySelectionList';
import { AvailableGroup } from './CountrySelectionListItem';
import CustomEntryGroupModal from './CustomEntryGroupModal';
import { useCountrySearch } from './hooks/useCountrySearch';
import { useGetCategoryLabel } from './hooks/useGetCategoryLabel';
import SearchInputIcon from './SearchInputIcon';
import SectionWrapper from './SectionWrapper';
import { getCustomEntryId } from './utils/getCustomEntryId';

import {
  useBulkAssignCustomEntryGroupMutation,
  useBulkCreateCustomEntriesMutation,
  useBulkDeleteCustomEntriesMutation,
  useCustomEntryGroupsQuery,
} from '@/api/customEntries';
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

const UNGROUPED_KEY = '__ungrouped__';

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
  const { data: customEntryGroups = [] } = useCustomEntryGroupsQuery(!!user);
  const { mutateAsync: bulkAssignToGroup } =
    useBulkAssignCustomEntryGroupMutation();
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<{
    _id: string;
    name: string;
  } | null>(null);
  const {
    countriesSearch,
    handleCountriesSearch,
    clearSearch,
    expandedCategories,
    handleToggleCategory,
    groupedNotParticipatingCountries,
    sortedCategories,
  } = useCountrySearch(notParticipatingCountries);

  const { mutateAsync: bulkDeleteCustomEntries } =
    useBulkDeleteCustomEntriesMutation();

  const handleBulkDeleteCustomEntries = useCallback(
    (countries: BaseCountry[]) => {
      bulkDeleteCustomEntries(
        countries.map((c) => getCustomEntryId(c.code) || '').filter(Boolean),
      );
    },
    [bulkDeleteCustomEntries],
  );

  const handleBulkAssignToCustomEntryGroup = useCallback(
    (countries: BaseCountry[], groupId: string | null) => {
      const entryIds = countries
        .map((c) => getCustomEntryId(c.code))
        .filter((id): id is string => !!id);

      if (entryIds.length === 0) return;

      bulkAssignToGroup({ groupId, entryIds });
    },
    [bulkAssignToGroup],
  );

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
        <div className="flex items-center gap-1">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenCreateModal();
            }}
            className="!py-1 !px-4 h-[30px]"
            title="Add Custom Country"
            aria-label="Add Custom Country"
            variant="tertiary"
          >
            <PlusIcon className="w-6 h-6" />
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setGroupToEdit(null);
              setGroupModalOpen(true);
            }}
            className="!py-1 !px-4 h-[30px]"
            title="Add Group"
            aria-label="Add Group"
          >
            <FolderPlus className="w-6 h-6" />
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <CustomEntryGroupModal
        isOpen={groupModalOpen}
        onClose={() => {
          setGroupModalOpen(false);
          setGroupToEdit(null);
        }}
        groupToEdit={groupToEdit}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-white text-base md:text-lg font-semibold">
          {t('eventSetupModal.notParticipating')}
        </p>
        <div className="relative">
          <Input
            className="sm:w-[200px] pr-10"
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
        {filteredSortedCategories.map((category) => {
          const countries = groupedNotParticipatingCountries[category];

          if (category === 'Custom' && user) {
            const groupedByCustomEntryGroup: Record<string, BaseCountry[]> = {
              [UNGROUPED_KEY]: [],
            };

            for (const g of customEntryGroups) {
              groupedByCustomEntryGroup[g._id] = [];
            }

            const validGroupIds = new Set(customEntryGroups.map((g) => g._id));

            countries.forEach((c) => {
              const gid =
                c.groupId && validGroupIds.has(c.groupId)
                  ? c.groupId
                  : UNGROUPED_KEY;

              if (!groupedByCustomEntryGroup[gid]) {
                groupedByCustomEntryGroup[gid] = [];
              }

              groupedByCustomEntryGroup[gid].push(c);
            });

            const groupSections: {
              id: string | null;
              title: string;
              countries: BaseCountry[];
            }[] = [
              {
                id: UNGROUPED_KEY,
                title: t('customCountryModal.noGroup'),
                countries: groupedByCustomEntryGroup[UNGROUPED_KEY] ?? [],
              },
              ...customEntryGroups.map((g) => ({
                id: g._id,
                title: g.name,
                countries: groupedByCustomEntryGroup[g._id] ?? [],
              })),
            ];

            return (
              <SectionWrapper
                key={category}
                title={getCategoryLabel(category)}
                category={category}
                countries={countries}
                isExpanded={!!expandedCategories[category]}
                onToggle={() => handleToggleCategory(category)}
                onBulkAssign={(cs, group) =>
                  handleBulkCountryAssignment(cs, group)
                }
                onBulkDelete={handleBulkDeleteCustomEntries}
                availableGroups={availableGroups}
                currentGroup={CountryAssignmentGroup.NOT_PARTICIPATING}
                getLabel={(itemsCount) =>
                  t('eventSetupModal.entriesAmount', { count: itemsCount })
                }
                extraContent={getExtraContent(category)}
                extraContentClassName={
                  category === 'Custom' ? 'flex-row-reverse' : ''
                }
              >
                <div className="flex flex-col gap-2">
                  {groupSections.map((section) => (
                    <SectionWrapper
                      key={section.id ?? UNGROUPED_KEY}
                      title={section.title}
                      category="Custom"
                      countries={section.countries}
                      defaultExpanded={section.id === UNGROUPED_KEY}
                      onBulkAssign={(cs, group) =>
                        handleBulkCountryAssignment(cs, group)
                      }
                      onBulkAssignToCustomEntryGroup={
                        handleBulkAssignToCustomEntryGroup
                      }
                      onBulkDelete={handleBulkDeleteCustomEntries}
                      availableGroups={availableGroups}
                      currentGroup={CountryAssignmentGroup.NOT_PARTICIPATING}
                      customEntryGroups={customEntryGroups}
                      currentCustomEntryGroupId={section.id}
                      getLabel={(itemsCount) =>
                        t('eventSetupModal.entriesAmount', {
                          count: itemsCount,
                        })
                      }
                      onEditGroup={
                        section.id
                          ? () => {
                              setGroupToEdit({
                                _id: section.id!,
                                name: section.title,
                              });
                              setGroupModalOpen(true);
                            }
                          : undefined
                      }
                      isChildSection
                    >
                      <CountrySelectionList
                        countries={section.countries}
                        onAssignCountryAssignment={handleCountryAssignment}
                        getCountryGroupAssignment={getCountryGroupAssignment}
                        availableGroups={availableGroups}
                        onEdit={handleOpenEditModal}
                      />
                    </SectionWrapper>
                  ))}
                </div>
              </SectionWrapper>
            );
          }

          return (
            <SectionWrapper
              key={category}
              title={getCategoryLabel(category)}
              category={category}
              countries={countries}
              isExpanded={!!expandedCategories[category]}
              onToggle={() => handleToggleCategory(category)}
              onBulkAssign={(cs, group) =>
                handleBulkCountryAssignment(cs, group)
              }
              onBulkDelete={handleBulkDeleteCustomEntries}
              availableGroups={availableGroups}
              currentGroup={CountryAssignmentGroup.NOT_PARTICIPATING}
              getLabel={
                category === 'Custom'
                  ? (itemsCount) =>
                      t('eventSetupModal.entriesAmount', {
                        count: itemsCount,
                      })
                  : undefined
              }
            >
              <CountrySelectionList
                countries={countries}
                onAssignCountryAssignment={handleCountryAssignment}
                getCountryGroupAssignment={getCountryGroupAssignment}
                availableGroups={availableGroups}
                onEdit={handleOpenEditModal}
                extraContent={getExtraContent(category)}
              />
            </SectionWrapper>
          );
        })}
      </div>
    </>
  );
};

export default NotParticipatingSection;
