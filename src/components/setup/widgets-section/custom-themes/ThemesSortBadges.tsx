import { useTranslations } from 'next-intl';
import React from 'react';

import { DateRangeFilter, getDateRange } from '../utils/getFilterDateRange';

import { CalendarSearchIcon } from '@/assets/icons/CalendarSearchIcon';
import { FilterIcon } from '@/assets/icons/FilterIcon';
import Badge from '@/components/common/Badge';

export type PublicSortKey = 'latest' | 'oldest' | 'likes' | 'saves' | 'copies';

interface ThemesSortBadgesProps {
  value: PublicSortKey;
  onChange: (key: PublicSortKey) => void;
  className?: string;
  dateRange?: DateRangeFilter;
  onDateRangeChange?: (range: DateRangeFilter) => void;
}

const ThemesSortBadges: React.FC<ThemesSortBadgesProps> = ({
  value,
  onChange,
  className,
  dateRange,
  onDateRangeChange,
}) => {
  const t = useTranslations('widgets.sortBadges');

  const handleDateRangeClick = (
    range:
      | 'today'
      | 'thisWeek'
      | 'lastWeek'
      | 'thisMonth'
      | 'lastMonth'
      | 'all',
  ) => {
    if (!onDateRangeChange) return;

    if (range === 'all') {
      onDateRangeChange(null);
    } else {
      onDateRangeChange(getDateRange(range));
    }
  };

  const isDateRangeActive = (
    range:
      | 'today'
      | 'thisWeek'
      | 'lastWeek'
      | 'thisMonth'
      | 'lastMonth'
      | 'all',
  ): boolean => {
    if (!dateRange && range === 'all') return true;
    if (!dateRange || range === 'all') return false;

    const expectedRange = getDateRange(range);

    if (!expectedRange) return false;

    return (
      dateRange.startDate === expectedRange.startDate &&
      dateRange.endDate === expectedRange.endDate
    );
  };

  return (
    <div className={`space-y-3 ${className || ''}`}>
      <div className="flex items-center flex-wrap justify-start gap-2">
        <FilterIcon className="w-6 h-6" />
        <Badge
          label={t('latest')}
          onClick={() => onChange('latest')}
          isActive={value === 'latest'}
        />
        <Badge
          label={t('oldest')}
          onClick={() => onChange('oldest')}
          isActive={value === 'oldest'}
        />
        <Badge
          label={t('mostLiked')}
          onClick={() => onChange('likes')}
          isActive={value === 'likes'}
        />
        <Badge
          label={t('mostSaved')}
          onClick={() => onChange('saves')}
          isActive={value === 'saves'}
        />
        <Badge
          label={t('mostCopied')}
          onClick={() => onChange('copies')}
          isActive={value === 'copies'}
        />
      </div>
      {onDateRangeChange && (
        <div className="flex items-center flex-wrap justify-start gap-2">
          <CalendarSearchIcon className="w-6 h-6" />
          <Badge
            label={t('today')}
            onClick={() => handleDateRangeClick('today')}
            isActive={isDateRangeActive('today')}
          />
          <Badge
            label={t('thisWeek')}
            onClick={() => handleDateRangeClick('thisWeek')}
            isActive={isDateRangeActive('thisWeek')}
          />
          <Badge
            label={t('lastWeek')}
            onClick={() => handleDateRangeClick('lastWeek')}
            isActive={isDateRangeActive('lastWeek')}
          />
          <Badge
            label={t('thisMonth')}
            onClick={() => handleDateRangeClick('thisMonth')}
            isActive={isDateRangeActive('thisMonth')}
          />
          <Badge
            label={t('lastMonth')}
            onClick={() => handleDateRangeClick('lastMonth')}
            isActive={isDateRangeActive('lastMonth')}
          />
          <Badge
            label={t('allTime')}
            onClick={() => handleDateRangeClick('all')}
            isActive={isDateRangeActive('all')}
          />
        </div>
      )}
    </div>
  );
};

export default ThemesSortBadges;
