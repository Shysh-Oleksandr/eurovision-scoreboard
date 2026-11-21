import React, { useMemo } from 'react';

import ContestListItem from '../contests/ContestListItem';
import { usePublicContestActions } from '../contests/hooks/usePublicContestActions';
import { usePublicThemeActions } from '../custom-themes/hooks/usePublicThemeActions';
import ThemeListItem from '../custom-themes/ThemeListItem';

import { useContestsStateQuery } from '@/api/contests';
import { useThemesStateQuery } from '@/api/themes';
import type { UserContentItem } from '@/api/userContent';
import { CloudGrid } from '@/graphics/components/CloudDesignCards';
import { parseDesign } from '@/graphics/model/design';
import { useGraphicsStudioStore } from '@/graphics/state/graphicsStudioStore';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import type { Contest } from '@/types/contest';
import type { CustomTheme } from '@/types/customTheme';
import type { CloudDesign } from '@/types/design';

type Row =
  | { kind: 'item'; item: Exclude<UserContentItem, { type: 'design' }> }
  | { kind: 'designs'; designs: CloudDesign[] };

/** Neighbouring designs share one grid, so they sit side by side. */
const toRows = (items: UserContentItem[]): Row[] =>
  items.reduce<Row[]>((rows, item) => {
    if (item.type !== 'design') {
      rows.push({ kind: 'item', item });

      return rows;
    }

    const last = rows[rows.length - 1];

    if (last?.kind === 'designs') last.designs.push(item.data);
    else rows.push({ kind: 'designs', designs: [item.data] });

    return rows;
  }, []);

interface ContentItemsProps {
  items: UserContentItem[];
  onDuplicate?: (theme: CustomTheme) => void;
  onEditTheme?: (theme: CustomTheme) => void;
  onEditContest?: (contest: Contest) => void;
  onLoadContest?: (contest: Contest) => void;
}

/**
 * A profile list's page: themes and contests as their library cards, runs
 * of designs as the graphics gallery's grid.
 */
const ContentItems: React.FC<ContentItemsProps> = ({
  items,
  onDuplicate,
  onEditTheme,
  onEditContest,
  onLoadContest,
}) => {
  const themeActions = usePublicThemeActions();
  const contestActions = usePublicContestActions();
  const user = useAuthStore((state) => state.user);
  const openSheet = useGraphicsStudioStore((s) => s.openSheet);
  const currentCustomTheme = useGeneralStore((state) => state.customTheme);
  const activeContest = useGeneralStore((state) => state.activeContest);

  const useTemplate = (record: CloudDesign) => {
    try {
      openSheet({
        design: parseDesign(record.design),
        source: { kind: 'cloud', record },
      });
    } catch (err) {
      console.error('Unreadable design', err);
    }
  };

  const themeIds = useMemo(
    () => items.filter((i) => i.type === 'theme').map((i) => i.data._id),
    [items],
  );
  const contestIds = useMemo(
    () => items.filter((i) => i.type === 'contest').map((i) => i.data._id),
    [items],
  );

  const { data: themeState } = useThemesStateQuery(
    themeIds,
    !!themeIds.length && !!user,
  );
  const { data: contestsState } = useContestsStateQuery(
    contestIds,
    !!contestIds.length && !!user,
  );

  const rows = useMemo(() => toRows(items), [items]);

  return (
    <div className="grid gap-4">
      {rows.map((row) => {
        if (row.kind === 'designs') {
          return (
            <div
              key={`designs-${row.designs[0]._id}`}
              className="gfx-gallery !p-0"
            >
              <CloudGrid designs={row.designs} onUse={useTemplate} />
            </div>
          );
        }

        const { item } = row;

        return item.type === 'theme' ? (
          <ThemeListItem
            key={`theme-${item.data._id}`}
            theme={item.data}
            variant="public"
            onLike={themeActions.handleLike}
            onSave={themeActions.handleSave}
            onApply={themeActions.handleApply}
            onDuplicate={onDuplicate ?? (() => {})}
            onEdit={onEditTheme}
            isApplied={currentCustomTheme?._id === item.data._id}
            likedByMe={!!themeState?.likedIds?.includes(item.data._id)}
            savedByMe={!!themeState?.savedIds?.includes(item.data._id)}
            quickSelectedByMe={
              !!themeState?.quickSelectedIds?.includes(item.data._id)
            }
          />
        ) : (
          <ContestListItem
            key={`contest-${item.data._id}`}
            contest={item.data}
            variant="public"
            onLike={contestActions.handleLike}
            onSave={contestActions.handleSave}
            onLoad={onLoadContest ?? (() => {})}
            onEdit={onEditContest}
            isActive={activeContest?._id === item.data._id}
            likedByMe={!!contestsState?.likedIds?.includes(item.data._id)}
            savedByMe={!!contestsState?.savedIds?.includes(item.data._id)}
            quickSelectedByMe={
              !!contestsState?.quickSelectedIds?.includes(item.data._id)
            }
          />
        );
      })}
    </div>
  );
};

export default ContentItems;
