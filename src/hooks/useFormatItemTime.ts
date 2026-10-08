import { isSameYear } from 'date-fns';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback } from 'react';

/**
 * Timestamps on design, theme and contest cards: relative while fresh
 * ("5 min ago", "3 h ago", under 24 h), then absolute ("Oct 6, 08:19 PM",
 * with the year only when it differs from the current one).
 */
export function useFormatItemTime() {
  const locale = useLocale();
  const t = useTranslations('common.relativeTime');

  return useCallback(
    (value: number | string | Date): string => {
      const date = new Date(value);
      const diff = Math.max(0, Date.now() - date.getTime());
      const minutes = Math.round(diff / 60000);

      if (minutes < 1) return t('justNow');
      if (minutes < 60) return t('minutesAgo', { count: minutes });
      const hours = Math.round(minutes / 60);

      if (hours < 24) return t('hoursAgo', { count: hours });

      return date.toLocaleDateString(locale, {
        year: isSameYear(date, new Date()) ? undefined : 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    },
    [locale, t],
  );
}
