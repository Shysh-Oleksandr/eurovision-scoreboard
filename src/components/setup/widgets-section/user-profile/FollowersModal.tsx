'use client';

import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';

import WidgetSearchHeader from '../WidgetSearchHeader';

import { useFollowersQuery } from '@/api/follows';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomCloseButton from '@/components/common/Modal/ModalBottomCloseButton';
import UserInfo from '@/components/common/UserInfo';
import { useDebounce } from '@/hooks/useDebounce';
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

  const { data, isLoading } = useFollowersQuery(userId, {
    page,
    search: debouncedSearch || undefined,
    enabled: isOpen,
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,450px)]"
      fixedHeight
      overlayClassName="!z-[1003]"
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

        <p className="text-white/70 text-sm">
          {t('widgets.foundNItems', { count: data?.total ?? 0 })}
        </p>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="loader" />
          </div>
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
              <div className="flex justify-center items-center gap-2 pt-2">
                <Button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="!py-1.5 !text-base sm:w-[120px] w-[100px]"
                >
                  {t('widgets.previous')}
                </Button>
                <span className="px-3 py-1 text-white text-sm font-medium">
                  {t('widgets.pageNOfM', {
                    page,
                    totalPages: data.totalPages,
                  })}
                </span>
                <Button
                  onClick={() =>
                    setPage((p) => Math.min(data.totalPages, p + 1))
                  }
                  disabled={page === data.totalPages}
                  className="!py-1.5 !text-base sm:w-[120px] w-[100px]"
                >
                  {t('widgets.next')}
                </Button>
              </div>
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
