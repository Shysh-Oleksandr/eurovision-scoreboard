'use client';

import { Settings2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import { toast } from 'react-toastify';

import WidgetPager from '../../WidgetPager';
import WidgetSearchHeader from '../../WidgetSearchHeader';

import FontCard from './FontCard';
import FontEditorCard from './FontEditorCard';
import { customSelection, FontSelection } from './fontPickerTypes';
import FontSignInPrompt from './FontSignInPrompt';

import {
  FONT_MAX_PER_USER,
  fontToSnapshot,
  useDeleteFontMutation,
  useMyFontsQuery,
} from '@/api/fonts';
import Button from '@/components/common/Button';
import { toastAxiosError } from '@/helpers/parseAxiosError';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuthStore } from '@/state/useAuthStore';
import type { Font } from '@/types/font';

interface MyFontsTabProps {
  value: FontSelection;
  onSelect: (selection: FontSelection) => void;
  onGoToUpload: () => void;
}

const PAGE_SIZE = 8;

const MyFontsTab: React.FC<MyFontsTabProps> = ({
  value,
  onSelect,
  onGoToUpload,
}) => {
  const t = useTranslations('widgets.themes.fonts');
  const user = useAuthStore((s) => s.user);
  const { confirm } = useConfirmation();
  const deleteFont = useDeleteFontMutation();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [managedId, setManagedId] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading } = useMyFontsQuery({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    enabled: !!user,
  });

  if (!user) return <FontSignInPrompt />;

  const handleDelete = (font: Font) => {
    const forceDelete = async () => {
      try {
        await deleteFont.mutateAsync({ id: font._id, force: true });
        toast.success(t('deletedSuccessfully'));
      } catch (error) {
        toastAxiosError(error);
      }
    };

    confirm({
      key: 'delete-font',
      type: 'danger',
      title: t('deleteTitle', { name: font.name }),
      description: t('deleteDescription'),
      onConfirm: async () => {
        try {
          await deleteFont.mutateAsync({ id: font._id });
          toast.success(t('deletedSuccessfully'));
        } catch (error: any) {
          if (error?.response?.status === 409) {
            const count = Number(error.response.data?.usedByThemesCount) || 0;

            confirm({
              key: 'delete-font-in-use',
              type: 'danger',
              title: t('deleteInUseTitle'),
              description: t('deleteInUseDescription', { count }),
              onConfirm: forceDelete,
            });

            return;
          }
          toastAxiosError(error);
        }
      },
    });
  };

  const fonts = data?.fonts ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="sm:space-y-4 space-y-3">
      <WidgetSearchHeader
        search={search}
        onSearchChange={(next) => {
          setSearch(next);
          setPage(1);
        }}
        placeholder={t('searchFonts')}
        onCreateNew={onGoToUpload}
      />

      <h3 className="text-white text-lg font-bold">
        {t('youHaveNFonts', { count: total, limit: FONT_MAX_PER_USER })}
      </h3>

      {isLoading ? (
        <div className="text-center sm:py-12 py-8">
          <span className="loader" />
        </div>
      ) : fonts.length === 0 ? (
        <div className="text-center sm:py-10 py-6 flex flex-col items-center gap-3">
          <p className="text-white/70">
            {search ? t('noFontsFound') : t('noFontsYet')}
          </p>
          {!search && (
            <Button onClick={onGoToUpload} className="text-sm">
              {t('uploadCta')}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {fonts.map((font) => {
            const selected =
              value.kind === 'custom' && value.font._id === font._id;
            const managed = managedId === font._id;

            return (
              <FontCard
                key={font._id}
                font={font}
                selected={selected}
                chips={
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">
                    {font.isPublic ? t('publicChip') : t('privateChip')}
                  </span>
                }
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => setManagedId(managed ? null : font._id)}
                      className={`p-2 rounded-[10px] border transition-colors ${
                        managed
                          ? 'border-white/60 bg-white/10 text-white'
                          : 'border-white/10 bg-white/[0.06] text-white/70 hover:text-white'
                      }`}
                      aria-label={t('manage')}
                      title={t('manage')}
                      aria-expanded={managed}
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(font)}
                      disabled={deleteFont.isPending}
                      className="p-2 rounded-[10px] border border-white/10 bg-white/[0.06] text-white/70 hover:text-white hover:bg-red-500/30 transition-colors disabled:opacity-40"
                      aria-label={t('delete')}
                      title={t('delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <Button
                      className="text-sm !py-2"
                      variant={selected ? 'secondary' : 'primary'}
                      disabled={selected}
                      onClick={() =>
                        onSelect(customSelection(fontToSnapshot(font)))
                      }
                    >
                      {selected ? t('selected') : t('use')}
                    </Button>
                  </>
                }
              >
                {managed && (
                  <FontEditorCard
                    font={font}
                    onFontChange={() => undefined}
                    onUse={() =>
                      onSelect(customSelection(fontToSnapshot(font)))
                    }
                  />
                )}
              </FontCard>
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

export default MyFontsTab;
