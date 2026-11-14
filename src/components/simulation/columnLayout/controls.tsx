'use client';
import { ChevronDown, Cog, Dices, Pause, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useId, useRef, useState } from 'react';

import { useShallow } from 'zustand/shallow';

import Popover from './Popover';
import {
  RandomAction,
  useQuickRandomAction,
  useRandomActions,
} from './useRandomActions';
import { VoterInfo } from './useVoterInfo';

import Button from '@/components/common/Button';
import {
  MAX_SPEED_SECONDS,
  MIN_SPEED_SECONDS,
} from '@/components/presentationPanel/usePresentationLoop';
import { StageId } from '@/models';
import { playHaptic } from '@/native/haptics';
import {
  PresentationPointsGrouping,
  useGeneralStore,
} from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

// ---------------------------------------------------------------------------
// Segmented control

interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  ariaLabel: string;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="dp-sim-seg flex gap-0.5 rounded-[11px] p-[3px]"
    >
      {options.map((option) => {
        const isOn = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isOn}
            onClick={() => {
              if (!isOn) playHaptic({ id: 'selection' });
              onChange(option.value);
            }}
            className={`${
              isOn ? 'is-on' : 'text-white/70 hover:text-white'
            } h-11 min-h-[44px] min-w-0 flex-1 truncate rounded-lg px-2 text-[13px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress through the round

/**
 * The round's progress (`useRoundProgress`) as a 2px line along a floating
 * panel's top edge (the stripe, the sheet). It runs between the rounded
 * corners (`inset`: their radius), so even the first step shows. Nothing
 * while its setting is off.
 */
export const EdgeProgress = ({
  progress,
  inset,
}: {
  progress?: number;
  inset: number;
}) =>
  progress === undefined ? null : (
    <div
      aria-hidden="true"
      className="dp-sim-edge-progress pointer-events-none absolute top-0 h-[2px] rounded-full"
      style={{ left: inset, right: inset }}
    >
      <i
        className="rounded-full"
        style={{ width: `${Math.round(progress * 1000) / 10}%` }}
      />
    </div>
  );

// ---------------------------------------------------------------------------
// Presentation options

export const SpeedSlider = ({ className = '' }: { className?: string }) => {
  const t = useTranslations('simulation.presentation');
  const id = useId();
  const speed = useGeneralStore(
    (state) => state.presentationSettings.presentationSpeedSeconds,
  );
  const setPresentationSettings = useGeneralStore(
    (state) => state.setPresentationSettings,
  );

  return (
    <div className={className}>
      <div className="flex justify-between text-[12.5px] font-bold text-white/70">
        <label htmlFor={id}>{t('slow')}</label>
        <span aria-hidden="true">{t('fast')}</span>
      </div>
      <input
        id={id}
        type="range"
        min={MIN_SPEED_SECONDS}
        max={MAX_SPEED_SECONDS}
        step={0.5}
        value={speed}
        aria-valuetext={`${speed}`}
        onChange={(e) =>
          setPresentationSettings({
            presentationSpeedSeconds: Number(e.target.value),
          })
        }
        className="dp-sim-range mt-1.5 block h-5 w-full cursor-pointer"
      />
    </div>
  );
};

/** Grouping and the pause after douze points: only meaningful in jury rounds. */
const usePresentationGroupingFlags = () => {
  const { stageId, isJuryVoting } = useScoreboardStore(
    useShallow((state) => {
      const stage = state.getCurrentStage();

      return { stageId: stage?.id, isJuryVoting: !!stage?.isJuryVoting };
    }),
  );
  const { isPickQualifiersMode, enableJuryScaleReveal } = useGeneralStore(
    useShallow((state) => ({
      isPickQualifiersMode: state.settings.isPickQualifiersMode,
      enableJuryScaleReveal: state.settings.enableJuryScaleReveal,
    })),
  );
  const isNotQualifierStage =
    !isPickQualifiersMode ||
    stageId?.toUpperCase() === StageId.GF.toUpperCase();
  const withJuryOptions = isJuryVoting && isNotQualifierStage;

  return {
    withJuryOptions,
    // The scale countdown reveals one value across the whole board at a
    // time, so grouping means nothing there; the douze pause still applies.
    withGrouping: withJuryOptions && !enableJuryScaleReveal,
  };
};

export const PresentationOptions = ({
  withSpeed = true,
}: {
  withSpeed?: boolean;
}) => {
  const t = useTranslations('simulation');
  const checkboxId = useId();
  const { withJuryOptions, withGrouping } = usePresentationGroupingFlags();
  const { grouping, pauseAfterAnimatedPoints } = useGeneralStore(
    useShallow((state) => ({
      grouping: state.presentationSettings.presentationJuryGrouping,
      pauseAfterAnimatedPoints:
        state.presentationSettings.pauseAfterAnimatedPoints,
    })),
  );
  const setPresentationSettings = useGeneralStore(
    (state) => state.setPresentationSettings,
  );

  return (
    <div className="flex flex-col gap-3">
      {withGrouping && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-bold text-white/75">
            {t('view.juryPoints')}
          </span>
          <Segmented
            ariaLabel={t('view.juryPoints')}
            value={
              grouping === PresentationPointsGrouping.GROUPED
                ? PresentationPointsGrouping.GROUPED
                : PresentationPointsGrouping.INDIVIDUAL
            }
            options={[
              {
                value: PresentationPointsGrouping.INDIVIDUAL,
                label: t('presentation.pointsGrouping.individual'),
              },
              {
                value: PresentationPointsGrouping.GROUPED,
                label: t('presentation.pointsGrouping.grouped'),
              },
            ]}
            onChange={(value) =>
              setPresentationSettings({ presentationJuryGrouping: value })
            }
          />
        </div>
      )}
      {withJuryOptions && (
        <label
          htmlFor={checkboxId}
          className="flex cursor-pointer items-center gap-2.5 text-[13.5px] font-semibold text-white"
        >
          <input
            id={checkboxId}
            type="checkbox"
            className="dp-sim-check size-[18px] shrink-0 cursor-pointer"
            checked={pauseAfterAnimatedPoints}
            onChange={(e) =>
              setPresentationSettings({
                pauseAfterAnimatedPoints: e.target.checked,
              })
            }
          />
          {t('presentation.pauseAfterAnimatedPoints')}
        </label>
      )}
      {withSpeed && <SpeedSlider />}
    </div>
  );
};

/**
 * Present (the accent CTA) + the options gear next to it. While presenting,
 * the same spot holds Pause, and the gear only the jury options (the speed
 * is out in the open then).
 */
export const PresentRow = ({
  size = 'lg',
  isPresenting = false,
  withJuryOptions = true,
}: {
  size?: 'md' | 'lg';
  isPresenting?: boolean;
  /** Presenting: the gear has nothing to offer in a televote round. */
  withJuryOptions?: boolean;
}) => {
  const t = useTranslations('simulation');
  const setPresentationSettings = useGeneralStore(
    (state) => state.setPresentationSettings,
  );
  const gearRef = useRef<HTMLDivElement>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const showGear = !isPresenting || withJuryOptions;

  return (
    <div className="flex gap-2">
      <Button
        variant="cta"
        size={size}
        className="flex-1 justify-center"
        Icon={
          isPresenting ? (
            <Pause className="size-[18px]" fill="currentColor" />
          ) : (
            <Play className="size-[18px]" fill="currentColor" />
          )
        }
        onClick={() => setPresentationSettings({ isPresenting: !isPresenting })}
      >
        {isPresenting ? t('presentation.pause') : t('view.present')}
      </Button>
      {showGear && (
        <div ref={gearRef} className="contents">
          <Button
            variant="surface"
            size={size}
            title={t('view.presentationOptions')}
            aria-label={t('view.presentationOptions')}
            aria-pressed={optionsOpen}
            className={optionsOpen ? 'is-on' : ''}
            Icon={<Cog className="size-[18px]" />}
            onClick={() => setOptionsOpen((open) => !open)}
          />
        </div>
      )}
      <Popover
        open={optionsOpen && showGear}
        anchor={(gearRef.current?.firstElementChild as HTMLElement) ?? null}
        onClose={() => setOptionsOpen(false)}
        ariaLabel={t('view.presentationOptions')}
        className="w-[300px]"
      >
        <div className="mb-3 text-[14px] font-extrabold">
          {t('view.presentation')}
        </div>
        <PresentationOptions withSpeed={!isPresenting} />
      </Popover>
    </div>
  );
};

// ---------------------------------------------------------------------------
// At random

const RandomButtonLabel = ({ action }: { action: RandomAction }) => (
  <span className="flex min-w-0 flex-col items-center gap-[3px] leading-none">
    <span className="max-w-full truncate">{action.label}</span>
    {action.detail && (
      <span className="max-w-full truncate text-[12.5px] font-semibold text-white/75">
        {action.detail}
      </span>
    )}
  </span>
);

/** "At random" with one button per scope: next value / this voter / everyone. */
export const AtRandomGroup = ({
  voter,
  onRun,
}: {
  voter: VoterInfo;
  /** After any of them (the phone sheet closes to show the board). */
  onRun?: () => void;
}) => {
  const t = useTranslations('simulation.view');
  const actions = useRandomActions(voter);
  const groupId = useId();

  return (
    <div
      role="group"
      aria-labelledby={groupId}
      className="flex flex-col gap-1.5"
    >
      <span id={groupId} className="text-[12.5px] font-bold text-white/75">
        {t('atRandom')}
      </span>
      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))`,
        }}
      >
        {actions.map((action) => (
          <Button
            key={action.id}
            variant="surface"
            size="lg"
            className="min-w-0 justify-center !px-2"
            onClick={() => {
              action.run();
              onRun?.();
            }}
            aria-label={
              action.detail ? `${action.label}, ${action.detail}` : undefined
            }
          >
            <RandomButtonLabel action={action} />
          </Button>
        ))}
      </div>
    </div>
  );
};

/**
 * The stripe's random control, split in two: the left part gives the quick
 * scope at once (the next value, or the whole vote once that was picked; the
 * televote: this country), the chevron opens every scope and runs the one
 * picked. Picking a jury scope makes it the quick one.
 */
export const RandomSplitButton = ({ voter }: { voter: VoterInfo }) => {
  const t = useTranslations('simulation');
  const { actions, quick, isWholeVote } = useQuickRandomAction(voter);
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const half =
    'flex h-full items-center focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent hover:bg-white/[0.07]';

  return (
    <>
      <div
        ref={ref}
        className={`dp-act flex h-[40px] shrink-0 items-stretch overflow-hidden rounded-xl text-white ${
          open ? 'is-on' : ''
        }`}
      >
        <button
          type="button"
          onClick={quick.run}
          aria-label={`${t('view.atRandom')}: ${
            quick.detail ? `${quick.label}, ${quick.detail}` : quick.label
          }`}
          className={`${half} gap-2 pl-3 pr-2.5 text-[13px] font-extrabold`}
        >
          <Dices className="size-[18px] shrink-0" />
          <span className="flex flex-col items-start gap-[3px] leading-none">
            {t('random')}
            {isWholeVote && (
              <span className="text-[11px] font-semibold text-white/70">
                {t('view.wholeVote')}
              </span>
            )}
          </span>
        </button>
        <span className="my-2 w-px shrink-0 bg-white/15" aria-hidden="true" />
        <button
          type="button"
          aria-label={t('view.atRandom')}
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => setOpen((value) => !value)}
          className={`${half} w-9 justify-center`}
        >
          <ChevronDown
            className={`size-4 opacity-80 transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>
      <Popover
        open={open}
        anchor={ref.current}
        onClose={() => setOpen(false)}
        ariaLabel={t('view.atRandom')}
        align="center"
        className="w-[240px] !p-1.5"
      >
        <div className="px-2.5 pb-1 pt-2 text-[12.5px] font-bold text-white/70">
          {t('view.atRandom')}
        </div>
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => {
              setOpen(false);
              action.run();
            }}
            className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[14px] font-bold hover:bg-white/[0.08] focus-visible:bg-white/[0.08] focus-visible:outline-none"
          >
            <span className="min-w-0 truncate">{action.label}</span>
            {action.detail && (
              <span className="shrink-0 text-[12.5px] font-semibold text-white/60">
                {action.detail}
              </span>
            )}
          </button>
        ))}
      </Popover>
    </>
  );
};
