import {
  startOfToday,
  endOfToday,
  startOfWeek,
  endOfWeek,
  subWeeks,
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
} from 'date-fns';

export type DateRangeFilter = {
  startDate: string;
  endDate: string;
} | null;

export const getDateRange = (
  range: 'today' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth',
): DateRangeFilter => {
  const now = new Date();

  switch (range) {
    case 'today': {
      const start = startOfToday();
      const end = endOfToday();

      return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
      };
    }
    case 'thisWeek': {
      const start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const end = endOfToday();

      return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
      };
    }
    case 'lastWeek': {
      const lastWeekStart = subWeeks(now, 1);
      const start = startOfWeek(lastWeekStart, { weekStartsOn: 1 }); // Monday of last week
      const end = endOfWeek(lastWeekStart, { weekStartsOn: 1 }); // Sunday of last week

      return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
      };
    }
    case 'thisMonth': {
      const start = startOfMonth(now);
      const end = endOfToday();

      return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
      };
    }
    case 'lastMonth': {
      const lastMonth = subMonths(now, 1);
      const start = startOfMonth(lastMonth);
      const end = endOfMonth(lastMonth);

      return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
      };
    }
    default:
      return null;
  }
};
