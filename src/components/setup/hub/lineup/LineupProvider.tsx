'use client';
import { useTranslations } from 'next-intl';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { toast } from 'react-toastify';

import { useSetupUiStore } from '../state/setupUiStore';

import { useGroupLabel } from './lineupLabels';
import {
  ListId,
  NOT_QUALIFIED_LIST,
  POOL_ROOT_LIST,
  poolList,
  stageList,
  UNGROUPED_ID,
} from './listIds';
import {
  CUSTOM_CATEGORY,
  IMPORTED_CATEGORY,
  LineupModel,
} from './useLineupModel';

import CustomEntryGroupModal from '@/components/setup/CustomEntryGroupModal';
import { BaseCountry, CountryAssignmentGroup, EventStage } from '@/models';
import type { CustomEntryGroup } from '@/types/customEntry';

export interface LineupActions {
  /** Move countries to a group, expand the target and toast. */
  move: (codes: string[], group: string) => void;
  openTileMenu: (code: string, listId: ListId, anchor: HTMLElement) => void;
  openMoveAllMenu: (listId: ListId, anchor: HTMLElement) => void;
  onEditCustomEntry: (country: BaseCountry) => void;
  onEditStage: (stage: EventStage) => void;
  onCreateCustomEntry: () => void;
  onCreateGroup: () => void;
  onEditGroup: (group: CustomEntryGroup) => void;
}

const LineupModelContext = createContext<LineupModel | null>(null);
const LineupActionsContext = createContext<LineupActions | null>(null);

export const useLineupModelContext = (): LineupModel => {
  const model = useContext(LineupModelContext);

  if (!model) throw new Error('useLineupModelContext outside LineupProvider');

  return model;
};

export const useLineupActions = (): LineupActions => {
  const actions = useContext(LineupActionsContext);

  if (!actions) throw new Error('useLineupActions outside LineupProvider');

  return actions;
};

/** ListId of the list a country lands in for a given group (for auto-expand). */
export const targetListIdFor = (
  country: BaseCountry | undefined,
  group: string,
  isSignedIn: boolean,
): ListId => {
  if (group === CountryAssignmentGroup.NOT_QUALIFIED) return NOT_QUALIFIED_LIST;

  if (group !== CountryAssignmentGroup.NOT_PARTICIPATING) {
    return stageList(group);
  }

  if (!country) return POOL_ROOT_LIST;

  if (country.isImported) return poolList(IMPORTED_CATEGORY);

  const category = country.category || 'Other';

  if (category === CUSTOM_CATEGORY && isSignedIn) {
    return poolList(CUSTOM_CATEGORY, country.groupId ?? UNGROUPED_ID);
  }

  return poolList(category);
};

interface LineupProviderProps {
  model: LineupModel;
  isSignedIn: boolean;
  assignMany: (codes: string[], group: string) => void;
  onEditCustomEntry: (country: BaseCountry) => void;
  onEditStage: (stage: EventStage) => void;
  onCreateCustomEntry: () => void;
  children: React.ReactNode;
}

/**
 * Shares the lineup view model and a stable set of actions with every stage
 * card, pool category and tile, so memoized tiles never re-render because a
 * callback identity changed.
 */
const LineupProvider: React.FC<LineupProviderProps> = ({
  model,
  isSignedIn,
  assignMany,
  onEditCustomEntry,
  onEditStage,
  onCreateCustomEntry,
  children,
}) => {
  const t = useTranslations('setup.eventSetupModal');
  const groupLabel = useGroupLabel();
  const [groupModal, setGroupModal] = useState<{
    open: boolean;
    group: CustomEntryGroup | null;
  }>({ open: false, group: null });

  // Kept in a ref-like memo so `move` stays stable while the model changes.
  const modelRef = React.useRef(model);

  modelRef.current = model;

  const move = useCallback(
    (codes: string[], group: string) => {
      if (codes.length === 0) return;

      assignMany(codes, group);

      const { setExpanded, setPoolOpen } = useSetupUiStore.getState();
      const { byCode, moveTargets } = modelRef.current;
      const target = moveTargets.find((candidate) => candidate.group === group);

      if (group === CountryAssignmentGroup.NOT_PARTICIPATING) {
        setPoolOpen(true);
      }

      const targets = new Set<ListId>();

      codes.forEach((code) =>
        targets.add(targetListIdFor(byCode.get(code), group, isSignedIn)),
      );
      targets.forEach((listId) => {
        setExpanded(listId, true);

        if (listId.startsWith(`pool:${CUSTOM_CATEGORY}:`)) {
          setExpanded(poolList(CUSTOM_CATEGORY), true);
        }
      });

      if (codes.length === 1) {
        toast.success(
          t('movedTo', {
            name: byCode.get(codes[0])?.name ?? codes[0],
            target: groupLabel(target ?? group),
          }),
        );
      } else {
        toast.success(t('countriesMoved', { count: codes.length }));
      }
    },
    [assignMany, groupLabel, isSignedIn, t],
  );

  const actions = useMemo<LineupActions>(
    () => ({
      move,
      openTileMenu: (code, listId, anchor) =>
        useSetupUiStore
          .getState()
          .openMenu({ kind: 'tile', code, listId }, anchor),
      openMoveAllMenu: (listId, anchor) =>
        useSetupUiStore
          .getState()
          .openMenu({ kind: 'moveAll', listId }, anchor),
      onEditCustomEntry,
      onEditStage,
      onCreateCustomEntry,
      onCreateGroup: () => setGroupModal({ open: true, group: null }),
      onEditGroup: (group) => setGroupModal({ open: true, group }),
    }),
    [move, onCreateCustomEntry, onEditCustomEntry, onEditStage],
  );

  return (
    <LineupModelContext.Provider value={model}>
      <LineupActionsContext.Provider value={actions}>
        {children}
        {groupModal.open && (
          <CustomEntryGroupModal
            isOpen={groupModal.open}
            onClose={() => setGroupModal({ open: false, group: null })}
            groupToEdit={groupModal.group}
          />
        )}
      </LineupActionsContext.Provider>
    </LineupModelContext.Provider>
  );
};

export default LineupProvider;
