'use client';
import {
  Check,
  Dices,
  Folder,
  Globe,
  Layers,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

import { getMenuAnchor, useSetupUiStore } from '../state/setupUiStore';

import { useGroupLabel } from './lineupLabels';
import { useLineupActions, useLineupModelContext } from './LineupProvider';
import { parseListId, UNGROUPED_ID } from './listIds';
import { CUSTOM_CATEGORY, MoveTarget } from './useLineupModel';

import {
  useBulkAssignCustomEntryGroupMutation,
  useBulkDeleteCustomEntriesMutation,
  useCustomEntryGroupsQuery,
} from '@/api/customEntries';
import AnchoredMenu, {
  AnchoredMenuEntry,
} from '@/components/common/AnchoredMenu';
import { useAllocationDrawContext } from '@/components/setup/allocation-draw/AllocationDrawContext';
import { getCustomEntryId } from '@/components/setup/utils/getCustomEntryId';
import { useConfirmation } from '@/hooks/useConfirmation';
import { CountryAssignmentGroup } from '@/models';
import { useAllocationDrawStore } from '@/state/allocationDrawStore';
import { useCountriesStore } from '@/state/countriesStore';

interface LineupMenusProps {
  isSignedIn: boolean;
}

const targetIcon = (target: MoveTarget) =>
  target.kind === 'stage' ? (
    <Layers className="size-4" />
  ) : target.kind === 'toBeDrawn' ? (
    <Dices className="size-4" />
  ) : (
    <Globe className="size-4" />
  );

/**
 * The single anchored menu of the lineup, driven by `setupUiStore.activeMenu`:
 * tile "Move to", header-pill "Move all to…" and the tray "Move to…".
 */
const LineupMenus: React.FC<LineupMenusProps> = ({ isSignedIn }) => {
  const t = useTranslations();
  const groupLabel = useGroupLabel();
  const activeMenu = useSetupUiStore((state) => state.activeMenu);
  const closeMenu = useSetupUiStore((state) => state.closeMenu);
  const { byCode, moveTargets, lists } = useLineupModelContext();
  const { move, onEditCustomEntry } = useLineupActions();
  const draw = useAllocationDrawContext();
  const { confirm } = useConfirmation();
  const { data: customEntryGroups = [] } =
    useCustomEntryGroupsQuery(isSignedIn);
  const { mutateAsync: bulkAssignToGroup } =
    useBulkAssignCustomEntryGroupMutation();
  const { mutateAsync: bulkDeleteCustomEntries } =
    useBulkDeleteCustomEntriesMutation();

  const items = useMemo<AnchoredMenuEntry[]>(() => {
    if (!activeMenu) return [];

    const assignments = useCountriesStore.getState().eventAssignments;
    const groupOf = (code: string) =>
      assignments[code] || CountryAssignmentGroup.NOT_PARTICIPATING;

    let codes: string[];
    let currentGroup: string | null = null;
    let currentCustomGroupId: string | null | undefined;
    // Regrouping every custom entry across all folders at once is not offered
    // from the Custom category header; only tiles, groups and the tray get it.
    let canRegroup = true;

    if (activeMenu.kind === 'tile') {
      codes = [activeMenu.code];
      currentGroup = groupOf(activeMenu.code);
    } else if (activeMenu.kind === 'moveAll') {
      codes = lists.get(activeMenu.listId) ?? [];
      const parsed = parseListId(activeMenu.listId);

      currentGroup =
        parsed.kind === 'stage'
          ? parsed.stageId
          : parsed.kind === 'notQualified'
          ? CountryAssignmentGroup.NOT_QUALIFIED
          : CountryAssignmentGroup.NOT_PARTICIPATING;

      if (parsed.kind === 'pool' && parsed.groupId !== undefined) {
        currentCustomGroupId =
          parsed.groupId === UNGROUPED_ID ? null : parsed.groupId;
      } else if (
        parsed.kind === 'pool' &&
        parsed.category === CUSTOM_CATEGORY
      ) {
        canRegroup = false;
      }
    } else {
      codes = [...useSetupUiStore.getState().selected];
    }

    const entries: AnchoredMenuEntry[] = [
      {
        variant: 'header',
        label:
          codes.length > 1
            ? t('setup.eventSetupModal.moveCountries', { count: codes.length })
            : t('setup.eventSetupModal.moveTo'),
      },
      ...moveTargets
        .filter((target) => target.group !== currentGroup)
        .map<AnchoredMenuEntry>((target) => ({
          label: groupLabel(target),
          icon: targetIcon(target),
          disabled: codes.length === 0,
          onClick: () => {
            move(codes, target.group);
            if (activeMenu.kind === 'tray') {
              useSetupUiStore.getState().clearSelection();
            }
          },
        })),
    ];

    // Allocation draw: a pre-qualified country picks the semi it votes in.
    if (
      activeMenu.kind === 'tile' &&
      draw.enabled &&
      draw.rules.preq === 'drawn' &&
      draw.finalStage &&
      currentGroup === draw.finalStage.id &&
      draw.semis.length > 0
    ) {
      const { code } = activeMenu;
      const current = draw.votesIn[code] ?? 'drawn';
      const tick = <Check className="size-4 text-accent" />;

      entries.push('hr', {
        variant: 'header',
        label: t('setup.allocationDraw.menuVotesIn'),
      });
      entries.push({
        label: t('setup.allocationDraw.menuDrawn'),
        icon: <Dices className="size-4" />,
        trailing: current === 'drawn' ? tick : undefined,
        onClick: () => useAllocationDrawStore.getState().setVotesIn(code, null),
      });
      draw.semis.forEach((semi) => {
        entries.push({
          label: semi.name,
          icon: <Layers className="size-4" />,
          trailing: current === semi.id ? tick : undefined,
          onClick: () =>
            useAllocationDrawStore.getState().setVotesIn(code, semi.id),
        });
      });
    }

    // Custom-entry extras: regroup / delete / edit.
    const customIds = codes
      .map((code) => getCustomEntryId(code))
      .filter((id): id is string => !!id);
    const allCustom = customIds.length > 0 && customIds.length === codes.length;
    const notImported = codes.every((code) => !byCode.get(code)?.isImported);

    if (isSignedIn && allCustom && notImported) {
      const groupOptions: Array<{ id: string | null; name: string }> = [
        { id: null, name: t('setup.customCountryModal.noGroup') },
        ...customEntryGroups.map((g) => ({ id: g._id, name: g.name })),
      ].filter((g) => g.id !== currentCustomGroupId);

      if (
        canRegroup &&
        groupOptions.length > 0 &&
        codes.every((code) => byCode.get(code)?.category === CUSTOM_CATEGORY)
      ) {
        entries.push('hr', {
          variant: 'header',
          label: t('setup.eventSetupModal.moveToGroup'),
        });
        groupOptions.forEach((g) => {
          entries.push({
            label: g.name,
            icon: <Folder className="size-4" />,
            onClick: () => {
              void bulkAssignToGroup({ groupId: g.id, entryIds: customIds });
              if (activeMenu.kind === 'tray') {
                useSetupUiStore.getState().clearSelection();
              }
            },
          });
        });
      }

      if (activeMenu.kind === 'tile') {
        const country = byCode.get(activeMenu.code);

        if (country) {
          entries.push('hr', {
            label: t('setup.eventSetupModal.editEntry'),
            icon: <Pencil className="size-4" />,
            onClick: () => onEditCustomEntry(country),
          });
        }
      }

      if (activeMenu.kind === 'tray') {
        entries.push('hr', {
          label: t('setup.eventSetupModal.deleteSelectedEntries', {
            count: customIds.length,
          }),
          icon: <Trash2 className="size-4" />,
          variant: 'danger',
          onClick: () =>
            confirm({
              key: 'delete-custom-entries',
              type: 'danger',
              title: t('settings.confirmations.deleteCustomEntries', {
                count: customIds.length,
              }),
              description: t(
                'settings.confirmations.deleteCustomEntriesDescription',
                { count: customIds.length },
              ),
              onConfirm: async () => {
                await bulkDeleteCustomEntries(customIds);
                useSetupUiStore.getState().clearSelection();
              },
            }),
        });
      }
    }

    return entries;
  }, [
    activeMenu,
    bulkAssignToGroup,
    bulkDeleteCustomEntries,
    byCode,
    confirm,
    customEntryGroups,
    draw.enabled,
    draw.finalStage,
    draw.rules.preq,
    draw.semis,
    draw.votesIn,
    groupLabel,
    isSignedIn,
    lists,
    move,
    moveTargets,
    onEditCustomEntry,
    t,
  ]);

  return (
    <AnchoredMenu
      open={!!activeMenu}
      anchor={activeMenu ? getMenuAnchor() : null}
      onClose={closeMenu}
      items={items}
      placement={activeMenu?.kind === 'tray' ? 'top-start' : 'bottom-start'}
      ariaLabel={t('setup.eventSetupModal.moveTo')}
    />
  );
};

export default LineupMenus;
