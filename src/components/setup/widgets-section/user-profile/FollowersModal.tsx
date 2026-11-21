'use client';

import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';

import WidgetPager from '../WidgetPager';
import WidgetSearchHeader from '../WidgetSearchHeader';

import { useFollowersQuery } from '@/api/follows';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomCloseButton from '@/components/common/Modal/ModalBottomCloseButton';
import UserInfo from '@/components/common/UserInfo';
import { QueryNotice } from '@/components/offline/OfflineNotice';
import { useDebounce } from '@/hooks/useDebounce';
import { useQueryView } from '@/hooks/useQueryView';
import type { ThemeCreator } from '@/types/customTheme';

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const FollowersModal: React.FC<FollowersModalProps> = ({
  isOpen,
  onClose,
  userId,
}) => {
  const t = useTranslations();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setPage(1);
    }
  }, [isOpen]);

  const followersQuery = useFollowersQuery(userId, {
    page,
    search: debouncedSearch || undefined,
    enabled: isOpen,
  });
  const { data } = followersQuery;
  const view = useQueryView(followersQuery);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,450px)]"
      overlayClassName="!z-[1101]"
      bottomContent={<ModalBottomCloseButton onClose={onClose} />}
    >
      <h3 className="text-xl font-bold mb-4">
        {t('widgets.profile.followers', { count: data?.total ?? 0 })}
      </h3>

      <div className="space-y-3">
        <WidgetSearchHeader
          search={search}
          onSearchChange={(s) => {
            setSearch(s);
            setPage(1);
          }}
          placeholder={t('common.searchPlaceholder')}
        />

        {view === 'ready' && (
          <p className="text-white/70 text-sm">
            {t('widgets.foundNItems', { count: data?.total ?? 0 })}
          </p>
        )}

        {view !== 'ready' ? (
          <QueryNotice
            view={view}
            onRetry={() => followersQuery.refetch()}
            className="py-12"
          />
        ) : data && data.items.length > 0 ? (
          <>
            <div className="flex flex-col gap-1">
              {data.items.map((follower) => (
                <div
                  key={follower._id}
                  onClick={onClose}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onClose();
                    }
                  }}
                >
                  <UserInfo user={follower as ThemeCreator} size="md" />
                </div>
              ))}
            </div>

            {data.totalPages > 1 && (
              <WidgetPager
                page={page}
                totalPages={data.totalPages}
                onPrev={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              />
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-white/70">
              {t('widgets.userProfile.noContentFound')}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default FollowersModal;
