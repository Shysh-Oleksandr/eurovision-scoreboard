import { useLocale, useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';

import ThemePreviewCountryItemCompact from './ThemePreviewCountryItemCompact';

import { useToggleThemeQuickSelectMutation } from '@/api/quickSelect';
import { BookmarkCheckIcon } from '@/assets/icons/BookmarkCheckIcon';
import { BookmarkIcon } from '@/assets/icons/BookmarkIcon';
import { CopyIcon } from '@/assets/icons/CopyIcon';
import { PencilIcon } from '@/assets/icons/PencilIcon';
import { PinIcon } from '@/assets/icons/PinIcon';
import { PinSolidIcon } from '@/assets/icons/PinSolidIcon';
import { ThemeIcon } from '@/assets/icons/ThemeIcon';
import { ThumbsUpIcon } from '@/assets/icons/ThumbsUpIcon';
import { ThumbsUpSolidIcon } from '@/assets/icons/ThumbsUpSolidIcon';
import { TrashIcon } from '@/assets/icons/TrashIcon';
import Button from '@/components/common/Button';
import UserInfo from '@/components/common/UserInfo';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useAuthStore } from '@/state/useAuthStore';
import { getCssVarsForCustomTheme } from '@/theme/themeUtils';
import { CustomTheme } from '@/types/customTheme';

interface ThemeListItemProps {
  theme: CustomTheme;
  variant: 'user' | 'public';
  onEdit?: (theme: CustomTheme) => void;
  onDelete?: (id: string) => void;
  onApply: (theme: CustomTheme) => void;
  onLike?: (id: string) => void;
  onSave?: (id: string, savedByMe: boolean) => void;
  onDuplicate: (theme: CustomTheme) => void;
  isApplied?: boolean;
  likedByMe?: boolean;
  savedByMe?: boolean;
  quickSelectedByMe?: boolean;
}

const ThemeListItem: React.FC<ThemeListItemProps> = ({
  theme,
  variant,
  onEdit,
  onDelete,
  onApply,
  onLike,
  onSave,
  onDuplicate,
  isApplied,
  likedByMe,
  savedByMe,
  quickSelectedByMe,
}) => {
  const locale = useLocale();

  const t = useTranslations();

  const user = useAuthStore((state) => state.user);
  const isMyTheme = variant === 'user' || theme.userId.toString() === user?._id;

  const { mutateAsync: toggleQuickSelect } =
    useToggleThemeQuickSelectMutation();

  const { confirm } = useConfirmation();

  const handleQuickSelect = async () => {
    if (!user) return;

    try {
      await toggleQuickSelect(theme._id);

      if (quickSelectedByMe) {
        toast.success(t('widgets.quickSelectRemoved'));
      } else {
        toast.success(t('widgets.quickSelectAdded'));
      }
    } catch (error: any) {
      console.error('Failed to toggle quick select:', error);
    }
  };

  const [points, setPoints] = useState(42);
  const [lastPoints, setLastPoints] = useState<number | null>(12);
  const [showDouzePointsAnimation, setShowDouzePointsAnimation] =
    useState(false);

  const handleAwardPoints = (value: number) => {
    setLastPoints(value);
    setPoints((prev) => prev + value);

    setShowDouzePointsAnimation(true);
    // Reset animation state after animation completes
    setTimeout(() => {
      setShowDouzePointsAnimation(false);
    }, 3000); // Animation duration
  };

  const cssVars = useMemo(() => getCssVarsForCustomTheme(theme), [theme]);

  return (
    <div
      className="bg-primary-950 bg-gradient-to-bl from-primary-950 to-primary-800/60 shadow-lg rounded-lg overflow-hidden p-4 border border-white/20 hover:border-white/40 transition-colors"
      style={cssVars as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          {!theme.isPublic && (
            <div className="text-xs text-white/60 bg-primary-800 font-medium rounded-full px-2 leading-[0.8rem] py-1 w-fit mb-1.5">
              {t('widgets.private')}
            </div>
          )}
          <h3 className="text-white font-semibold text-l mb-1">
            <div className="flex items-center justify-between flex-wrap gap-1.5">
              <span className="">{theme.name}</span>

              <span className="text-xs text-white/60">
                {new Date(theme.createdAt).toLocaleDateString(locale, {
                  hour: '2-digit',
                  minute: '2-digit',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          </h3>
          {theme.description && (
            <p className="text-white/70 text-sm line-clamp-2">
              {theme.description}
            </p>
          )}
        </div>
      </div>

      <div className="mb-2 md:gap-4 gap-2 flex justify-center sm:items-center items-start sm:flex-row-reverse flex-col">
        <ThemePreviewCountryItemCompact
          backgroundImage={theme.backgroundImageUrl || null}
          overrides={theme.overrides || {}}
          baseThemeYear={theme.baseThemeYear}
          points={points}
          lastPoints={lastPoints}
          showDouzePointsAnimation={showDouzePointsAnimation}
          isListItem
          onClick={() => handleAwardPoints(12)}
          previewCountryCode={theme.creator?.country}
          uppercaseEntryName={theme.uppercaseEntryName}
          pointsContainerShape={theme.pointsContainerShape}
          flagShape={theme.flagShape}
        />
      </div>
      {theme.creator && (
        <div className="mb-3">
          <UserInfo user={theme.creator} size="sm" />
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button
          variant="primary"
          onClick={() => onApply(theme)}
          className="!py-2 !px-4 !text-base"
          disabled={isApplied}
          Icon={<ThemeIcon className="sm:size-6 size-5" />}
        >
          {isApplied ? t('widgets.applied') : t('widgets.apply')}
        </Button>
        <Button
          variant="tertiary"
          onClick={() => onDuplicate(theme)}
          className="!py-2 !px-4 !text-base"
          disabled={!user}
          Icon={<CopyIcon className="sm:size-6 size-5" />}
        >
          {theme.duplicatesCount
            ? t('widgets.nCopies', { count: theme.duplicatesCount })
            : t('widgets.copy')}
        </Button>

        {isMyTheme && onEdit && (
          <Button
            variant="tertiary"
            onClick={() => onEdit(theme)}
            className="!py-2 !px-4 !text-base"
            Icon={<PencilIcon className="sm:size-6 size-5" />}
          >
            {t('common.edit')}
          </Button>
        )}

        {isMyTheme && onDelete && (
          <Button
            variant="destructive"
            onClick={() => {
              confirm({
                key: 'delete-theme',
                title: t('settings.confirmations.deleteItem', {
                  name: theme.name,
                }),
                description: t('settings.confirmations.actionCannotBeUndone'),
                type: 'danger',
                onConfirm: () => {
                  onDelete(theme._id);
                },
              });
            }}
            className="!py-2 !px-4 !text-base text-red-300 hover:text-red-200"
            Icon={<TrashIcon className="sm:size-6 size-5" />}
          >
            {t('common.delete')}
          </Button>
        )}

        <Button
          variant="tertiary"
          onClick={() => onLike?.(theme._id)}
          className="!py-2 !px-4 !text-base"
          disabled={!user || isMyTheme}
          Icon={
            likedByMe ? (
              <ThumbsUpSolidIcon className="sm:size-6 size-5" />
            ) : (
              <ThumbsUpIcon className="sm:size-6 size-5" />
            )
          }
        >
          {theme.likes > 0
            ? t('widgets.nLikes', { count: theme.likes })
            : t('widgets.like')}
        </Button>
        <Button
          variant="tertiary"
          onClick={() => onSave?.(theme._id, savedByMe ?? false)}
          className="!py-2 !px-4 !text-base"
          disabled={!user || isMyTheme}
          Icon={
            savedByMe ? (
              <BookmarkCheckIcon className="sm:size-6 size-5" />
            ) : (
              <BookmarkIcon className="sm:size-6 size-5" />
            )
          }
        >
          {theme.saves > 0
            ? t('widgets.nSaves', { count: theme.saves })
            : t('widgets.save')}
        </Button>
        <Button
          variant="tertiary"
          onClick={handleQuickSelect}
          className={`!py-2 !px-4 !text-base ${
            quickSelectedByMe ? 'bg-primary-700/50' : ''
          } `}
          disabled={!user}
          Icon={
            quickSelectedByMe ? (
              <PinSolidIcon className="sm:size-6 size-5" />
            ) : (
              <PinIcon className="sm:size-6 size-5" />
            )
          }
        >
          {t('widgets.quickSelect')}
        </Button>
      </div>
    </div>
  );
};

export default ThemeListItem;
