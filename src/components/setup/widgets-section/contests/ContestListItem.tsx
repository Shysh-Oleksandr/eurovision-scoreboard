import { Flag, Link2, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

import Image from 'next/image';

import { useHandleShare } from '../../hooks/useHandleShare';

import { useToggleContestQuickSelectMutation } from '@/api/quickSelect';
import { BookmarkCheckIcon } from '@/assets/icons/BookmarkCheckIcon';
import { BookmarkIcon } from '@/assets/icons/BookmarkIcon';
import { CircleDashedIcon } from '@/assets/icons/CircleDashedIcon';
import { LoaderCircleIcon } from '@/assets/icons/LoaderCircleIcon';
import { PencilIcon } from '@/assets/icons/PencilIcon';
import { PinIcon } from '@/assets/icons/PinIcon';
import { PinSolidIcon } from '@/assets/icons/PinSolidIcon';
import { ThumbsUpIcon } from '@/assets/icons/ThumbsUpIcon';
import { ThumbsUpSolidIcon } from '@/assets/icons/ThumbsUpSolidIcon';
import { TrashIcon } from '@/assets/icons/TrashIcon';
import { TrophyIcon } from '@/assets/icons/TrophyIcon';
import Button from '@/components/common/Button';
import OverflowMenu, {
  type OverflowMenuEntry,
} from '@/components/common/OverflowMenu';
import UserInfo from '@/components/common/UserInfo';
import { POINTS_ARRAY } from '@/data/data';
import { getFlagPath } from '@/helpers/getFlagPath';
import { buildShareUrl } from '@/helpers/shareUrl';
import { toast } from '@/helpers/toast';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useFormatItemTime } from '@/hooks/useFormatItemTime';
import { useIsOffline } from '@/state/connectivityStore';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { openReportDialog } from '@/state/reportDialogStore';
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
  const formatTime = useFormatItemTime();
  // Built-in names: the list spans contests.
  const getCanonicalCountries = useCountriesStore(
    (state) => state.getCanonicalCountries,
  );
  const handleShare = useHandleShare();
  const t = useTranslations();
  const { confirm } = useConfirmation();
  const user = useAuthStore((state) => state.user);
  // Loading fetches the contest's snapshot; editing, likes and saves are
  // account actions.
  const offline = useIsOffline();
  const shouldUse2026WhiteHeartFlags = useGeneralStore(
    (state) => state.settings.shouldUse2026WhiteHeartFlags,
  );

  const { mutateAsync: toggleQuickSelect } =
    useToggleContestQuickSelectMutation();

  const isMyContest =
    variant === 'user' || contest.userId.toString() === user?._id;

  const { winnerName, winnerFlag } = useMemo(() => {
    const { winner } = contest;

    if (!winner) return { winnerName: undefined, winnerFlag: undefined };

    // The backend stores a name and flag for a custom entry and for a
    // standard country the contest renamed or reflagged; otherwise the
    // country is shown as it ships.
    const builtIn = getCanonicalCountries(false).find(
      (country) => country.code === winner.code,
    );
    const name = winner.name ?? builtIn?.name;

    if (!name) return { winnerName: undefined, winnerFlag: undefined };

    return {
      winnerName: name,
      winnerFlag: winner.flag
        ? getFlagPath({ code: winner.code, name, flag: winner.flag })
        : builtIn
        ? getFlagPath(builtIn.code)
        : undefined,
    };
  }, [contest, getCanonicalCountries]);

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
    true,
    shouldUse2026WhiteHeartFlags,
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
    const url = buildShareUrl({ contest: contest._id });

    navigator.clipboard.writeText(url);
    toast.success(t('graphics.gallery.toast.linkCopied'));
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
    ...(!isMyContest
      ? ([
          'hr',
          {
            icon: <Flag className="size-4" />,
            label: t('moderation.report'),
            onClick: () =>
              openReportDialog({
                type: 'contest',
                id: contest._id,
                name: `${contest.name} ${contest.year ?? ''}`.trim(),
                creator: contest.creator,
              }),
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

  // Line 1: the stages; line 2: the entries.
  const stagesLine =
    contest.stageNames.length === 0
      ? null
      : contest.stageNames.length <= 3
      ? contest.stageNames.join(' → ')
      : `${contest.stageNames[0]} → … → ${
          contest.stageNames[contest.stageNames.length - 1]
        } (${contest.stageNames.length})`;
  const finalists = t('widgets.contests.nGrandFinalParticipants', {
    count: contest.grandFinalParticipants,
  });
  const entriesLine =
    contest.totalParticipants > 0
      ? contest.stageNames.length > 1 ||
        contest.grandFinalParticipants !== contest.totalParticipants
        ? `${t('widgets.contests.nParticipants', {
            count: contest.totalParticipants,
          })}, ${finalists}`
        : finalists
      : null;

  // The rest, quietly: when, where your own lives, then the details.
  const details = [
    { id: 'date', text: formatTime(contest.createdAt) },
    ...(isMyContest
      ? [
          {
            id: 'visibility',
            text: contest.isPublic ? t('widgets.public') : t('widgets.private'),
          },
        ]
      : []),
    ...(contest.group ? [{ id: 'group', text: contest.group.name }] : []),
    ...(contest.customEntriesCount > 0
      ? [
          {
            id: 'custom',
            text: t('widgets.contests.nCustom', {
              count: contest.customEntriesCount,
            }),
          },
        ]
      : []),
    ...(contest.themeId || contest.standardThemeId
      ? [
          {
            id: 'theme',
            text: `${t('common.theme')}: ${
              contest.themeId
                ? t('common.custom')
                : contest.standardThemeId?.replace('-', ' ')
            }`,
          },
        ]
      : []),
    ...(contest.venue
      ? [
          {
            id: 'venue',
            text: `${t('widgets.contests.venue')}: ${contest.venue}`,
          },
        ]
      : []),
    ...(contest.hosts
      ? [
          {
            id: 'hosts',
            text: `${t('widgets.contests.hosts')}: ${contest.hosts}`,
          },
        ]
      : []),
    ...(isCustomPointsSystem
      ? [
          {
            id: 'points',
            text: `${t(
              'widgets.contests.pointsSystem',
            )}: ${contest.customPointsSystem?.join(', ')}`,
          },
        ]
      : []),
    ...(hasSplitPointsSystem && contest.juryPointsSystem
      ? [
          {
            id: 'jury-points',
            text: `${t(
              'widgets.contests.juryPointsSystem',
            )}: ${contest.juryPointsSystem.join(', ')}`,
          },
        ]
      : []),
    ...(hasSplitPointsSystem && contest.televotePointsSystem
      ? [
          {
            id: 'televote-points',
            text: `${t(
              'widgets.contests.televotePointsSystem',
            )}: ${contest.televotePointsSystem.join(', ')}`,
          },
        ]
      : []),
  ];

  const secondaryActionClassName =
    'inline-flex items-center justify-center h-11 px-3 rounded-[10px] border text-[13.5px] font-bold transition-colors text-white/70 bg-white/[0.06] border-white/10 hover:text-white hover:bg-white/[0.12]';

  return (
    <div className="relative rounded-[18px] border border-hair bg-p-900 overflow-hidden">
      <div className="grid gap-4 p-4 sm:[grid-template-columns:minmax(0,230px)_1fr] grid-cols-1">
        {/* Left: status panel */}
        <div className="relative flex sm:flex-col items-center sm:justify-center justify-between gap-2.5 rounded-[12px] text-left sm:text-center sm:py-[18px] sm:px-[14px] sm:bg-black/20 sm:flex-nowrap flex-wrap overflow-hidden">
          {/* Contest logo/banner */}
          {contest.logoUrl && (
            <Image
              src={contest.logoUrl}
              alt=""
              unoptimized
              className="object-cover absolute top-0 left-0 bottom-0 right-0 z-10"
              fill
            />
          )}
          <div className="flex sm:flex-col items-center sm:gap-2.5 gap-2 z-20">
            {/* Host flag/logo */}
            <Image
              src={logo}
              alt={t('simulation.header.hostingCountryLogo')}
              className={`flex-none overflow-visible rounded-sm ${
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
            <h3 className="text-white font-[800] leading-tight sm:text-[17px] text-[16px] tracking-[-0.02em] text-balance">
              {contest.name} {contest.year}
            </h3>
          </div>

          <div className="z-20">
            {/* Status: the winner, or how far the simulation got */}
            <ContestStatus>
              {contest.winner ? (
                <>
                  <TrophyIcon className="size-4 flex-none text-accent" />
                  {winnerFlag && (
                    <Image
                      src={winnerFlag}
                      alt=""
                      className="w-[18px] h-[13px] rounded-sm object-cover flex-none"
                      width={18}
                      height={13}
                      onError={(e) => {
                        e.currentTarget.src = getFlagPath('ww');
                      }}
                      unoptimized
                    />
                  )}
                  <span className="truncate">{winnerName}</span>
                </>
              ) : contest.isSimulationStarted ? (
                <>
                  <LoaderCircleIcon className="size-3.5 flex-none opacity-75" />
                  {t('widgets.contests.inProgress')}
                </>
              ) : (
                <>
                  <CircleDashedIcon className="size-3.5 flex-none opacity-75" />
                  {t('widgets.contests.notStarted')}
                </>
              )}
            </ContestStatus>
          </div>
        </div>

        {/* Right: info + actions */}
        <div className="flex flex-col min-w-0">
          {/* Description */}
          {contest.description && (
            <p
              className="text-white/70 line-clamp-2 leading-[1.5] mb-2.5"
              style={{ fontSize: '13.5px' }}
              title={contest.description}
            >
              {contest.description}
            </p>
          )}

          {/* What the contest is, by weight instead of icons: its stages,
              then its entries, then the rest quietly in two lines at most. */}
          {stagesLine && (
            <p className="text-[14px] font-bold leading-snug text-white text-pretty">
              {stagesLine}
            </p>
          )}
          {entriesLine && (
            <p className="mt-0.5 text-[13px] font-semibold leading-snug text-white/75">
              {entriesLine}
            </p>
          )}
          <p
            className="mt-1.5 line-clamp-2 text-[12.5px] font-semibold leading-[1.45] text-white/55"
            title={details.map((detail) => detail.text).join('\n')}
          >
            {details.map((detail) => (
              <span
                key={detail.id}
                className="mr-3.5 inline-block max-w-full truncate align-bottom last:mr-0"
              >
                {detail.id === 'date' ? (
                  <time dateTime={contest.createdAt}>{detail.text}</time>
                ) : (
                  detail.text
                )}
              </span>
            ))}
          </p>

          {/* Spacer */}
          <div className="flex-1 min-h-[12px]" />

          {/* Creator (not on your own list: it's you) */}
          {contest.creator && variant !== 'user' && (
            <UserInfo user={contest.creator} size="sm" />
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {/* Load */}
            <Button
              variant="cta"
              size="lg"
              onClick={() => onLoad(contest)}
              disabled={offline}
              title={offline ? t('offline.loadContest') : undefined}
              className={`flex-1 min-w-[120px] justify-center !uppercase ${
                isActive ? 'opacity-80' : ''
              }`}
              Icon={<TrophyIcon className="size-5 flex-none" />}
            >
              {isActive ? t('common.loaded') : t('common.load')}
            </Button>

            {/* Secondary actions — grouped so they wrap as a unit */}
            <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
              {/* Edit (user contests only) */}
              {isMyContest && onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(contest)}
                  disabled={offline}
                  className={`${secondaryActionClassName} disabled:opacity-40 disabled:cursor-not-allowed`}
                  aria-label={t('common.edit')}
                  title={offline ? t('offline.needsConnection') : undefined}
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
                    disabled={!user || offline}
                    aria-label={t('widgets.like')}
                    aria-pressed={!!likedByMe}
                    className={`dp-lib-toggle inline-flex items-center gap-1.5 h-11 px-3 rounded-[10px] text-[13.5px] font-bold disabled:opacity-40 disabled:cursor-not-allowed ${
                      likedByMe ? 'is-on' : ''
                    }`}
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
                    disabled={!user || offline}
                    aria-label={t('widgets.save')}
                    aria-pressed={!!savedByMe}
                    className={`dp-lib-toggle inline-flex items-center gap-1.5 h-11 px-3 rounded-[10px] text-[13.5px] font-bold disabled:opacity-40 disabled:cursor-not-allowed ${
                      savedByMe ? 'is-on' : ''
                    }`}
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

/** The left panel's status line: neutral, readable over a logo banner. */
const ContestStatus = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-3 py-[7px] text-[12.5px] font-bold leading-none text-white">
    {children}
  </span>
);
