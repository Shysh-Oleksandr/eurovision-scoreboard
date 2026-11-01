'use client';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';

import ContestsWidget from './contests/ContestsWidget';
import ThemesWidget from './custom-themes/ThemesWidget';
import GraphicsWidget from './graphics/GraphicsWidget';

import { useMyProfileSummaryQuery } from '@/api/profiles';
import { fitStepAttributes, useFitStep } from '@/hooks/useFitStep';
import { useAuthStore } from '@/state/useAuthStore';

/**
 * Phones: the small library icons sit before the titles while every title
 * still fits beside its icon, else above the titles (see `useFitStep`).
 */
const LIBRARY_STEPS = [{ icons: 'inline' }, { icons: 'top' }] as const;

/**
 * Widget row: the three content libraries (themes, contests, graphics) with
 * live counts for signed-in users; signed out they show just their names.
 * Profile lives in the header cluster.
 */
const WidgetsSection = () => {
  const t = useTranslations('widgets');
  const rowRef = useRef<HTMLDivElement>(null);
  const step = useFitStep(rowRef, LIBRARY_STEPS, { targets: '.dp-lib-head' });
  const user = useAuthStore((state) => state.user);
  const { data: summary, isPending } = useMyProfileSummaryQuery(!!user);
  const statLoading = !!user && isPending;
  const themesFirst = summary
    ? t('themes.customCount', { count: summary.customThemesCount })
    : undefined;

  return (
    <div
      ref={rowRef}
      className="dp-lib-row grid grid-cols-3 gap-2 w-full"
      {...fitStepAttributes(LIBRARY_STEPS[step])}
    >
      <ThemesWidget
        statLoading={statLoading}
        stat={
          summary
            ? `${themesFirst}, ${t('themes.savedCount', {
                count: summary.savedThemesCount,
              })}`
            : undefined
        }
        shortStat={themesFirst}
      />
      <ContestsWidget
        statLoading={statLoading}
        stat={
          summary
            ? `${t('contests.privateCount', {
                count: summary.privateContestsCount,
              })}, ${t('contests.publicCount', {
                count: summary.publicContestsCount,
              })}`
            : undefined
        }
        // Phones: one number, all of the user's contests.
        shortStat={
          summary
            ? t('contests.totalCount', {
                count:
                  summary.privateContestsCount + summary.publicContestsCount,
              })
            : undefined
        }
      />
      <GraphicsWidget
        signedIn={!!user}
        statLoading={statLoading}
        cloudStat={
          summary && summary.savedDesignsCount !== undefined
            ? t('graphics.savedCount', { count: summary.savedDesignsCount })
            : undefined
        }
      />
    </div>
  );
};

export default WidgetsSection;
