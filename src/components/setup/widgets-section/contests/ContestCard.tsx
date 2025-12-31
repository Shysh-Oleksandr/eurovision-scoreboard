import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import dynamic from 'next/dynamic';
import Image from 'next/image';

import Button from '../../../common/Button';

import { api } from '@/api/client';
import { ArrowDownAndUpIcon } from '@/assets/icons/ArrowDownAndUpIcon';
import { ListPlusIcon } from '@/assets/icons/ListPlusIcon';
import { RestartIcon } from '@/assets/icons/RestartIcon';
import { SaveIcon } from '@/assets/icons/SaveIcon';
import { applyContestSnapshotToStores } from '@/helpers/contestSnapshot';
import { getFlagPath } from '@/helpers/getFlagPath';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import { getHostingCountryLogo } from '@/theme/hosting';

const CreateContestModal = dynamic(() => import('./CreateContestModal'), {
  ssr: false,
});

interface ContestCardProps {
  onReorderClick?: () => void;
  onAddStageClick?: () => void;
}

const ContestCard: React.FC<ContestCardProps> = ({
  onReorderClick,
  onAddStageClick,
}) => {
  const t = useTranslations();
  const locale = useLocale();

  const user = useAuthStore((state) => state.user);
  const contestName = useGeneralStore((state) => state.settings.contestName);
  const contestYear = useGeneralStore((state) => state.settings.contestYear);
  const contestDescription = useGeneralStore(
    (state) => state.settings.contestDescription,
  );
  const showHostingCountryLogo = useGeneralStore(
    (state) => state.settings.showHostingCountryLogo,
  );
  const getHostingCountry = useGeneralStore((state) => state.getHostingCountry);
  const activeContest = useGeneralStore((state) => state.activeContest);

  const isOwner = useMemo(() => {
    return !activeContest || activeContest.userId.toString() === user?._id;
  }, [activeContest, user]);

  const { logo, isExisting } = getHostingCountryLogo(getHostingCountry());

  const [isContestsModalOpen, setIsContestsModalOpen] = useState(false);
  const [isContestsModalLoaded, setIsContestsModalLoaded] = useState(false);

  const onResetClick = async () => {
    if (!activeContest) return;

    if (confirm(t('widgets.contests.confirmResetContest'))) {
      const { data } = await api.get(`/contests/${activeContest._id}/snapshot`);

      await applyContestSnapshotToStores(data, activeContest);
    }
  };

  const lastUpdatedBadge = useMemo(() => {
    return activeContest && isOwner
      ? `${t('common.lastSaved')}: ${new Date(
          activeContest.updatedAt,
        ).toLocaleDateString(locale, {
          hour: '2-digit',
          minute: '2-digit',
          month: 'short',
          day: 'numeric',
        })}`
      : null;
  }, [activeContest, locale, isOwner, t]);

  const ownershipBadge = useMemo(() => {
    return `${isOwner ? t('widgets.yours') : t('widgets.community')} • ${
      activeContest
        ? activeContest?.isPublic
          ? t('widgets.public')
          : t('widgets.private')
        : t('widgets.local')
    }`;
  }, [isOwner, activeContest, t]);

  return (
    <>
      <div
        className={`w-full relative bg-primary-900 bg-gradient-to-bl from-[10%] from-primary-800 to-primary-700/60 p-3 text-white rounded-lg border border-primary-900 shadow-lg border-solid`}
      >
        {/* Ownershib badge */}
        <div className="flex items-center flex-wrap gap-1 z-[60] absolute -top-2 left-2">
          <div className="px-2 py-0.5 font-medium rounded-md whitespace-nowrap bg-primary-800 text-white text-xs shadow-sm">
            {ownershipBadge}
          </div>
          {lastUpdatedBadge && (
            <div className="px-2 py-0.5 font-medium rounded-md whitespace-nowrap bg-primary-800 text-white text-xs shadow-sm">
              {lastUpdatedBadge}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {showHostingCountryLogo && (
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
            )}
            <div>
              <h5 className="text-base font-semibold">
                {contestName} {contestYear}
              </h5>
              {contestDescription && (
                <p className="text-xs text-white/60 line-clamp-2">
                  {contestDescription}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeContest && (
              <Button
                onClick={onResetClick}
                variant="tertiary"
                title="Reset"
                aria-label="Reset"
                Icon={<RestartIcon className="w-5 h-5" />}
              />
            )}
            <Button
              onClick={onReorderClick}
              variant="tertiary"
              title="Reorder"
              aria-label="Reorder"
              Icon={<ArrowDownAndUpIcon className="w-5 h-5" />}
            />
            <Button
              onClick={onAddStageClick}
              title="Add Stage"
              aria-label="Add Stage"
              Icon={<ListPlusIcon className="w-5 h-5" />}
              className="!pr-1.5"
              variant="tertiary"
            />
            <Button
              onClick={() => setIsContestsModalOpen(true)}
              title={
                user ? t('common.save') : t('common.authenticationRequired')
              }
              aria-label="Save"
              Icon={<SaveIcon className="w-5 h-5" />}
              snowEffect="right"
              disabled={!user}
            />
          </div>
        </div>
      </div>

      {(isContestsModalOpen || isContestsModalLoaded) && (
        <CreateContestModal
          isOpen={isContestsModalOpen}
          onClose={() => setIsContestsModalOpen(false)}
          onLoaded={() => setIsContestsModalLoaded(true)}
          initialContest={isOwner && activeContest ? activeContest : undefined}
        />
      )}
    </>
  );
};

export default ContestCard;
