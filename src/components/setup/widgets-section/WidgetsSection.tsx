'use client';
import { useTranslations } from 'next-intl';

import ContestsWidget from './contests/ContestsWidget';
import ThemesWidget from './custom-themes/ThemesWidget';
import GraphicsWidget from './graphics/GraphicsWidget';

import { useMyProfileSummaryQuery } from '@/api/profiles';
import { useAuthStore } from '@/state/useAuthStore';

const SEPARATOR = ' · ';

/**
 * Widget row: the three content libraries (themes, contests, graphics) with
 * live counts for signed-in users. Profile lives in the header cluster.
 */
const WidgetsSection = () => {
  const t = useTranslations('widgets');
  const user = useAuthStore((state) => state.user);
  const { data: summary, isPending } = useMyProfileSummaryQuery(!!user);

  const statLoading = !!user && isPending;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full">
      <ThemesWidget
        statLoading={statLoading}
        stat={
          summary
            ? `${t('themes.customCount', {
                count: summary.customThemesCount,
              })}${SEPARATOR}${t('themes.savedCount', {
                count: summary.savedThemesCount,
              })}`
            : undefined
        }
      />
      <ContestsWidget
        statLoading={statLoading}
        stat={
          summary
            ? `${t('contests.privateCount', {
                count: summary.privateContestsCount,
              })}${SEPARATOR}${t('contests.publicCount', {
                count: summary.publicContestsCount,
              })}`
            : undefined
        }
      />
      <GraphicsWidget
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
