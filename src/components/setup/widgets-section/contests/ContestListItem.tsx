import { isSameYear } from 'date-fns';
import { Link2, Share2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import React, { useMemo } from 'react';
import { toast } from 'react-toastify';

import Image from 'next/image';

import { useHandleShare } from '../../hooks/useHandleShare';

import { useToggleContestQuickSelectMutation } from '@/api/quickSelect';
import { BookmarkCheckIcon } from '@/assets/icons/BookmarkCheckIcon';
import { BookmarkIcon } from '@/assets/icons/BookmarkIcon';
import { CircleDashedIcon } from '@/assets/icons/CircleDashedIcon';
import { ListIcon } from '@/assets/icons/ListIcon';
import { LoaderCircleIcon } from '@/assets/icons/LoaderCircleIcon';
import { MapPinIcon } from '@/assets/icons/MapPinIcon';
import { MicIcon } from '@/assets/icons/MicIcon';
import { PencilIcon } from '@/assets/icons/PencilIcon';
import { PinIcon } from '@/assets/icons/PinIcon';
import { PinSolidIcon } from '@/assets/icons/PinSolidIcon';
import { ThemeIcon } from '@/assets/icons/ThemeIcon';
import { ThumbsUpIcon } from '@/assets/icons/ThumbsUpIcon';
import { ThumbsUpSolidIcon } from '@/assets/icons/ThumbsUpSolidIcon';
import { TrashIcon } from '@/assets/icons/TrashIcon';
import { TrophyIcon } from '@/assets/icons/TrophyIcon';
import { UserCogIcon } from '@/assets/icons/UserCogIcon';
import { UsersIcon } from '@/assets/icons/UsersIcon';
import { UserStarIcon } from '@/assets/icons/UserStarIcon';
import OverflowMenu, {
  type OverflowMenuEntry,
} from '@/components/common/OverflowMenu';
import UserInfo from '@/components/common/UserInfo';
import { POINTS_ARRAY } from '@/data/data';
import { getFlagPath } from '@/helpers/getFlagPath';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useCountriesStore } from '@/state/countriesStore';
import { useAuthStore } from '@/state/useAuthStore';
import { getHostingCountryLogo } from '@/theme/hosting';
import { Contest } from '@/types/contest';

interface ContestListItemProps {
  contest: Contest;
  variant: 'user' | 'public';
  onEdit?: (contest: Contest) => void;
  onDelete?: (id: string) => void;
  onLoad: (contest: Contest) => void;
  onLike?: (id: string) => void;
  onSave?: (id: string, savedByMe: boolean) => void;
  likedByMe?: boolean;
  savedByMe?: boolean;
  quickSelectedByMe?: boolean;
  isActive?: boolean;
}

const ContestListItem: React.FC<ContestListItemProps> = ({
  contest,
  variant,
  onEdit,
  onDelete,
  onLoad,
  onLike,
  onSave,
  likedByMe,
  savedByMe,
  quickSelectedByMe,
  isActive,
}) => {
  const locale = useLocale();
  const getAllCountries = useCountriesStore((state) => state.getAllCountries);
  const handleShare = useHandleShare();
  const t = useTranslations();
  const { confirm } = useConfirmation();
  const user = useAuthStore((state) => state.user);

  const { mutateAsync: toggleQuickSelect } =
    useToggleContestQuickSelectMutation();

  const isMyContest =
    variant === 'user' || contest.userId.toString() === user?._id;

  const { winnerName, winnerFlag } = useMemo(() => {
    if (!contest.winner)
      return { winnerName: undefined, winnerFlag: undefined };
    const isCustomWinner = !!contest.winner?.name;

    if (isCustomWinner) {
      return {
        winnerName: contest.winner.name,
        winnerFlag: contest.winner.flag,
      };
    }

    const winnerCountry = getAllCountries().find(
      (country) => country.code === contest.winner?.code,
    );

    if (!winnerCountry) return { winnerName: undefined, winnerFlag: undefined };

    return {
      winnerName: winnerCountry.name,
      winnerFlag: getFlagPath(winnerCountry.code),
    };
  }, [contest.winner, getAllCountries]);

  const hasSplitPointsSystem = !!(
    contest.juryPointsSystem?.length || contest.televotePointsSystem?.length
  );

  const isCustomPointsSystem = useMemo(() => {
    if (hasSplitPointsSystem) return false;
    if (!contest.customPointsSystem || contest.customPointsSystem.length === 0)
      return false;
    if (contest.customPointsSystem.length !== POINTS_ARRAY.length) return true;
    for (let i = 0; i < contest.customPointsSystem.length; i += 1) {
      if (contest.customPointsSystem[i] !== POINTS_ARRAY[i]) return true;
    }

    return false;
  }, [contest.customPointsSystem, hasSplitPointsSystem]);

  const { logo, isExisting } = getHostingCountryLogo(
    contest.hostingCountryCode,
  );

  const handleQuickSelect = async () => {
    if (!user) return;
    try {
      await toggleQuickSelect(contest._id);
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
    const url = window.location.href.split('?')[0] + `?contest=${contest._id}`;

    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const overflowItems = [
    {
      icon: <Link2 className="size-4" />,
      label: t('widgets.copyLink'),
      onClick: handleCopyLink,
    },
    {
      icon: <Share2 className="size-4" />,
      label: t('simulation.header.share'),
      onClick: () => handleShare('contest', contest._id, contest.name),
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
    ...(isMyContest
      ? ([
          'hr',
          {
            variant: 'stats' as const,
            stats: [
              {
                id: 'likes',
                icon: <ThumbsUpIcon className="size-4" />,
                value: contest.likes,
              },
              {
                id: 'saves',
                icon: <BookmarkIcon className="size-4" />,
                value: contest.saves,
              },
            ],
          },
        ] as OverflowMenuEntry[])
      : []),
    ...(isMyContest && onDelete
      ? ([
          'hr',
          {
            icon: <TrashIcon className="size-4" />,
            label: t('common.delete'),
            onClick: () => {
              confirm({
                key: 'delete-contest',
                title: t('settings.confirmations.deleteItem', {
                  name: `${contest.name} ${contest.year}`,
                }),
                description: t('settings.confirmations.actionCannotBeUndone'),
                type: 'danger',
                onConfirm: () => onDelete(contest._id),
              });
            },
            variant: 'danger' as const,
          },
        ] as OverflowMenuEntry[])
      : []),
  ].filter(Boolean) as OverflowMenuEntry[];

  const secondaryActionClassName =
    'inline-flex items-center justify-center h-11 px-3 rounded-[10px] border text-[13.5px] font-bold transition-colors text-white/70 bg-white/[0.06] border-white/10 hover:text-white hover:bg-white/[0.12]';

  return (
    <div className="relative rounded-[18px] border shadow-xl transition-colors border-white/10 bg-gradient-to-bl from-primary-900 to-primary-800 overflow-hidden">
      {/* Accent top bar — wrapped to clip at card radius */}
      <div className="overflow-hidden rounded-t-[18px]">
        <div className="h-[5px] bg-gradient-to-r from-primary-700 to-transparent" />
      </div>

      <div className="grid gap-4 p-4 sm:[grid-template-columns:minmax(0,230px)_1fr] grid-cols-1">
        {/* Left: status panel */}
        <div className="flex sm:flex-col items-center sm:justify-center justify-between gap-2.5 rounded-[12px] text-center sm:border-b sm:border-r border-white/10 sm:py-[18px] sm:px-[14px] sm:bg-black/25 sm:shadow-[inset 0 0 0 1px rgba(255,255,255,0.06)] sm:flex-nowrap flex-wrap">
          <div className="flex sm:flex-col items-center sm:gap-2.5 gap-2">
            {/* Host flag/logo */}
            <Image
              src={logo}
              alt={t('simulation.header.hostingCountryLogo')}
              className={`flex-none rounded-sm ${
                isExisting
                  ? 'sm:w-[52px] w-[36px] sm:h-[52px] h-[36px] object-cover'
                  : 'w-[52px] h-[40px] object-cover'
              }`}
              width={52}
              height={52}
              onError={(e) => {
                e.currentTarget.src = getFlagPath('ww');
              }}
              unoptimized
            />

            {/* Contest name + year */}
            <div
              className="text-white font-[800] leading-tight sm:text-[17px] text-[16px]"
              style={{ letterSpacing: '-0.02em' }}
            >
              {contest.name} {contest.year}
            </div>
          </div>

          {/* Status badge */}
          {contest.winner ? (
            <ContestBadge variant="gold">
              {winnerFlag && (
                <Image
                  src={winnerFlag}
                  alt={winnerName ?? 'Winner flag'}
                  className="w-[18px] h-[13px] rounded-sm object-cover flex-none"
                  width={18}
                  height={13}
                  onError={(e) => {
                    e.currentTarget.src = getFlagPath('ww');
                  }}
                  unoptimized
                />
              )}
              {winnerName} 🏆
            </ContestBadge>
          ) : contest.isSimulationStarted ? (
            <ContestBadge variant="green">
              <LoaderCircleIcon className="size-3.5 flex-none" />
              {t('widgets.contests.inProgress')}
            </ContestBadge>
          ) : (
            <ContestBadge variant="red">
              <CircleDashedIcon className="size-3.5 flex-none" />
              {t('widgets.contests.notStarted')}
            </ContestBadge>
          )}
        </div>

        {/* Right: info + actions */}
        <div className="flex flex-col min-w-0">
          <div className="flex justify-between items-start gap-2">
            <span className="text-[11px] font-[800] tracking-[0.16em] uppercase whitespace-nowrap text-white/40">
              {isMyContest && !contest.isPublic
                ? t('widgets.private')
                : t('widgets.public')}{' '}
              {t('common.contest').toLowerCase()}
            </span>
            <span className="sm:text-[12.5px] text-[11px] text-white/40 whitespace-nowrap flex-shrink-0">
              {new Date(contest.createdAt).toLocaleDateString(locale, {
                year: isSameYear(new Date(contest.createdAt), new Date())
                  ? undefined
                  : 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          {/* Description */}
          {contest.description && (
            <p
              className="text-white/70 line-clamp-2 mt-1.5 leading-[1.5]"
              style={{ fontSize: '13.5px' }}
              title={contest.description}
            >
              {contest.description}
            </p>
          )}

          {/* Metadata badges */}
          <div className="flex flex-wrap gap-[7px] mt-2.5">
            {contest.venue && (
              <ContestBadge>
                <MapPinIcon className="size-3.5 flex-none" />
                {contest.venue}
              </ContestBadge>
            )}
            {contest.hosts && (
              <ContestBadge>
                <MicIcon className="size-3.5 flex-none" />
                {contest.hosts}
              </ContestBadge>
            )}
            {contest.stageNames.length > 0 && (
              <ContestBadge>
                <ListIcon className="size-3.5 flex-none" />
                {contest.stageNames.length <= 3
                  ? contest.stageNames.join(' → ')
                  : `${contest.stageNames[0]} → … → ${
                      contest.stageNames[contest.stageNames.length - 1]
                    } (${contest.stageNames.length})`}
              </ContestBadge>
            )}
            {contest.totalParticipants > 0 && (
              <ContestBadge>
                <UsersIcon className="size-3.5 flex-none" />
                {contest.stageNames.length > 1 ||
                contest.grandFinalParticipants !== contest.totalParticipants
                  ? t('widgets.contests.nParticipants', {
                      count: contest.totalParticipants,
                    }) + ' | '
                  : ''}
                {t('widgets.contests.nGrandFinalParticipants', {
                  count: contest.grandFinalParticipants,
                })}
              </ContestBadge>
            )}
            {contest.customEntriesCount > 0 && (
              <ContestBadge variant="amber">
                <UserCogIcon className="size-3.5 flex-none" />
                {t('widgets.contests.nCustom', {
                  count: contest.customEntriesCount,
                })}
              </ContestBadge>
            )}
            {isCustomPointsSystem && (
              <ContestBadge variant="purple">
                <UserStarIcon className="size-3.5 flex-none" />
                {t('widgets.contests.pointsSystem')}:{' '}
                {contest.customPointsSystem?.join(', ')}
              </ContestBadge>
            )}
            {hasSplitPointsSystem && contest.juryPointsSystem && (
              <ContestBadge variant="purple">
                <UserStarIcon className="size-3.5 flex-none" />
                {t('widgets.contests.juryPointsSystem')}:{' '}
                {contest.juryPointsSystem.join(', ')}
              </ContestBadge>
            )}
            {hasSplitPointsSystem && contest.televotePointsSystem && (
              <ContestBadge variant="violet">
                <UserStarIcon className="size-3.5 flex-none" />
                {t('widgets.contests.televotePointsSystem')}:{' '}
                {contest.televotePointsSystem.join(', ')}
              </ContestBadge>
            )}
            {(contest.themeId || contest.standardThemeId) && (
              <ContestBadge variant="pink">
                <ThemeIcon className="size-3.5 flex-none" />
                {t('common.theme')}:{' '}
                {contest.themeId
                  ? t('common.custom')
                  : contest.standardThemeId?.replace('-', ' ')}
              </ContestBadge>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1 min-h-[12px]" />

          {/* Creator */}
          {contest.creator && <UserInfo user={contest.creator} size="sm" />}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {/* Load */}
            <button
              type="button"
              onClick={() => onLoad(contest)}
              className="flex-1 min-w-[120px] h-11 rounded-[11px] flex items-center justify-center gap-2 text-[14.5px] font-[800] uppercase tracking-[0.02em] text-white transition-[filter] hover:brightness-110 disabled:cursor-not-allowed"
              style={{
                background:
                  'linear-gradient(180deg, hsl(var(--twc-primary-700)), hsl(var(--twc-primary-750)))',
                boxShadow:
                  '0 6px 18px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.25)',
                filter: isActive ? 'grayscale(0.3) brightness(0.8)' : undefined,
              }}
            >
              <TrophyIcon className="size-5 flex-none" />
              {isActive ? t('common.loaded') : t('common.load')}
            </button>

            {/* Secondary actions — grouped so they wrap as a unit */}
            <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
              {/* Edit (user contests only) */}
              {isMyContest && onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(contest)}
                  className={secondaryActionClassName}
                  aria-label={t('common.edit')}
                >
                  <PencilIcon className="size-[19px]" />
                </button>
              )}

              {/* Like / Save (public contests only) */}
              {!isMyContest && (
                <>
                  <button
                    type="button"
                    onClick={() => onLike?.(contest._id)}
                    disabled={!user}
                    className={`inline-flex items-center gap-1.5 h-11 px-3 rounded-[10px] border text-[13.5px] font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      likedByMe
                        ? 'text-white border-transparent'
                        : 'text-white/70 bg-white/[0.06] border-white/10 hover:text-white hover:bg-white/[0.12]'
                    }`}
                    style={
                      likedByMe
                        ? {
                            background: 'hsl(var(--twc-primary-700))',
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
                    {contest.likes > 0 && (
                      <span className="tabular-nums">{contest.likes}</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onSave?.(contest._id, savedByMe ?? false)}
                    disabled={!user}
                    className={`inline-flex items-center gap-1.5 h-11 px-3 rounded-[10px] border text-[13.5px] font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      savedByMe
                        ? 'text-white border-transparent'
                        : 'text-white/70 bg-white/[0.06] border-white/10 hover:text-white hover:bg-white/[0.12]'
                    }`}
                    style={
                      savedByMe
                        ? {
                            background: 'hsl(var(--twc-primary-700))',
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
                    {contest.saves > 0 && (
                      <span className="tabular-nums">{contest.saves}</span>
                    )}
                  </button>
                </>
              )}

              <OverflowMenu items={overflowItems} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContestListItem;

type BadgeVariant =
  | 'default'
  | 'purple'
  | 'violet'
  | 'pink'
  | 'amber'
  | 'gold'
  | 'green'
  | 'red';

const badgeVariantStyles: Record<
  BadgeVariant,
  { background: string; border: string; color: string }
> = {
  default: {
    background: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.10)',
    color: 'rgba(255,255,255,0.72)',
  },
  purple: {
    background: 'rgba(150,108,255,0.16)',
    border: 'rgba(150,108,255,0.32)',
    color: '#c3acff',
  },
  violet: {
    background: 'rgba(124,92,255,0.14)',
    border: 'rgba(124,92,255,0.30)',
    color: '#b9a4ff',
  },
  pink: {
    background: 'rgba(255,61,132,0.14)',
    border: 'rgba(255,61,132,0.32)',
    color: '#ff9bbe',
  },
  amber: {
    background: 'rgba(217,160,40,0.14)',
    border: 'rgba(217,160,40,0.30)',
    color: '#f0cd78',
  },
  gold: {
    background: 'rgba(245,200,60,0.16)',
    border: 'rgba(245,200,60,0.36)',
    color: '#ffe08a',
  },
  green: {
    background: 'rgba(46,196,138,0.14)',
    border: 'rgba(46,196,138,0.30)',
    color: '#8ff0c8',
  },
  red: {
    background: 'rgba(255,84,104,0.14)',
    border: 'rgba(255,84,104,0.32)',
    color: '#ffa6b1',
  },
};

const ContestBadge = ({
  variant = 'default',
  children,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
}) => {
  const styles = badgeVariantStyles[variant];

  return (
    <span
      className="inline-flex items-center gap-1.5 font-semibold leading-none rounded-full"
      style={{
        fontSize: '12.5px',
        padding: '7px 11px',
        background: styles.background,
        border: `1px solid ${styles.border}`,
        color: styles.color,
      }}
    >
      {children}
    </span>
  );
};
