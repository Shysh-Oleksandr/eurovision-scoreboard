import { isSameYear } from 'date-fns';
import { Link2, Share2, Volume1 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';

import { useHandleShare } from '../../hooks/useHandleShare';

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
import OverflowMenu, {
  type OverflowMenuEntry,
} from '@/components/common/OverflowMenu';
import UserInfo from '@/components/common/UserInfo';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useAuthStore } from '@/state/useAuthStore';
import { resolveThemeSpecificsForCustomTheme } from '@/theme/themeSpecifics';
import { getCssVarsForCustomTheme, getCardThemeVars } from '@/theme/themeUtils';
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
  const isBelowXs = useMediaQuery('(max-width: 479px)');

  const { mutateAsync: toggleQuickSelect } =
    useToggleThemeQuickSelectMutation();
  const { confirm } = useConfirmation();
  const handleShare = useHandleShare();

  const [points, setPoints] = useState(42);
  const [lastPoints, setLastPoints] = useState<number | null>(12);
  const [showDouzePointsAnimation, setShowDouzePointsAnimation] =
    useState(false);

  const handleAwardPoints = (value: number) => {
    setLastPoints(value);
    setPoints((prev) => prev + value);
    setShowDouzePointsAnimation(true);
    setTimeout(() => setShowDouzePointsAnimation(false), 3000);
  };

  const handleQuickSelect = async () => {
    if (!user) return;
    try {
      await toggleQuickSelect(theme._id);
      toast.success(
        quickSelectedByMe
          ? t('widgets.quickSelectRemoved')
          : t('widgets.quickSelectAdded'),
      );
    } catch (error: any) {
      console.error('Failed to toggle quick select:', error);
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href.split('?')[0] + `?theme=${theme._id}`;

    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const cssVars = useMemo(() => getCssVarsForCustomTheme(theme), [theme]);
  const cardThemeVars = useMemo(() => getCardThemeVars(theme), [theme]);
  const themeSpecifics = useMemo(
    () => resolveThemeSpecificsForCustomTheme(theme),
    [theme],
  );

  const overflowItems: OverflowMenuEntry[] = [
    ...(isBelowXs
      ? ([
          {
            icon: <CopyIcon className="size-4" />,
            label:
              (theme.duplicatesCount ?? 0) > 0
                ? `${t('widgets.copy')} (${theme.duplicatesCount})`
                : t('widgets.copy'),
            onClick: () => onDuplicate(theme),
          },
          'hr',
        ] as OverflowMenuEntry[])
      : []),
    {
      icon: <Link2 className="size-4" />,
      label: t('widgets.copyLink'),
      onClick: handleCopyLink,
    },
    {
      icon: <Share2 className="size-4" />,
      label: t('simulation.header.share'),
      onClick: () => handleShare('theme', theme._id, theme.name),
    },
    'hr',
    {
      icon: quickSelectedByMe ? (
        <PinSolidIcon className="size-4" />
      ) : (
        <PinIcon className="size-4" />
      ),
      label: t('widgets.quickSelect'),
      onClick: handleQuickSelect,
    },
    ...(isMyTheme
      ? ([
          'hr',
          {
            variant: 'stats' as const,
            stats: [
              {
                id: 'likes',
                icon: <ThumbsUpIcon className="size-4" />,
                value: theme.likes,
              },
              {
                id: 'saves',
                icon: <BookmarkIcon className="size-4" />,
                value: theme.saves,
              },
            ],
          },
        ] as OverflowMenuEntry[])
      : []),
    ...(isMyTheme && onDelete
      ? ([
          'hr',
          {
            icon: <TrashIcon className="size-4" />,
            label: t('common.delete'),
            onClick: () => {
              confirm({
                key: 'delete-theme',
                title: t('settings.confirmations.deleteItem', {
                  name: theme.name,
                }),
                description: t('settings.confirmations.actionCannotBeUndone'),
                type: 'danger',
                onConfirm: () => onDelete(theme._id),
              });
            },
            variant: 'danger' as const,
          },
        ] as OverflowMenuEntry[])
      : []),
  ];

  const secondaryActionClassName =
    'inline-flex items-center gap-1.5 h-11 px-3 rounded-[10px] border text-[13.5px] font-bold transition-colors text-white/70 bg-white/[0.06] border-white/10 hover:text-white hover:bg-white/[0.12]';

  return (
    <div
      className="relative rounded-[18px] border shadow-xl transition-colors hover:brightness-105 overflow-hidden"
      style={{
        ...(cssVars as React.CSSProperties),
        ...(cardThemeVars as React.CSSProperties),
        background: 'linear-gradient(155deg, var(--t-a), var(--t-b))',
        borderColor: 'var(--t-bd)',
      }}
    >
      {/* Accent top bar — wrapped to clip at card radius */}
      <div className="overflow-hidden rounded-t-[18px]">
        <div
          style={{
            height: 5,
            background: 'linear-gradient(90deg, var(--t-acc), transparent)',
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {/* Left: scoreboard preview */}
        <div className="flex flex-col gap-2 min-w-0">
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
            uppercaseEntryName={themeSpecifics.uppercaseEntryName}
            pointsContainerShape={themeSpecifics.pointsContainerShape}
            flagShape={themeSpecifics.flagShape}
            isJuryPointsPanelRounded={themeSpecifics.isJuryPointsPanelRounded}
            juryActivePointsUnderline={themeSpecifics.juryActivePointsUnderline}
            usePointsCountUpAnimation={themeSpecifics.usePointsCountUpAnimation}
            roundedCountryContainer={themeSpecifics.roundedCountryContainer}
            douzePointsAnimationMode={themeSpecifics.douzePointsAnimationMode}
            togglesBelow
          />
        </div>

        {/* Right: info + actions */}
        <div className="flex flex-col min-w-0">
          {/* Header row */}
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0 flex-1">
              {/* Kicker + audio pill */}
              <div className="flex items-center gap-1.5 mb-[5px] flex-wrap">
                <span
                  className="text-[11px] font-[800] tracking-[0.16em] uppercase whitespace-nowrap"
                  style={{ color: 'var(--t-acc)' }}
                >
                  {isMyTheme && !theme.isPublic
                    ? t('widgets.private')
                    : t('widgets.public')}{' '}
                  {t('common.theme').toLowerCase()}
                </span>
                {theme.hasCustomAudio && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white/70 bg-black/[0.28] rounded-full px-2.5 py-[3px]">
                    <Volume1 className="size-[11px]" />
                    Audio
                  </span>
                )}
              </div>

              {/* Theme name */}
              <h3 className="text-white font-[800] sm:text-[19px] text-[17px] tracking-[-0.02em] leading-tight m-0">
                {theme.name}
              </h3>

              {/* Description */}
              {theme.description && (
                <p className="text-white/70 text-[13.5px] line-clamp-2 mt-1 leading-[1.5]">
                  {theme.description}
                </p>
              )}
            </div>

            {/* Date + overflow */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <span className="sm:text-[12.5px] text-[11px] font-semibold text-white/40 whitespace-nowrap">
                {new Date(theme.createdAt).toLocaleDateString(locale, {
                  year: isSameYear(new Date(theme.createdAt), new Date())
                    ? undefined
                    : 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <OverflowMenu items={overflowItems} />
            </div>
          </div>

          <div className="mt-auto md:pt-2">
            {/* Creator */}
            {theme.creator && <UserInfo user={theme.creator} size="sm" />}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {/* Apply */}
              <button
                type="button"
                onClick={() => onApply(theme)}
                disabled={isApplied}
                className="flex-1 min-w-[120px] h-11 rounded-[11px] flex items-center justify-center gap-2 text-[14.5px] font-[800] uppercase tracking-[0.02em] text-white transition-[filter] hover:brightness-110 disabled:cursor-not-allowed"
                style={{
                  background:
                    'linear-gradient(180deg, var(--t-acc), var(--t-acc-d))',
                  boxShadow:
                    '0 6px 18px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.25)',
                  filter: isApplied
                    ? 'grayscale(0.3) brightness(0.8)'
                    : undefined,
                }}
              >
                <ThemeIcon className="size-5 flex-none" />
                {isApplied ? t('widgets.applied') : t('widgets.apply')}
              </button>

              {/* Secondary actions — grouped so they wrap as a unit */}
              <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                {/* Edit (user themes only) */}
                {isMyTheme && onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(theme)}
                    className={secondaryActionClassName}
                    aria-label={t('common.edit')}
                  >
                    <PencilIcon className="size-[19px]" />
                  </button>
                )}

                {/* Like / Save (public themes only) */}
                {!isMyTheme && (
                  <>
                    <button
                      type="button"
                      onClick={() => onLike?.(theme._id)}
                      disabled={!user}
                      className={`inline-flex items-center gap-1.5 h-11 px-3 rounded-[10px] border text-[13.5px] font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        likedByMe
                          ? 'text-white border-transparent'
                          : 'text-white/70 bg-white/[0.06] border-white/10 hover:text-white hover:bg-white/[0.12]'
                      }`}
                      style={
                        likedByMe
                          ? {
                              background: 'var(--t-acc)',
                              borderColor: 'transparent',
                            }
                          : {}
                      }
                    >
                      {likedByMe ? (
                        <ThumbsUpSolidIcon className="size-[19px]" />
                      ) : (
                        <ThumbsUpIcon className="size-[19px]" />
                      )}
                      {theme.likes > 0 && (
                        <span className="tabular-nums">{theme.likes}</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onSave?.(theme._id, savedByMe ?? false)}
                      disabled={!user}
                      className={`inline-flex items-center gap-1.5 h-11 px-3 rounded-[10px] border text-[13.5px] font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        savedByMe
                          ? 'text-white border-transparent'
                          : 'text-white/70 bg-white/[0.06] border-white/10 hover:text-white hover:bg-white/[0.12]'
                      }`}
                      style={
                        savedByMe
                          ? {
                              background: 'var(--t-acc)',
                              borderColor: 'transparent',
                            }
                          : {}
                      }
                    >
                      {savedByMe ? (
                        <BookmarkCheckIcon className="size-[19px]" />
                      ) : (
                        <BookmarkIcon className="size-[19px]" />
                      )}
                      {theme.saves > 0 && (
                        <span className="tabular-nums">{theme.saves}</span>
                      )}
                    </button>
                  </>
                )}
                {/* Copy — visible from xs up; below xs lives in overflow menu */}
                <button
                  type="button"
                  onClick={() => onDuplicate(theme)}
                  className={`${secondaryActionClassName} hidden xs:inline-flex`}
                >
                  <CopyIcon className="size-[19px]" />
                  {(theme.duplicatesCount ?? 0) > 0 && (
                    <span className="tabular-nums">
                      {theme.duplicatesCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeListItem;
