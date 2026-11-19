'use client';
import {
  Check,
  CopyCheck,
  CopyPlus,
  Dices,
  Globe,
  Lock,
  MonitorSmartphone,
  MoreHorizontal,
  PencilLine,
  Users,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import React, { useMemo, useRef, useState } from 'react';

import Image from 'next/image';

import { useContestSave } from './useContestSave';

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
import { fitStepAttributes, useFitStep } from '@/hooks/useFitStep';
import { languageTag } from '@/i18n/catalog';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import { getHostingCountryLogo } from '@/theme/hosting';

/**
 * Layouts from roomiest to tightest, picked by `useFitStep` (see
 * `.dp-cc-layout` in styles.css): one row while the title and every
 * button fit; then the buttons move under the title; then Reset / Reorder /
 * Add stage go into the ⋯ menu, Select drops its label, and last the draw
 * toggle joins the menu. Save always keeps its label.
 */
const CARD_STEPS = [
  { layout: 'row', tools: 'all', draw: 'full' },
  { layout: 'row', tools: 'all', draw: 'short' },
  { layout: 'stack', tools: 'all', draw: 'full' },
  { layout: 'stack', tools: 'all', draw: 'short' },
  { layout: 'stack', tools: 'menu', draw: 'short' },
  { layout: 'stack', tools: 'compact', draw: 'short' },
  { layout: 'stack', tools: 'compact', draw: 'menu' },
] as const;

const TOOL_CLASS = '!h-[38px]';
const ICON_TOOL_CLASS = '!h-[38px] !w-[38px]';

interface ContestCardProps {
  onReorderClick: () => void;
  onAddStageClick: () => void;
  /** Setup diverged from the loaded contest snapshot. */
  hasUnsavedChanges: boolean;
}

const ContestCard: React.FC<ContestCardProps> = ({
  onReorderClick,
  onAddStageClick,
  hasUnsavedChanges,
}) => {
  const t = useTranslations();
  const locale = useLocale();
  const drawToggle = useDrawToggle();
  const cardRef = useRef<HTMLDivElement>(null);
  const step = CARD_STEPS[useFitStep(cardRef, CARD_STEPS)];

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
  const shouldUse2026WhiteHeartFlags = useGeneralStore(
    (state) => state.settings.shouldUse2026WhiteHeartFlags,
  );
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

  const { logo, isExisting } = getHostingCountryLogo(
    getHostingCountry(),
    true,
    shouldUse2026WhiteHeartFlags,
  );

  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  const moreRef = useRef<HTMLSpanElement>(null);
  // Save on a contest the user already saved stores it in one tap; anything
  // else (not saved yet, someone else's) opens the save dialog.
  const {
    save: onSaveClick,
    openDialog: openSaveDialog,
    ownsOpenContest,
    isSaving,
    offline,
    dialogElement: saveDialogElement,
  } = useContestSave({
    returnFocusTo: () => moreRef.current?.querySelector('button'),
  });

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

  // Where the contest lives, then its save state.
  const where = !activeContest
    ? {
        icon: <MonitorSmartphone className="size-[15px]" />,
        label: t('setup.eventSetupModal.contestOnThisDevice'),
      }
    : !isOwner
    ? {
        icon: <Users className="size-[15px]" />,
        label: t('widgets.community'),
      }
    : activeContest.isPublic
    ? { icon: <Globe className="size-[15px]" />, label: t('widgets.public') }
    : { icon: <Lock className="size-[15px]" />, label: t('widgets.private') };
  const savedOn =
    activeContest && isOwner
      ? new Date(activeContest.updatedAt).toLocaleDateString(
          languageTag(locale),
          {
            hour: '2-digit',
            minute: '2-digit',
            month: 'short',
            day: 'numeric',
          },
        )
      : null;

  const secondaryInMenu = step.tools !== 'all';
  const drawInMenu = step.draw === 'menu';
  const saveItems: AnchoredMenuEntry[] = ownsOpenContest
    ? [
        {
          label: t('widgets.contests.saveDialog.menuEditDetails'),
          icon: <PencilLine className="size-4" />,
          description: offline ? t('offline.needsConnection') : undefined,
          disabled: offline,
          onClick: () => openSaveDialog('details'),
        },
        {
          label: t('widgets.contests.saveDialog.menuSaveAsNew'),
          icon: <CopyPlus className="size-4" />,
          description: offline ? t('offline.needsConnection') : undefined,
          disabled: offline,
          onClick: () => openSaveDialog('new'),
        },
      ]
    : [];
  const toolItems: AnchoredMenuEntry[] = [
    ...(drawInMenu
      ? [
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
        ]
      : []),
    ...(secondaryInMenu
      ? [
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
        ]
      : []),
  ];
  const moreItems: AnchoredMenuEntry[] = [
    ...saveItems,
    ...(saveItems.length && toolItems.length ? ['hr' as const] : []),
    ...toolItems,
  ];

  return (
    <>
      <div className="dp-contest-card px-3 py-[13px] 2cols:px-4 2cols:py-[15px] rounded-[14px] text-white">
        {/* Measured without the card's padding: buttons running into the
            padding would not show up as overflow. */}
        <div
          ref={cardRef}
          className="dp-cc-layout"
          {...fitStepAttributes(step)}
          // The ⋯ menu holds Edit details / Save as new: shown at every step.
          data-save-menu={ownsOpenContest ? '' : undefined}
        >
          <div className="dp-cc-head flex items-center gap-2.5 2cols:gap-[13px] min-w-0">
            {showHostingCountryLogo && (
              <Image
                src={logo}
                alt={t('simulation.header.hostingCountryLogo')}
                className={`flex-none rounded-sm ${
                  isExisting
                    ? 'w-[32px] h-[32px] 2cols:w-[40px] 2cols:h-[40px] overflow-visible'
                    : 'w-[40px] h-[30px] object-cover'
                }`}
                width={40}
                height={40}
                onError={(e) => {
                  e.currentTarget.src = getFlagPath('ww');
                }}
                unoptimized
              />
            )}
            <div className="min-w-0">
              <h5
                className="dp-cc-title text-[17px] 2cols:text-[22px] lg:text-2xl font-extrabold tracking-[-.022em] leading-tight line-clamp-2 text-balance"
                title={contestDescription || undefined}
              >
                {contestName} {contestYear}
              </h5>
              <p className="dp-cc-meta flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[12.5px] 2cols:text-[13px] font-semibold text-white/80">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  {where.icon}
                  {where.label}
                </span>
                {hasUnsavedChanges ? (
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-white">
                    <span
                      aria-hidden="true"
                      className="w-2 h-2 rounded-full bg-accent flex-none"
                    />
                    {t('setup.eventSetupModal.unsavedChanges')}
                  </span>
                ) : (
                  savedOn && (
                    <span className="whitespace-nowrap text-white/60">
                      {t('setup.eventSetupModal.contestSaved', {
                        date: savedOn,
                      })}
                    </span>
                  )
                )}
              </p>
            </div>
          </div>

          <div className="dp-cc-tools">
            <Button
              onClick={() => setSelectionMode(!selectionMode)}
              variant="surface"
              size="md"
              title={t('setup.eventSetupModal.select')}
              aria-label={t('setup.eventSetupModal.select')}
              aria-pressed={selectionMode}
              Icon={<CopyCheck className="size-[17px]" />}
              className={`dp-cc-select ${TOOL_CLASS} ${
                selectionMode ? 'is-on' : ''
              }`}
            >
              <span className="dp-cc-select-label">
                {selectionMode
                  ? t('setup.eventSetupModal.selecting')
                  : t('setup.eventSetupModal.select')}
              </span>
            </Button>
            {activeContest && (
              <Button
                onClick={onResetClick}
                variant="surface"
                size="md"
                title={t('common.reset')}
                aria-label={t('common.reset')}
                Icon={<RestartIcon className="size-[17px]" />}
                className={`dp-cc-secondary ${ICON_TOOL_CLASS}`}
              />
            )}
            <Button
              onClick={onReorderClick}
              variant="surface"
              size="md"
              title={t('setup.eventSetupModal.reorderStages')}
              aria-label={t('setup.eventSetupModal.reorderStages')}
              Icon={<ArrowDownAndUpIcon className="size-[17px]" />}
              className={`dp-cc-secondary ${ICON_TOOL_CLASS}`}
            />
            <Button
              onClick={onAddStageClick}
              variant="surface"
              size="md"
              title={t('setup.eventStageModal.addStage')}
              aria-label={t('setup.eventStageModal.addStage')}
              Icon={<ListPlusIcon className="size-[17px]" />}
              className={`dp-cc-secondary ${ICON_TOOL_CLASS}`}
            />
            <span
              aria-hidden="true"
              className="dp-cc-divider w-px h-6 bg-[var(--hair-2)] mx-[3px]"
            />
            <span className="dp-cc-end">
              <DrawToggleButton className={`dp-cc-draw ${TOOL_CLASS}`} />
              <Button
                onClick={onSaveClick}
                variant="surfaceStrong"
                size="md"
                title={offline ? t('offline.needsConnection') : undefined}
                Icon={<SaveIcon className="size-[17px]" />}
                snowEffect="right"
                snowEffectClassName="dp-fit-ignore"
                disabled={offline}
                isLoading={isSaving}
                className={TOOL_CLASS}
              >
                {t('common.save')}
              </Button>
              <span ref={moreRef} className="dp-cc-more relative">
                <Button
                  variant="surface"
                  size="md"
                  onClick={(e) => {
                    const target = e.currentTarget;

                    setMoreAnchor((prev) => (prev ? null : target));
                  }}
                  title={t('common.more')}
                  aria-label={t('common.more')}
                  Icon={<MoreHorizontal className="size-[18px]" />}
                  className={ICON_TOOL_CLASS}
                />
                {drawInMenu && drawToggle.enabled && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full bg-accent shadow-[0_0_0_2px_var(--p-800)]"
                  />
                )}
              </span>
            </span>
            <AnchoredMenu
              open={!!moreAnchor && moreItems.length > 0}
              anchor={moreAnchor}
              onClose={() => setMoreAnchor(null)}
              items={moreItems}
              placement="bottom-end"
              ariaLabel={t('common.more')}
            />
          </div>
        </div>
      </div>

      {saveDialogElement}
    </>
  );
};

export default ContestCard;
