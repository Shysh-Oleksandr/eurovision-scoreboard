import { useTranslations } from 'next-intl';
import React, { useRef } from 'react';

import ContentTypeBadges from '../ContentTypeBadges';
import WidgetSearchHeader from '../WidgetSearchHeader';
import WidgetSortBadges from '../WidgetSortBadges';

import type { ContentListState } from './useContentListState';

import { fitStepAttributes, useFitStep } from '@/hooks/useFitStep';

/**
 * Type switch beside the search while both fit (the search's button, Find
 * users, dropping its label first); else the search under it, again with
 * the label first, then without.
 */
const TOOLS_STEPS = [
  { tools: 'row' },
  { tools: 'row-icon' },
  { tools: 'stack' },
  { tools: 'stack-icon' },
] as const;

interface ContentListToolbarProps {
  state: ContentListState;
  /** How many items the list found; shown at the end of the sort row. */
  total?: number;
  /** A button beside the search field (Find users in the following feed). */
  searchAction?: React.ReactNode;
}

/**
 * The profile lists' filters: All / Themes / Contests / Designs and the
 * search on top, Sort by and Created with the count under them.
 */
const ContentListToolbar: React.FC<ContentListToolbarProps> = ({
  state,
  total,
  searchAction,
}) => {
  const t = useTranslations();
  const ref = useRef<HTMLDivElement>(null);
  const step = useFitStep(ref, TOOLS_STEPS);

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={ref}
        {...fitStepAttributes(TOOLS_STEPS[step])}
        className="dp-list-tools"
      >
        <ContentTypeBadges
          value={state.contentType}
          onChange={state.setContentType}
        />
        <div className="dp-list-search">
          <div className="flex-1 min-w-0">
            <WidgetSearchHeader
              search={state.search}
              onSearchChange={state.setSearch}
              placeholder={t('common.searchPlaceholder')}
            />
          </div>
          {searchAction}
        </div>
      </div>
      <WidgetSortBadges
        value={state.sortKey}
        onChange={state.setSortKey}
        hideCopies={state.contentType === 'contests'}
        dateRange={state.dateRange}
        onDateRangeChange={state.setDateRange}
        trailing={
          total !== undefined
            ? t('widgets.foundNItems', { count: total })
            : undefined
        }
      />
    </div>
  );
};

export default ContentListToolbar;
