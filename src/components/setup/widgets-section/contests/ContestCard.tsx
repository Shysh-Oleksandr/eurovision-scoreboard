'use client';
import { Check, CopyCheck, Dices, MoreHorizontal } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';

import dynamic from 'next/dynamic';
import Image from 'next/image';

import { api } from '@/api/client';
import { ArrowDownAndUpIcon } from '@/assets/icons/ArrowDownAndUpIcon';
import { ListPlusIcon } from '@/assets/icons/ListPlusIcon';
import { RestartIcon } from '@/assets/icons/RestartIcon';
import { SaveIcon } from '@/assets/icons/SaveIcon';
import AnchoredMenu, {
  AnchoredMenuEntry,
} from '@/components/common/AnchoredMenu';
import Button from '@/components/common/Button';
import DrawToggleButton, {
  useDrawToggle,
} from '@/components/setup/allocation-draw/DrawToggleButton';
import { useSetupUiStore } from '@/components/setup/hub/state/setupUiStore';
import { getFlagPath } from '@/helpers/getFlagPath';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import { getHostingCountryLogo } from '@/theme/hosting';

const CreateContestModal = dynamic(() => import('./CreateContestModal'), {
  ssr: false,
});

interface ContestCardProps {
  onReorderClick: () => void;
  onAddStageClick: () => void;
  participantsCount: number;
  stagesCount: number;
  isGfOnly: boolean;
  /** Setup diverged from the loaded contest snapshot. */
  hasUnsavedChanges: boolean;
  /** Every semi-final's line-up came from the allocation draw. */
  isDrawn: boolean;
}

const ContestCard: React.FC<ContestCardProps> = ({
  onReorderClick,
  onAddStageClick,
  participantsCount,
  stagesCount,
  isGfOnly,
  hasUnsavedChanges,
  isDrawn,
}) => {
  const t = useTranslations();
  const locale = useLocale();
  const isSmallPhone = useMediaQuery('(max-width: 390px)');
  const isPhone = useMediaQuery('(max-width: 640px)');
  const isTablet = useMediaQuery('(max-width: 768px)');
  const isNarrowDesktop = useMediaQuery('(max-width: 899px)');
  const drawToggle = useDrawToggle();

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
  const setContestToLoadGlobal = useGeneralStore(
    (state) => state.setContestToLoad,
  );

  const selectionMode = useSetupUiStore((state) => state.selectionMode);
  const setSelectionMode = useSetupUiStore((state) => state.setSelectionMode);

  const isOwner = useMemo(
    () => !activeContest || activeContest.userId.toString() === user?._id,
    [activeContest, user],
  );

  const { logo, isExisting } = getHostingCountryLogo(getHostingCountry());

  const [isContestsModalOpen, setIsContestsModalOpen] = useState(false);
  const [isContestsModalLoaded, setIsContestsModalLoaded] = useState(false);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);

  const { confirm: confirmResetContest } = useConfirmation();

  const onResetClick = () => {
    if (!activeContest) return;

    confirmResetContest({
      key: 'reset-contest',
      title: t('widgets.contests.confirmResetContestTitle'),
      description: t('widgets.contests.confirmResetContestDescription'),
      type: 'info',
      onConfirm: async () => {
        const { data } = await api.get(
          `/contests/${activeContest._id}/snapshot`,
        );

        setContestToLoadGlobal({ contest: activeContest, snapshot: data });
      },
    });
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

  const ownershipBadge = `${
    isOwner ? t('widgets.yours') : t('widgets.community')
  } · ${
    activeContest
      ? activeContest.isPublic
        ? t('widgets.public')
        : t('widgets.private')
      : t('widgets.local')
  }`;

  const subLine = `${t('setup.eventSetupModal.contestSub', {
    participants: participantsCount,
    stages: stagesCount,
  })}${isGfOnly ? ` · ${t('setup.eventSetupModal.grandFinalOnly')}` : ''}`;
  const drawSub = drawToggle.enabled
    ? t('setup.allocationDraw.subToBeDrawn', {
        count: drawToggle.waitingCount,
      })
    : isDrawn
    ? t('setup.allocationDraw.subDrawn')
    : null;

  const moreItems: AnchoredMenuEntry[] = [
    {
      label: t('setup.allocationDraw.title'),
      description: drawToggle.available
        ? undefined
        : drawToggle.shortReason ?? undefined,
      icon: <Dices className="size-4" />,
      trailing: drawToggle.enabled ? (
        <Check className="size-4 text-accent" />
      ) : undefined,
      disabled: !drawToggle.available,
      onClick: drawToggle.toggle,
    },
    'hr' as const,
    // Small phones have no room for the Select button in the row.
    ...(isSmallPhone
      ? [
          {
            label: t('setup.eventSetupModal.select'),
            icon: <CopyCheck className="size-4" />,
            trailing: selectionMode ? (
              <Check className="size-4 text-accent" />
            ) : undefined,
            onClick: () => setSelectionMode(!selectionMode),
          },
          'hr' as const,
        ]
      : []),
    {
      label: t('setup.eventSetupModal.reorderStages'),
      icon: <ArrowDownAndUpIcon className="size-4" />,
      onClick: onReorderClick,
    },
    {
      label: t('setup.eventStageModal.addStage'),
      icon: <ListPlusIcon className="size-4" />,
      onClick: onAddStageClick,
    },
    ...(activeContest
      ? [
          'hr' as const,
          {
            label: t('common.reset'),
            icon: <RestartIcon className="size-4" />,
            onClick: onResetClick,
          },
        ]
      : []),
  ];

  const saveButton = (
    <Button
      onClick={() => setIsContestsModalOpen(true)}
      variant="surfaceStrong"
      size={isPhone ? 'sm' : 'md'}
      title={user ? t('common.save') : t('common.authenticationRequired')}
      aria-label={t('common.save')}
      Icon={<SaveIcon className="size-[17px]" />}
      snowEffect="right"
      disabled={!user}
      className="!h-[38px]"
    >
      {t('common.save')}
    </Button>
  );

  const selectButton = (
    <Button
      onClick={() => setSelectionMode(!selectionMode)}
      variant="surface"
      size={isTablet ? 'sm' : 'md'}
      title={t('setup.eventSetupModal.select')}
      aria-label={t('setup.eventSetupModal.select')}
      aria-pressed={selectionMode}
      Icon={<CopyCheck className="size-[17px]" />}
      className={`${selectionMode ? 'is-on' : ''} ${
        isTablet ? '!w-[34px] !px-0 justify-center' : ''
      }`}
    >
      {isTablet
        ? undefined
        : selectionMode
        ? t('setup.eventSetupModal.selecting')
        : t('setup.eventSetupModal.select')}
    </Button>
  );

  return (
    <>
      <div className="dp-contest-card relative flex items-center gap-2.5 2cols:gap-[13px] px-3 py-[13px] 2cols:px-4 2cols:py-[15px] rounded-[14px] text-white">
        <div className="absolute -top-2.5 left-3.5 flex gap-1.5 z-[2]">
          <span className="dp-badge-pill text-[10.5px] font-extrabold tracking-[.02em] px-2.5 py-1 rounded-full whitespace-nowrap">
            {ownershipBadge}
          </span>
          {hasUnsavedChanges && (
            <span className="dp-badge-pill text-[10.5px] font-extrabold tracking-[.02em] px-2.5 py-1 rounded-full whitespace-nowrap">
              {t('setup.eventSetupModal.unsavedChanges')}
            </span>
          )}
          {lastUpdatedBadge && (
            <span className="dp-badge-pill text-[10.5px] font-extrabold tracking-[.02em] px-2.5 py-1 rounded-full whitespace-nowrap hidden 2cols:inline">
              {lastUpdatedBadge}
            </span>
          )}
        </div>

        {showHostingCountryLogo && (
          <Image
            src={logo}
            alt={t('simulation.header.hostingCountryLogo')}
            className={`flex-none rounded-sm ${
              isExisting ? 'w-8 h-8 overflow-visible' : 'w-8 h-6 object-cover'
            }`}
            width={32}
            height={32}
            onError={(e) => {
              e.currentTarget.src = getFlagPath('ww');
            }}
            unoptimized
          />
        )}

        <div className="min-w-0">
          <h5
            className="text-[15.5px] md:text-[17px] lg:text-[19px] font-extrabold tracking-[-.022em] leading-tight truncate"
            title={contestDescription || undefined}
          >
            {contestName} {contestYear}
          </h5>
          <p className="text-[10px] 2cols:text-xs font-bold text-white/70 mt-0.5 truncate">
            {subLine}
            {drawSub && (
              <>
                {' · '}
                <span
                  className={
                    drawToggle.enabled ? 'text-white font-extrabold' : ''
                  }
                >
                  {drawSub}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-[5px] 2cols:gap-[7px] flex-none">
          {!isSmallPhone && selectButton}
          {isPhone ? (
            <>
              {saveButton}
              <span className="relative flex-none">
                <Button
                  variant="surface"
                  size="sm"
                  onClick={(e) => {
                    const target = e.currentTarget;

                    setMoreAnchor((prev) => (prev ? null : target));
                  }}
                  title={t('common.more')}
                  aria-label={t('common.more')}
                  Icon={<MoreHorizontal className="size-[18px]" />}
                />
                {drawToggle.enabled && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full bg-accent shadow-[0_0_0_2px_var(--p-800)]"
                  />
                )}
              </span>
              <AnchoredMenu
                open={!!moreAnchor}
                anchor={moreAnchor}
                onClose={() => setMoreAnchor(null)}
                items={moreItems}
                placement="bottom-end"
                ariaLabel={t('common.more')}
              />
            </>
          ) : (
            <>
              {activeContest && (
                <Button
                  onClick={onResetClick}
                  variant="surface"
                  size="md"
                  title={t('common.reset')}
                  aria-label={t('common.reset')}
                  Icon={<RestartIcon className="size-[17px]" />}
                />
              )}
              <Button
                onClick={onReorderClick}
                variant="surface"
                size="md"
                title={t('setup.eventSetupModal.reorderStages')}
                aria-label={t('setup.eventSetupModal.reorderStages')}
                Icon={<ArrowDownAndUpIcon className="size-[17px]" />}
              />
              <Button
                onClick={onAddStageClick}
                variant="surface"
                size="md"
                title={t('setup.eventStageModal.addStage')}
                aria-label={t('setup.eventStageModal.addStage')}
                Icon={<ListPlusIcon className="size-[17px]" />}
              />
              <span
                aria-hidden="true"
                className="w-px h-6 bg-[var(--hair-2)] mx-[3px] flex-none"
              />
              <DrawToggleButton
                compact={isNarrowDesktop}
                size={isTablet ? 'sm' : 'md'}
              />
              {saveButton}
            </>
          )}
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
