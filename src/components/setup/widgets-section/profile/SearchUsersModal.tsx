'use client';

import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import WidgetPager from '../WidgetPager';
import WidgetSearchHeader from '../WidgetSearchHeader';

import { useUsersSearchQuery } from '@/api/users';
import Modal from '@/components/common/Modal/Modal';
import UserInfo from '@/components/common/UserInfo';
import { QueryNotice } from '@/components/offline/OfflineNotice';
import { useDebounce } from '@/hooks/useDebounce';
import { useQueryView } from '@/hooks/useQueryView';

interface SearchUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchUsersModal: React.FC<SearchUsersModalProps> = ({
  isOpen,
  onClose,
}) => {
  const t = useTranslations();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 400);

  const usersQuery = useUsersSearchQuery({
    page,
    search: debouncedSearch,
  });
  const { data, isFetching } = usersQuery;
  const view = useQueryView(usersQuery);

  const hasQuery = debouncedSearch.trim().length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onClosed={() => {
        setSearch('');
        setPage(1);
      }}
      withBlur
      overlayClassName="!z-[1002]"
      containerClassName="!w-[min(92%,560px)]"
    >
      <div className="space-y-4">
        <h2 className="text-white text-xl font-bold">
          {t('widgets.searchUsers.title')}
        </h2>

        <WidgetSearchHeader
          search={search}
          onSearchChange={(s) => {
            setSearch(s);
            setPage(1);
          }}
          placeholder={t('widgets.searchUsers.placeholder')}
        />

        {!hasQuery ? (
          <div className="text-center sm:py-12 py-8">
            <p className="text-white/70">{t('widgets.searchUsers.prompt')}</p>
          </div>
        ) : view !== 'ready' ? (
          <QueryNotice view={view} onRetry={() => usersQuery.refetch()} />
        ) : isFetching ? (
          <div className="text-center sm:py-12 py-8">
            <span className="loader" />
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            <div className="grid gap-1">
              {data.items.map((user) => (
                <UserInfo key={user._id} user={user} size="sm" />
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
          <div className="text-center sm:py-12 py-8">
            <p className="text-white/70">
              {t('widgets.searchUsers.noResults')}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SearchUsersModal;
