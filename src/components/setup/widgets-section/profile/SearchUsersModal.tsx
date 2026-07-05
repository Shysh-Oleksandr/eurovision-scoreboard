'use client';

import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import WidgetSearchHeader from '../WidgetSearchHeader';

import { useUsersSearchQuery } from '@/api/users';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal/Modal';
import UserInfo from '@/components/common/UserInfo';
import { useDebounce } from '@/hooks/useDebounce';

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

  const { data, isLoading, isFetching } = useUsersSearchQuery({
    page,
    search: debouncedSearch,
  });

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
        ) : isLoading || isFetching ? (
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
