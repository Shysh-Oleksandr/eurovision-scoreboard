'use client';
import { ChevronDown, Folder } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { memo, useEffect, useState } from 'react';

import { useSetupUiStore } from '../state/setupUiStore';

import CountPill from './CountPill';
import { useDndComponents } from './dnd/DndComponentsContext';
import { headerToggleHandler } from './headerToggle';
import { useLineupActions } from './LineupProvider';
import { UNGROUPED_ID } from './listIds';
import TileGrid from './TileGrid';
import { LineupPoolGroup } from './useLineupModel';
import { useListExpanded } from './useLineupSearch';

import { PencilIcon } from '@/assets/icons/PencilIcon';

interface CustomGroupSectionProps {
  group: LineupPoolGroup;
  matches: Set<string> | null;
}

/** One custom-entry group ("No group", "FantasticVision", …) nested inside the Custom category. */
const CustomGroupSection: React.FC<CustomGroupSectionProps> = ({
  group,
  matches,
}) => {
  const t = useTranslations();
  const { DropZone } = useDndComponents();
  const { openMoveAllMenu, onEditGroup } = useLineupActions();
  const isUngrouped = group.id === UNGROUPED_ID;
  // Every group, "No group" included, starts collapsed.
  const expanded = useListExpanded(group.listId, false, group.codes, matches);
  const [hasBeenOpened, setHasBeenOpened] = useState(expanded);

  useEffect(() => {
    if (expanded) setHasBeenOpened(true);
  }, [expanded]);

  const title = isUngrouped
    ? t('setup.customCountryModal.noGroup')
    : group.name;
  const toggle = () => useSetupUiStore.getState().toggleExpanded(group.listId);

  return (
    <DropZone
      id={group.listId}
      className="dp-group rounded-[10px] overflow-hidden"
    >
      <div
        className="flex items-center gap-2.5 px-[11px] py-[9px] cursor-pointer select-none"
        onClick={headerToggleHandler(toggle)}
      >
        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          className="flex items-center gap-[9px] min-w-0 flex-1 text-left text-white"
        >
          <ChevronDown
            className={`size-4 flex-none text-white/55 transition-transform duration-200 ${
              expanded ? '' : '-rotate-90'
            }`}
          />
          <Folder className="size-[15px] flex-none text-white/55" />
          <span className="truncate text-base font-extrabold tracking-[-.01em]">
            {title}
          </span>
        </button>
        <div className="ml-auto flex items-center gap-1.5 flex-none">
          <CountPill
            size="sm"
            count={group.codes.length}
            ariaLabel={t('setup.eventSetupModal.moveAllTo')}
            onClick={(e) => openMoveAllMenu(group.listId, e.currentTarget)}
          />
          {!isUngrouped && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditGroup({ _id: group.id, name: group.name });
              }}
              aria-label={t('setup.eventSetupModal.groupOptions')}
              title={t('setup.eventSetupModal.groupOptions')}
              className="dp-icon-btn w-[30px] h-[30px] rounded-lg grid place-items-center"
            >
              <PencilIcon className="size-[15px]" />
            </button>
          )}
        </div>
      </div>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">
          {hasBeenOpened && (
            <div className="px-[11px] pb-[11px]">
              <TileGrid
                codes={group.codes}
                listId={group.listId}
                variant="pool"
                matches={matches}
              />
            </div>
          )}
        </div>
      </div>
    </DropZone>
  );
};

export default memo(CustomGroupSection);
