'use client';
import { useTranslations } from 'next-intl';

import ContestsWidget from './contests/ContestsWidget';
import ThemesWidget from './custom-themes/ThemesWidget';
import ProfileWidget from './profile/ProfileWidget';

import { useMyProfileSummaryQuery } from '@/api/profiles';
import { useAuthStore } from '@/state/useAuthStore';

const SEPARATOR = ' · ';

/** Widget row: three labelled cards with live counts (signed-in users only). */
const WidgetsSection = () => {
  const t = useTranslations('widgets');
  const user = useAuthStore((state) => state.user);
  const { data: summary, isPending } = useMyProfileSummaryQuery(!!user);

  const statLoading = !!user && isPending;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full">
      <ProfileWidget
        statLoading={statLoading}
        stat={
          summary
            ? `${t('profile.followers', {
                count: summary.followersCount,
              })}${SEPARATOR}${t('profile.followingCount', {
                count: summary.followingCount,
              })}`
            : undefined
        }
      />
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
    </div>
  );
};

export default WidgetsSection;
