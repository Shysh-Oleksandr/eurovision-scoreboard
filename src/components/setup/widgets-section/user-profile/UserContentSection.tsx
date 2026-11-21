import { useTranslations } from 'next-intl';
import React from 'react';

import WidgetPager from '../WidgetPager';

import ContentItems from './ContentItems';
import ContentListToolbar from './ContentListToolbar';
import { useContentListState } from './useContentListState';

import { useUserContentQuery } from '@/api/userContent';
import { QueryNotice } from '@/components/offline/OfflineNotice';
import { useQueryView } from '@/hooks/useQueryView';
import { Contest } from '@/types/contest';
import { CustomTheme } from '@/types/customTheme';

interface UserContentSectionProps {
  userId: string;
  onDuplicate?: (theme: CustomTheme) => void;
  onEditTheme?: (theme: CustomTheme) => void;
  onEditContest?: (contest: Contest) => void;
  onLoadContest?: (contest: Contest) => void;
}

/** A fan's public themes, contests and designs, with the list's filters. */
const UserContentSection: React.FC<UserContentSectionProps> = ({
  userId,
  onDuplicate,
  onEditTheme,
  onEditContest,
  onLoadContest,
}) => {
  const t = useTranslations();
  const state = useContentListState();

  const contentQuery = useUserContentQuery(userId, state.query);
  const { data } = contentQuery;
  const view = useQueryView(contentQuery);

  return (
    <div className="flex flex-col gap-4 w-full">
      <ContentListToolbar
        state={state}
        total={view === 'ready' ? data?.total ?? 0 : undefined}
      />

      {view !== 'ready' ? (
        <QueryNotice view={view} onRetry={() => contentQuery.refetch()} />
      ) : data && data.items.length > 0 ? (
        <>
          <ContentItems
            items={data.items}
            onDuplicate={onDuplicate}
            onEditTheme={onEditTheme}
            onEditContest={onEditContest}
            onLoadContest={onLoadContest}
          />
          {data.totalPages > 1 && (
            <WidgetPager
              page={state.page}
              totalPages={data.totalPages}
              onPrev={() => state.setPage((p) => Math.max(1, p - 1))}
              onNext={() =>
                state.setPage((p) => Math.min(data.totalPages, p + 1))
              }
            />
          )}
        </>
      ) : (
        <p className="text-center text-[13px] font-semibold text-white/70 text-balance sm:py-12 py-8">
          {t('widgets.userProfile.noContentFound')}
        </p>
      )}
    </div>
  );
};

export default UserContentSection;
