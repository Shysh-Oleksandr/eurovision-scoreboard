'use client';
import { ChevronRight, Dices, TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';
import { toast } from 'react-toastify';

import { useAllocationDrawContext } from './AllocationDrawContext';
import { useDrawCopy } from './drawCopy';
import { enterDrawMode, leaveDrawMode, restoreSummary } from './drawMode';
import { useDrawUiStore } from './drawUiStore';
import { codesInDrawSemis } from './useAllocationDraw';

import Modal from '@/components/common/Modal/Modal';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';

const Choice: React.FC<{
  title: string;
  description: string;
  primary?: boolean;
  onClick: () => void;
}> = ({ title, description, primary, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`dp-choice ${
      primary ? 'dp-choice--primary' : ''
    } grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 items-center text-left px-3.5 py-[13px] rounded-xl text-white`}
  >
    <span className="text-[14.5px] font-extrabold tracking-[-.01em]">
      {title}
    </span>
    <ChevronRight className="row-span-2 col-start-2 size-[18px] text-white/55" />
    <span className="col-start-1 text-[12.5px] font-semibold text-white/70 text-pretty">
      {description}
    </span>
  </button>
);

/**
 * The two choice dialogs of draw mode: entering with semis that already hold
 * countries, and leaving while countries are still waiting.
 */
const DrawModeDialogs: React.FC = () => {
  const t = useTranslations('setup.allocationDraw');
  const tCommon = useTranslations('common');
  const dialog = useDrawUiStore((s) => s.dialog);
  const closeDialog = useDrawUiStore((s) => s.closeDialog);
  const draw = useAllocationDrawContext();
  const contestName = useGeneralStore((s) => s.settings.contestName);
  const contestYear = useGeneralStore((s) => s.settings.contestYear);
  const stages = useCountriesStore((s) => s.configuredEventStages);
  const assignments = useCountriesStore((s) => s.eventAssignments);
  const copy = useDrawCopy(
    (code) => draw.byCode.get(code)?.name ?? code,
    (id) => stages.find((s) => s.id === id)?.name ?? id,
  );

  const semiFinalists = useMemo(
    () => codesInDrawSemis(stages, assignments, draw.rules).length,
    [stages, assignments, draw.rules],
  );
  const semisWithCountries = useMemo(
    () =>
      draw.semis
        .filter((s) =>
          Object.values(assignments).some((group) => group === s.id),
        )
        .map((s) => s.name),
    [draw.semis, assignments],
  );
  const waiting = draw.waitingCodes.length;
  const summary = dialog === 'leave' ? restoreSummary() : null;

  const restoreDescription = summary
    ? summary.toPool === 0
      ? t('restoreAllSemis', { count: summary.toSemis })
      : summary.toSemis === 0
      ? t('restorePool', { count: summary.toPool })
      : t('restoreMixed', { semis: summary.toSemis, pool: summary.toPool })
    : '';

  const content =
    dialog === 'enter' ? (
      <>
        <span className="dp-dice-badge w-[46px] h-[46px] rounded-[13px] grid place-items-center mb-3.5">
          <Dices className="size-6" />
        </span>
        <h3 className="m-0 text-[19px] font-extrabold tracking-[-.02em] leading-[1.25] text-pretty">
          {t('enterTitle', { count: semiFinalists })}
        </h3>
        <p className="mt-[7px] mb-4 text-[13.5px] font-semibold text-white/70 leading-[1.45] text-pretty">
          {t('enterDescription', {
            stages: copy.listNames(semisWithCountries),
            count: semisWithCountries.length,
          })}
        </p>
        <div className="flex flex-col gap-2">
          <Choice
            primary
            title={t('enterMove')}
            description={t('enterMoveDescription', { count: semiFinalists })}
            onClick={() => {
              closeDialog();
              const moved = enterDrawMode(true);

              toast.success(t('toastMovedToDraw', { count: moved }));
            }}
          />
          <Choice
            title={t('enterKeep')}
            description={t('enterKeepDescription')}
            onClick={() => {
              closeDialog();
              enterDrawMode(false);
              toast.success(t('toastDrawOn'));
            }}
          />
        </div>
      </>
    ) : (
      <>
        <span className="dp-warn-badge w-[46px] h-[46px] rounded-[13px] grid place-items-center mb-3.5">
          <TriangleAlert className="size-6" />
        </span>
        <h3 className="m-0 text-[19px] font-extrabold tracking-[-.02em] leading-[1.25] text-pretty">
          {t('leaveTitle', { count: waiting })}
        </h3>
        <p className="mt-[7px] mb-4 text-[13.5px] font-semibold text-white/70 leading-[1.45] text-pretty">
          {t('leaveDescription')}
        </p>
        <div className="flex flex-col gap-2">
          <Choice
            primary
            title={t('leaveRestore')}
            description={restoreDescription}
            onClick={() => {
              closeDialog();
              leaveDrawMode('restore');
              toast.success(t('toastRestored'));
            }}
          />
          <Choice
            title={t('leavePool')}
            description={t('leavePoolDescription', {
              contest: `${contestName} ${contestYear}`.trim(),
            })}
            onClick={() => {
              closeDialog();
              const moved = leaveDrawMode('pool');

              toast.success(t('toastReturnedToPool', { count: moved }));
            }}
          />
        </div>
      </>
    );

  return (
    <Modal
      isOpen={dialog !== null}
      onClose={closeDialog}
      overlayClassName="!z-[1050] max-2cols:!items-end"
      containerClassName="dp-dialog dp-sheet !w-[min(470px,calc(100%-1.5rem))] !mx-0 !rounded-2xl max-2cols:!w-full max-2cols:!max-w-none max-2cols:!rounded-b-none max-2cols:!rounded-t-[18px] max-2cols:pb-[env(safe-area-inset-bottom)]"
      contentClassName="!p-[22px] !py-[22px] max-2cols:!px-4 max-2cols:!pt-5 max-2cols:!pb-[18px]"
      unstyledSurface
      withBlur
    >
      <div role="alertdialog" aria-modal="true" className="text-white">
        {dialog && content}
        <button
          type="button"
          onClick={closeDialog}
          className="mt-2.5 w-full h-11 rounded-xl text-[13.5px] font-extrabold text-white/70 hover:text-white hover:bg-white/[0.08]"
        >
          {dialog === 'leave' ? t('stayInDrawMode') : tCommon('cancel')}
        </button>
      </div>
    </Modal>
  );
};

export default DrawModeDialogs;
