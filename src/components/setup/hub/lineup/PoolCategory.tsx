'use client';
import { ChevronDown, FolderPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { memo, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import { useSetupUiStore } from '../state/setupUiStore';

import CountPill from './CountPill';
import CustomGroupSection from './CustomGroupSection';
import { useDndComponents } from './dnd/DndComponentsContext';
import { headerToggleHandler } from './headerToggle';
import { useLineupActions, useLineupModelContext } from './LineupProvider';
import TileGrid from './TileGrid';
import {
  CUSTOM_CATEGORY,
  IMPORTED_CATEGORY,
  LineupPoolCategory,
} from './useLineupModel';
import { useListExpanded } from './useLineupSearch';

import { useBulkCreateCustomEntriesMutation } from '@/api/customEntries';
import { PlusIcon } from '@/assets/icons/PlusIcon';
import { SaveIcon } from '@/assets/icons/SaveIcon';
import Button from '@/components/common/Button';
import GoogleAuthButton from '@/components/common/GoogleAuthButton';
import { useGetCategoryLabel } from '@/components/setup/hooks/useGetCategoryLabel';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useGeneralStore } from '@/state/generalStore';

interface PoolCategoryProps {
  entry: LineupPoolCategory;
  isSignedIn: boolean;
  matches: Set<string> | null;
}

/** "Save imported entries to your custom entries" flow (moved from the old NotParticipatingSection). */
const ImportedNotice: React.FC<{ codes: string[]; isSignedIn: boolean }> = ({
  codes,
  isSignedIn,
}) => {
  const t = useTranslations('setup.eventSetupModal');
  const { byCode } = useLineupModelContext();
  const { confirm } = useConfirmation();
  const bulkCreateMutation = useBulkCreateCustomEntriesMutation();

  const handleSave = () => {
    confirm({
      key: 'save-imported-custom-entries',
      title: t('areYouSureYouWantToSaveImportedEntries', {
        count: codes.length,
      }),
      description: t('areYouSureYouWantToSaveImportedEntriesDescription'),
      onConfirm: () => {
        const entries = codes
          .map((code) => byCode.get(code))
          .filter((c): c is NonNullable<typeof c> => !!c)
          .map((country) => ({ name: country.name, flagUrl: country.flag! }));

        bulkCreateMutation.mutate(
          { entries },
          {
            onSuccess: () => {
              toast.success(
                t('customEntriesSavedSuccessfully', { count: entries.length }),
              );
              const { importedCustomEntries, setImportedCustomEntries } =
                useGeneralStore.getState();

              setImportedCustomEntries(
                importedCustomEntries.filter(
                  (entry) => !entries.some((c) => c.name === entry.name),
                ),
              );
            },
            onError: (error) => {
              console.error('Failed to save custom entries:', error);
              toast.error(t('failedToSaveCustomEntries'));
            },
          },
        );
      },
    });
  };

  return (
    <div className="flex flex-col items-start gap-2 mb-2.5">
      <p className="text-white/70 text-[12.5px] font-semibold">
        {t('importedEntriesDescription')}
      </p>
      {isSignedIn && (
        <Button
          onClick={handleSave}
          variant="surface"
          size="sm"
          Icon={<SaveIcon className="size-4" />}
          disabled={bulkCreateMutation.isPending}
          isLoading={bulkCreateMutation.isPending}
        >
          {t('saveToYourCustomEntries')}
        </Button>
      )}
    </div>
  );
};

/** One collapsible region / Custom / Imported category inside the Country Pool. */
const PoolCategory: React.FC<PoolCategoryProps> = ({
  entry,
  isSignedIn,
  matches,
}) => {
  const t = useTranslations();
  const getCategoryLabel = useGetCategoryLabel();
  const { DropZone } = useDndComponents();
  const { openMoveAllMenu, onCreateCustomEntry, onCreateGroup } =
    useLineupActions();
  const isCustom = entry.category === CUSTOM_CATEGORY;
  // Every category, Custom included, starts collapsed.
  const expanded = useListExpanded(entry.listId, false, entry.codes, matches);
  const [hasBeenOpened, setHasBeenOpened] = useState(expanded);

  useEffect(() => {
    if (expanded) setHasBeenOpened(true);
  }, [expanded]);

  const toggle = () => useSetupUiStore.getState().toggleExpanded(entry.listId);

  const renderBody = () => {
    if (isCustom && !isSignedIn) {
      return (
        <div className="flex flex-col items-start gap-2">
          <p className="text-white/70 text-[12.5px] font-semibold">
            {t(
              'setup.eventSetupModal.youNeedToBeLoggedInToCreateAndUseCustomEntries',
            )}
          </p>
          <GoogleAuthButton />
        </div>
      );
    }

    if (isCustom && entry.groups) {
      return (
        <div className="flex flex-col gap-2">
          {entry.groups.map((group) => (
            <CustomGroupSection
              key={group.id}
              group={group}
              matches={matches}
            />
          ))}
        </div>
      );
    }

    return (
      <>
        {entry.category === IMPORTED_CATEGORY && (
          <ImportedNotice codes={entry.codes} isSignedIn={isSignedIn} />
        )}
        <TileGrid
          codes={entry.codes}
          listId={entry.listId}
          variant="pool"
          matches={matches}
        />
      </>
    );
  };

  return (
    <DropZone
      id={entry.listId}
      className="dp-cat rounded-[11px] overflow-hidden"
    >
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer select-none"
        onClick={headerToggleHandler(toggle)}
      >
        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left text-white"
        >
          <ChevronDown
            className={`size-[17px] flex-none text-white/55 transition-transform duration-200 ${
              expanded ? '' : '-rotate-90'
            }`}
          />
          <span className="truncate text-base font-extrabold tracking-[-.01em]">
            {getCategoryLabel(entry.category)}
          </span>
        </button>
        <div className="ml-auto flex items-center gap-1.5 flex-none">
          {isCustom && isSignedIn && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateCustomEntry();
                }}
                aria-label={t('common.addCustomCountry')}
                title={t('common.addCustomCountry')}
                className="dp-icon-btn w-[34px] h-[34px] rounded-[9px] grid place-items-center"
              >
                <PlusIcon className="size-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateGroup();
                }}
                aria-label={t('common.addGroup')}
                title={t('common.addGroup')}
                className="dp-icon-btn w-[34px] h-[34px] rounded-[9px] grid place-items-center"
              >
                <FolderPlus className="size-4" />
              </button>
            </>
          )}
          <CountPill
            count={entry.codes.length}
            ariaLabel={t('setup.eventSetupModal.moveAllTo')}
            onClick={(e) => openMoveAllMenu(entry.listId, e.currentTarget)}
          />
        </div>
      </div>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">
          {hasBeenOpened && (
            <div className="dp-cat-body px-3 pb-3">{renderBody()}</div>
          )}
        </div>
      </div>
    </DropZone>
  );
};

export default memo(PoolCategory);
