'use client';

import { UserSearch } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import ContentItems from '../user-profile/ContentItems';
import ContentListToolbar from '../user-profile/ContentListToolbar';
import { useContentListState } from '../user-profile/useContentListState';
import WidgetPager from '../WidgetPager';

import SearchUsersModal from './SearchUsersModal';

import { useFollowingFeedQuery } from '@/api/follows';
import Button from '@/components/common/Button';
import { QueryNotice } from '@/components/offline/OfflineNotice';
import { useQueryView } from '@/hooks/useQueryView';
import { Contest } from '@/types/contest';
import { CustomTheme } from '@/types/customTheme';

interface FollowingFeedSectionProps {
  onDuplicate?: (theme: CustomTheme) => void;
  onEditTheme?: (theme: CustomTheme) => void;
  onEditContest?: (contest: Contest) => void;
  onLoadContest?: (contest: Contest) => void;
}

/** What the people you follow published, newest first, with Find users. */
const FollowingFeedSection: React.FC<FollowingFeedSectionProps> = ({
  onDuplicate,
  onEditTheme,
  onEditContest,
  onLoadContest,
}) => {
  const t = useTranslations();
  const state = useContentListState();
  const [isSearchUsersOpen, setIsSearchUsersOpen] = useState(false);

  const feedQuery = useFollowingFeedQuery({ ...state.query, enabled: true });
  const { data } = feedQuery;
  const view = useQueryView(feedQuery);

  return (
    <div className="flex flex-col gap-4 w-full">
      <ContentListToolbar
        state={state}
        total={view === 'ready' ? data?.total ?? 0 : undefined}
        searchAction={
          <Button
            variant="surface"
            size="lg"
            onClick={() => setIsSearchUsersOpen(true)}
            Icon={<UserSearch className="size-[18px] flex-none" />}
            aria-label={t('widgets.searchUsers.title')}
            className="flex-none"
          >
            <span className="dp-act-label">
              {t('widgets.searchUsers.title')}
            </span>
          </Button>
        }
      />

      {view !== 'ready' ? (
        <QueryNotice view={view} onRetry={() => feedQuery.refetch()} />
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
        <div className="flex flex-col items-center gap-4 text-center sm:py-12 py-8">
          <p className="text-[13px] font-semibold text-white/70 text-balance max-w-[420px]">
            {t('widgets.userProfile.noFollowingContent')}
          </p>
          <Button
            variant="surface"
            size="md"
            onClick={() => setIsSearchUsersOpen(true)}
            Icon={<UserSearch className="size-4 flex-none" />}
          >
            {t('widgets.searchUsers.title')}
          </Button>
        </div>
      )}

      <SearchUsersModal
        isOpen={isSearchUsersOpen}
        onClose={() => setIsSearchUsersOpen(false)}
      />
    </div>
  );
};

export default FollowingFeedSection;
