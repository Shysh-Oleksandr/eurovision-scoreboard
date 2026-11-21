import {
  ALargeSmall,
  Flag,
  Folder,
  Globe,
  Link2,
  Lock,
  Share2,
  Video,
  Volume1,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';

import { useHandleShare } from '../../hooks/useHandleShare';

import ThemePreviewCountryItemCompact from './ThemePreviewCountryItemCompact';

import { api } from '@/api/client';
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
import OverflowMenu, {
  type OverflowMenuEntry,
} from '@/components/common/OverflowMenu';
import UserInfo from '@/components/common/UserInfo';
import { douzeDurationScale } from '@/douze/options';
import { buildShareUrl } from '@/helpers/shareUrl';
import { toast } from '@/helpers/toast';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useFormatItemTime } from '@/hooks/useFormatItemTime';
import { useIsOffline } from '@/state/connectivityStore';
import { useGeneralStore } from '@/state/generalStore';
import { openReportDialog } from '@/state/reportDialogStore';
import { useAuthStore } from '@/state/useAuthStore';
import { resolveThemeSpecificsForCustomTheme } from '@/theme/themeSpecifics';
import {
  getCssVarsForCustomTheme,
  getCardThemeVars,
  getCustomThemeInterfaceVars,
  getFontCssVarsForCustomTheme,
} from '@/theme/themeUtils';
import { useCustomFontFaces } from '@/theme/useCustomFontFaces';
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
  const formatTime = useFormatItemTime();
  const t = useTranslations();

  const user = useAuthStore((state) => state.user);
  // Editing saves to the account; likes and saves are account actions.
  const offline = useIsOffline();
  const setSelectedShareTheme = useGeneralStore(
    (state) => state.setSelectedShareTheme,
  );
  const isMyTheme = variant === 'user' || theme.userId.toString() === user?._id;

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
    setTimeout(
      () => setShowDouzePointsAnimation(false),
      3000 * douzeDurationScale(themeSpecifics.douzeOptions),
    );
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
    const url = buildShareUrl({ theme: theme._id });

    navigator.clipboard.writeText(url);
    toast.success(t('graphics.gallery.toast.linkCopied'));
  };

  // Open the source theme this one was remixed from (same flow as share links).
  const handleOpenRemixSource = async () => {
    if (!theme.remixedFrom) return;
    try {
      const { data } = await api.get(`/themes/${theme.remixedFrom}`);

      setSelectedShareTheme(data);
    } catch (error: any) {
      // Source was deleted or made private — leave the label as plain text.
      console.error('Failed to open remix source:', error);
    }
  };

  const cssVars = useMemo(() => getCssVarsForCustomTheme(theme), [theme]);
  const cardThemeVars = useMemo(() => getCardThemeVars(theme), [theme]);
  // The preview inside the card renders in the theme's scoreboard font.
  const fontVars = useMemo(() => getFontCssVarsForCustomTheme(theme), [theme]);

  useCustomFontFaces(theme.customFonts);
  // The card's accent (Apply CTA, state toggle) is this theme's interface
  // accent, not the active one's; `dp-accent-scope` re-derives it on the card.
  const interfaceVars = useMemo(
    () => getCustomThemeInterfaceVars(theme),
    [theme],
  );
  const themeSpecifics = useMemo(
    () => resolveThemeSpecificsForCustomTheme(theme),
    [theme],
  );

  const overflowItems = [
    ...(user
      ? [
          {
            icon: <CopyIcon className="size-4" />,
            label:
              (theme.duplicatesCount ?? 0) > 0
                ? `${t('widgets.remix')} (${theme.duplicatesCount})`
                : t('widgets.remix'),
            onClick: () => onDuplicate(theme),
          },
        ]
      : []),
    user ? 'hr' : null,
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
    user ? 'hr' : null,
    ...(user
      ? [
          {
            icon: quickSelectedByMe ? (
              <PinSolidIcon className="size-4" />
            ) : (
              <PinIcon className="size-4" />
            ),
            label: t('widgets.quickSelect'),
            onClick: handleQuickSelect,
          },
        ]
      : []),
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
    ...(!isMyTheme
      ? ([
          'hr',
          {
            icon: <Flag className="size-4" />,
            label: t('moderation.report'),
            onClick: () =>
              openReportDialog({
                type: 'theme',
                id: theme._id,
                name: theme.name,
                creator: theme.creator,
              }),
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
  ].filter(Boolean) as OverflowMenuEntry[];

  // One line of facts under the name: where your own theme lives, its
  // group, and what it adds beyond colours.
  const factIconClassName = 'size-3.5';
  const facts = [
    ...(isMyTheme
      ? [
          {
            id: 'visibility',
            icon: theme.isPublic ? (
              <Globe className={factIconClassName} aria-hidden="true" />
            ) : (
              <Lock className={factIconClassName} aria-hidden="true" />
            ),
            label: theme.isPublic ? t('widgets.public') : t('widgets.private'),
          },
        ]
      : []),
    ...(theme.group
      ? [
          {
            id: 'group',
            icon: <Folder className={factIconClassName} aria-hidden="true" />,
            label: theme.group.name,
          },
        ]
      : []),
    ...(theme.hasCustomAudio
      ? [
          {
            id: 'audio',
            icon: <Volume1 className={factIconClassName} aria-hidden="true" />,
            label: t('widgets.library.audio'),
          },
        ]
      : []),
    ...(theme.hasCustomFonts
      ? [
          {
            id: 'fonts',
            icon: (
              <ALargeSmall className={factIconClassName} aria-hidden="true" />
            ),
            label: t('widgets.library.customFonts'),
          },
        ]
      : []),
    ...(theme.backgroundVideoUrl
      ? [
          {
            id: 'video',
            icon: <Video className={factIconClassName} aria-hidden="true" />,
            label: t('widgets.library.backgroundVideo'),
          },
        ]
      : []),
  ];

  const secondaryActionClassName =
    'inline-flex items-center gap-1.5 h-11 px-3 rounded-[10px] border text-[13.5px] font-bold transition-colors text-white/70 bg-white/[0.06] border-white/10 hover:text-white hover:bg-white/[0.12]';

  return (
    <div
      className="dp-accent-scope relative rounded-[18px] border overflow-hidden"
      style={{
        ...(cssVars as React.CSSProperties),
        ...(interfaceVars as React.CSSProperties),
        ...(cardThemeVars as React.CSSProperties),
        ...(fontVars as React.CSSProperties),
        background: 'linear-gradient(155deg, var(--t-a), var(--t-b))',
        borderColor: 'var(--t-bd)',
      }}
    >
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
            douzeOptions={themeSpecifics.douzeOptions}
            stateMenu
          />
        </div>

        {/* Right: info + actions */}
        <div className="flex flex-col min-w-0">
          {/* Header row */}
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0 flex-1">
              {/* Theme name */}
              <h3 className="text-white font-[800] sm:text-[19px] text-[17px] tracking-[-0.02em] leading-tight m-0 text-balance">
                {theme.name}
              </h3>

              {/* Facts: where it lives (your own), its group, what it adds */}
              {facts.length > 0 && (
                <ul className="flex flex-wrap items-center gap-x-3.5 gap-y-1 mt-1.5 text-[12.5px] font-semibold text-white/70">
                  {facts.map((fact) => (
                    <li
                      key={fact.id}
                      className="inline-flex items-center gap-1.5 min-w-0 max-w-full"
                    >
                      <span className="flex-none opacity-75">{fact.icon}</span>
                      <span className="truncate">{fact.label}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Remixed-from provenance */}
              {theme.remixedFrom && theme.remixedFromName && (
                <p className="text-white/50 text-[12px] mt-0.5 leading-tight">
                  {t.rich('widgets.themes.remixedFrom', {
                    name: theme.remixedFromName,
                    span: (chunks) => (
                      <button
                        type="button"
                        onClick={handleOpenRemixSource}
                        className="text-white/70 font-semibold hover:text-white underline underline-offset-2 transition-colors"
                      >
                        {chunks}
                      </button>
                    ),
                  })}
                </p>
              )}

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
                {formatTime(theme.createdAt)}
              </span>
              <OverflowMenu items={overflowItems} />
            </div>
          </div>

          <div className="mt-auto md:pt-2">
            {/* Creator (not on your own list: it's you) */}
            {theme.creator && variant !== 'user' && (
              <UserInfo user={theme.creator} size="sm" />
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {/* Apply */}
              <Button
                variant="cta"
                size="lg"
                onClick={() => onApply(theme)}
                disabled={isApplied}
                className="flex-1 min-w-[120px] justify-center !uppercase"
                Icon={<ThemeIcon className="size-5 flex-none" />}
              >
                {isApplied ? t('widgets.applied') : t('widgets.apply')}
              </Button>

              {/* Secondary actions — grouped so they wrap as a unit */}
              <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                {/* Edit (user themes only) */}
                {isMyTheme && onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(theme)}
                    disabled={offline}
                    className={`${secondaryActionClassName} disabled:opacity-40 disabled:cursor-not-allowed`}
                    aria-label={t('common.edit')}
                    title={offline ? t('offline.needsConnection') : undefined}
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
                      disabled={!user || offline}
                      aria-label={t('widgets.like')}
                      aria-pressed={!!likedByMe}
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
                      disabled={!user || offline}
                      aria-label={t('widgets.save')}
                      aria-pressed={!!savedByMe}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeListItem;
