'use client';

import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { DateRangeFilter } from '../../utils/getFilterDateRange';
import WidgetPager from '../../WidgetPager';
import WidgetSearchHeader from '../../WidgetSearchHeader';
import WidgetSortBadges, { PublicSortKey } from '../../WidgetSortBadges';

import FontCard from './FontCard';
import { customSelection, FontSelection } from './fontPickerTypes';

import {
  fontToSnapshot,
  useForkFontMutation,
  usePublicFontsQuery,
} from '@/api/fonts';
import Button from '@/components/common/Button';
import { toastAxiosError } from '@/helpers/parseAxiosError';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuthStore } from '@/state/useAuthStore';
import type { Font } from '@/types/font';

interface PublicFontsTabProps {
  value: FontSelection;
  onSelect: (selection: FontSelection) => void;
}

const PAGE_SIZE = 8;

const PublicFontsTab: React.FC<PublicFontsTabProps> = ({ value, onSelect }) => {
  const t = useTranslations('widgets.themes.fonts');
  const user = useAuthStore((s) => s.user);
  const forkFont = useForkFontMutation();

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<PublicSortKey>('latest');
  const [dateRange, setDateRange] = useState<DateRangeFilter>(null);
  const [page, setPage] = useState(1);
  const [forkingId, setForkingId] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading } = usePublicFontsQuery({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    sortBy: sortKey === 'copies' ? 'forksCount' : 'createdAt',
    sortOrder: sortKey === 'oldest' ? 'asc' : 'desc',
    startDate: dateRange?.startDate,
    endDate: dateRange?.endDate,
  });

  const handleUse = async (font: Font) => {
    if (font.userId === user?._id) {
      onSelect(customSelection(fontToSnapshot(font)));

      return;
    }
    setForkingId(font._id);
    try {
      // Idempotent on the server: returns the existing copy if already added.
      const fork = await forkFont.mutateAsync(font._id);

      onSelect(customSelection(fontToSnapshot(fork)));
    } catch (error) {
      toastAxiosError(error);
    } finally {
      setForkingId(null);
    }
  };

  const fonts = data?.fonts ?? [];

  return (
    <div className="sm:space-y-4 space-y-3">
      <div className="sm:space-y-3 space-y-2">
        <WidgetSearchHeader
          search={search}
          onSearchChange={(next) => {
            setSearch(next);
            setPage(1);
          }}
          placeholder={t('searchFonts')}
        />
        <WidgetSortBadges
          value={sortKey}
          onChange={(k) => {
            setSortKey(k);
            setPage(1);
          }}
          visibleKeys={['latest', 'oldest', 'copies']}
          dateRange={dateRange}
          onDateRangeChange={(range) => {
            setDateRange(range);
            setPage(1);
          }}
        />
      </div>

      <h3 className="text-white text-lg font-bold">
        {t('foundNFonts', { count: data?.total ?? 0 })}
      </h3>

      {isLoading ? (
        <div className="text-center sm:py-12 py-8">
          <span className="loader" />
        </div>
      ) : fonts.length === 0 ? (
        <div className="text-center sm:py-10 py-6">
          <p className="text-white/70">{t('noPublicFonts')}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {fonts.map((font) => {
            const isMine = font.userId === user?._id;
            const selected =
              value.kind === 'custom' && value.font._id === font._id;

            return (
              <FontCard
                key={font._id}
                font={font}
                selected={selected}
                showCreator
                chips={
                  isMine ? (
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">
                      {t('yours')}
                    </span>
                  ) : font.forkedByMe ? (
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200/80">
                      {t('inYourLibrary')}
                    </span>
                  ) : null
                }
                actions={
                  <Button
                    className="text-sm !py-2"
                    disabled={!user || forkingId === font._id}
                    isLoading={forkingId === font._id}
                    onClick={() => void handleUse(font)}
                    title={!user ? t('signInToUpload') : undefined}
                  >
                    {isMine
                      ? t('use')
                      : font.forkedByMe
                      ? t('useFromLibrary')
                      : t('addAndUse')}
                  </Button>
                }
              />
            );
          })}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <WidgetPager
          page={page}
          totalPages={data.totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(data.totalPages, p + 1))}
        />
      )}
    </div>
  );
};

export default PublicFontsTab;
