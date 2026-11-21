import { useTranslations } from 'next-intl';
import React, { useRef } from 'react';

import { DateRangeFilter, getDateRange } from './utils/getFilterDateRange';

import CaptionSelect from '@/components/common/CaptionSelect';
import { fitStepAttributes, useFitStep } from '@/hooks/useFitStep';

export type PublicSortKey = 'latest' | 'oldest' | 'likes' | 'saves' | 'copies';

type DateRangeKey =
  | 'all'
  | 'today'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth';

const SORT_KEYS: PublicSortKey[] = [
  'latest',
  'oldest',
  'likes',
  'saves',
  'copies',
];

const DATE_RANGE_KEYS: DateRangeKey[] = [
  'all',
  'today',
  'thisWeek',
  'lastWeek',
  'thisMonth',
  'lastMonth',
];

const SORT_LABEL_KEYS: Record<PublicSortKey, string> = {
  latest: 'latest',
  oldest: 'oldest',
  likes: 'mostLiked',
  saves: 'mostSaved',
  copies: 'mostCopied',
};

const DATE_LABEL_KEYS: Record<DateRangeKey, string> = {
  all: 'allTime',
  today: 'today',
  thisWeek: 'thisWeek',
  lastWeek: 'lastWeek',
  thisMonth: 'thisMonth',
  lastMonth: 'lastMonth',
};

/** Selects and the trailing text on one row; then the text under them. */
const SORT_ROW_STEPS = [{ sort: 'row' }, { sort: 'split' }] as const;

const activeDateRangeKey = (dateRange: DateRangeFilter): DateRangeKey => {
  if (!dateRange) return 'all';

  return (
    DATE_RANGE_KEYS.find((key) => {
      if (key === 'all') return false;
      const expected = getDateRange(key);

      return (
        expected?.startDate === dateRange.startDate &&
        expected?.endDate === dateRange.endDate
      );
    }) ?? 'all'
  );
};

interface WidgetSortBadgesProps {
  value: PublicSortKey;
  onChange: (key: PublicSortKey) => void;
  className?: string;
  dateRange?: DateRangeFilter;
  onDateRangeChange?: (range: DateRangeFilter) => void;
  hideCopies?: boolean;
  /** Restrict which sort options show (e.g. fonts have no likes/saves). Default: all. */
  visibleKeys?: PublicSortKey[];
  /** Text at the row's right end, e.g. how many items the list found. */
  trailing?: React.ReactNode;
}

/**
 * Sort and date filters of the library and profile lists: two selects with
 * their name inside ("Sort by" over "Latest", "Created" over "All time")
 * instead of a row of chips each.
 */
const WidgetSortBadges: React.FC<WidgetSortBadgesProps> = ({
  value,
  onChange,
  className = '',
  dateRange,
  onDateRangeChange,
  hideCopies = false,
  visibleKeys,
  trailing,
}) => {
  const t = useTranslations('widgets.sortBadges');
  const ref = useRef<HTMLDivElement>(null);
  const step = useFitStep(ref, SORT_ROW_STEPS);

  const sortOptions = SORT_KEYS.filter(
    (key) =>
      (!visibleKeys || visibleKeys.includes(key)) &&
      !(hideCopies && key === 'copies'),
  ).map((key) => ({ value: key, label: t(SORT_LABEL_KEYS[key]) }));

  const dateOptions = DATE_RANGE_KEYS.map((key) => ({
    value: key,
    label: t(DATE_LABEL_KEYS[key]),
  }));

  return (
    <div
      ref={ref}
      {...fitStepAttributes(SORT_ROW_STEPS[step])}
      className={`dp-sort-row ${className}`}
    >
      <CaptionSelect
        caption={t('sortBy')}
        value={value}
        options={sortOptions}
        onChange={onChange}
      />
      {onDateRangeChange && (
        <CaptionSelect
          caption={t('created')}
          value={activeDateRangeKey(dateRange ?? null)}
          options={dateOptions}
          onChange={(key) =>
            onDateRangeChange(key === 'all' ? null : getDateRange(key))
          }
        />
      )}
      {trailing && <div className="dp-sort-trail">{trailing}</div>}
    </div>
  );
};

export default WidgetSortBadges;
