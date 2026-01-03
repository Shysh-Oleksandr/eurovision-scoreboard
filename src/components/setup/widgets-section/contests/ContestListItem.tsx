import { useLocale, useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

import Image from 'next/image';

import { BookmarkCheckIcon } from '@/assets/icons/BookmarkCheckIcon';
import { BookmarkIcon } from '@/assets/icons/BookmarkIcon';
import { PencilIcon } from '@/assets/icons/PencilIcon';
import { ThumbsUpIcon } from '@/assets/icons/ThumbsUpIcon';
import { ThumbsUpSolidIcon } from '@/assets/icons/ThumbsUpSolidIcon';
import { TrashIcon } from '@/assets/icons/TrashIcon';
import { TrophyIcon } from '@/assets/icons/TrophyIcon';
import Button from '@/components/common/Button';
import UserInfo from '@/components/common/UserInfo';
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
  isActive,
}) => {
  const locale = useLocale();

  const getAllCountries = useCountriesStore((state) => state.getAllCountries);
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

  const t = useTranslations();

  const { confirm } = useConfirmation();

  const user = useAuthStore((state) => state.user);
  const isMyContest =
    variant === 'user' || contest.userId.toString() === user?._id;

  const { logo, isExisting } = getHostingCountryLogo(
    contest.hostingCountryCode,
  );

  return (
    <div className="bg-primary-950 bg-gradient-to-bl from-primary-900 to-primary-800/60 shadow-lg rounded-lg overflow-hidden p-4 border border-white/20 hover:border-white/40 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          {!contest.isPublic && (
            <div className="text-xs text-white/60 bg-primary-800 font-medium rounded-full px-2 leading-[0.8rem] py-1 w-fit mb-1.5">
              {t('widgets.private')}
            </div>
          )}

          <h3 className="text-white font-semibold text-l mb-1">
            <div className="flex items-center justify-between flex-wrap gap-1.5">
              <div className="flex items-center gap-1.5">
                <Image
                  src={logo}
                  alt={t('simulation.header.hostingCountryLogo')}
                  className={`flex-none rounded-sm ${
                    isExisting
                      ? 'w-8 h-8 overflow-visible'
                      : 'w-8 h-6 object-cover mr-1'
                  }`}
                  width={32}
                  height={32}
                  onError={(e) => {
                    e.currentTarget.src = getFlagPath('ww');
                  }}
                  unoptimized
                />
                <span>
                  {contest.name} {contest.year}
                </span>
              </div>

              <span className="text-xs text-white/60">
                {new Date(contest.createdAt).toLocaleDateString(locale, {
                  hour: '2-digit',
                  minute: '2-digit',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          </h3>
          {contest.description && (
            <p
              className="text-white/70 text-sm line-clamp-3"
              title={contest.description}
            >
              {contest.description}
            </p>
          )}

          {/* Contest metadata */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {contest.stageNames.length > 0 && (
              <span className="text-xs bg-primary-800/60 text-white/80 px-2 py-1 rounded-full">
                {contest.stageNames.join(' → ')}
              </span>
            )}

            {contest.totalParticipants > 0 && (
              <span className="text-xs bg-primary-800/60 text-white/80 px-2 py-1 rounded-full">
                {t('widgets.contests.nParticipants', {
                  count: contest.totalParticipants,
                })}{' '}
                |{' '}
                {t('widgets.contests.nGrandFinalParticipants', {
                  count: contest.grandFinalParticipants,
                })}
              </span>
            )}

            {contest.customEntriesCount > 0 && (
              <span className="text-xs bg-amber-900/60 text-amber-200 px-2 py-1 rounded-full">
                {t('widgets.contests.nCustom', {
                  count: contest.customEntriesCount,
                })}
              </span>
            )}

            {contest.customPointsSystem &&
              contest.customPointsSystem.length > 0 && (
                <span className="text-xs bg-purple-900/60 text-purple-200 px-2 py-1 rounded-full">
                  {t('widgets.contests.pointsSystem')}:{' '}
                  {contest.customPointsSystem.join(', ')}
                </span>
              )}

            {contest.isSimulationStarted && !contest.winner && (
              <span className="text-xs bg-green-900/60 text-green-200 px-2 py-1 rounded-full">
                {t('widgets.contests.inProgress')}
              </span>
            )}
            {!contest.isSimulationStarted && (
              <span className="text-xs bg-red-900/60 text-red-200 px-2 py-1 rounded-full">
                {t('widgets.contests.notStarted')}
              </span>
            )}

            {contest.winner && (
              <span className="text-xs bg-yellow-900/60 text-yellow-200 px-2 py-1 rounded-full flex items-center gap-1">
                {winnerFlag && (
                  <Image
                    src={winnerFlag}
                    alt={winnerName ?? 'Winner flag'}
                    className="w-5 h-4 rounded-sm"
                    width={20}
                    height={16}
                    onError={(e) => {
                      e.currentTarget.src = getFlagPath('ww');
                    }}
                    unoptimized
                  />
                )}{' '}
                {winnerName} 🏆
              </span>
            )}
          </div>
        </div>
      </div>

      {contest.creator && (
        <div className="mb-3">
          <UserInfo user={contest.creator} size="sm" />
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button
          variant="primary"
          onClick={() => onLoad(contest)}
          className="!py-2 !px-4 !text-base"
          Icon={<TrophyIcon className="sm:size-6 size-5" />}
        >
          {isActive ? t('common.loaded') : t('common.load')}
        </Button>

        {isMyContest && onEdit && (
          <Button
            variant="tertiary"
            onClick={() => onEdit(contest)}
            className="!py-2 !px-4 !text-base"
            Icon={<PencilIcon className="sm:size-6 size-5" />}
          >
            {t('common.edit')}
          </Button>
        )}

        {isMyContest && onDelete && (
          <Button
            variant="destructive"
            onClick={() => {
              confirm({
                key: 'delete-contest',
                title: t('settings.confirmations.deleteItem', {
                  name: `${contest.name} ${contest.year}`,
                }),
                description: t('settings.confirmations.actionCannotBeUndone'),
                type: 'danger',
                onConfirm: () => {
                  onDelete(contest._id);
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
          onClick={() => onLike?.(contest._id)}
          className="!py-2 !px-4 !text-base"
          disabled={!user || isMyContest}
          Icon={
            likedByMe ? (
              <ThumbsUpSolidIcon className="sm:size-6 size-5" />
            ) : (
              <ThumbsUpIcon className="sm:size-6 size-5" />
            )
          }
        >
          {contest.likes > 0
            ? t('widgets.nLikes', { count: contest.likes })
            : t('widgets.like')}
        </Button>
        <Button
          variant="tertiary"
          onClick={() => onSave?.(contest._id, savedByMe ?? false)}
          className="!py-2 !px-4 !text-base"
          disabled={!user || isMyContest}
          Icon={
            savedByMe ? (
              <BookmarkCheckIcon className="sm:size-6 size-5" />
            ) : (
              <BookmarkIcon className="sm:size-6 size-5" />
            )
          }
        >
          {contest.saves > 0
            ? t('widgets.nSaves', { count: contest.saves })
            : t('widgets.save')}
        </Button>
      </div>
    </div>
  );
};

export default ContestListItem;
