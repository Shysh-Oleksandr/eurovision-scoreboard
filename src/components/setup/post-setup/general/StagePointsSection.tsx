'use client';
import { ChevronDown, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useId } from 'react';

import PointsStrip from './PointsStrip';
import StageToggle from './StageToggle';

import { PointsSystemController } from '@/components/settings/pointsSystem/useGlobalPointsSystemController';
import { PREDEFINED_SYSTEMS_MAP } from '@/data/data';
import { PointsItem } from '@/models';

const PRESETS = ['default', 'reversed', 'old', 'melodifestivalen'] as const;

type Preset = (typeof PRESETS)[number] | 'custom';

const PRESET_LABEL_KEYS: Record<Preset, string> = {
  default: 'presetDefault',
  reversed: 'presetReversed',
  old: 'presetOld',
  melodifestivalen: 'presetMelodifestivalen',
  custom: 'presetCustom',
};

const resolvePreset = (points: PointsItem[]): Preset =>
  PRESETS.find((preset) => {
    const system = PREDEFINED_SYSTEMS_MAP[preset];

    return (
      system.length === points.length &&
      system.every(
        (p, i) =>
          p.value === points[i]?.value &&
          p.showDouzePoints === points[i]?.showDouzePoints,
      )
    );
  }) ?? 'custom';

interface PresetSelectProps {
  caption: string;
  points: PointsItem[];
  onPick: (preset: Exclude<Preset, 'custom'>) => void;
}

/** A preset as a well with its caption inside, over a native select. */
const PresetSelect: React.FC<PresetSelectProps> = ({
  caption,
  points,
  onPick,
}) => {
  const t = useTranslations('setup.stageSetup');
  const id = useId();
  const current = resolvePreset(points);

  return (
    <label
      htmlFor={id}
      className="dp-field relative flex min-h-[48px] min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl px-3 py-1.5"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="truncate text-[12px] font-semibold leading-none text-white/75">
          {caption}
        </span>
        <span className="truncate text-[16px] font-bold leading-[1.3] md:text-[14.5px]">
          {t(PRESET_LABEL_KEYS[current])}
        </span>
      </span>
      <ChevronDown
        className="size-[18px] flex-none text-white/75"
        aria-hidden="true"
      />
      <select
        id={id}
        value={current}
        onChange={(e) => {
          const value = e.target.value as Preset;

          if (value !== 'custom') onPick(value);
        }}
        aria-label={caption}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {PRESETS.map((preset) => (
          <option key={preset} value={preset}>
            {t(PRESET_LABEL_KEYS[preset])}
          </option>
        ))}
        {current === 'custom' && (
          <option value="custom" disabled>
            {t('presetCustom')}
          </option>
        )}
      </select>
    </label>
  );
};

interface StagePointsSectionProps {
  controller: PointsSystemController;
  /** The points differ from Settings'. */
  overridden: boolean;
  onUseSettings: () => void;
}

/**
 * The stage's points: whether they're its own or Settings' (with a way
 * back), the preset, separate jury and televote points, the values as a
 * strip, and the pre-1975 "several points to one entry" rule.
 */
const StagePointsSection: React.FC<StagePointsSectionProps> = ({
  controller,
  overridden,
  onUseSettings,
}) => {
  const t = useTranslations('setup.stageSetup');
  const ids = useId();
  const sameEntryHintId = `${ids}-same-entry`;
  const {
    pointsSystem,
    televotePointsSystem,
    splitPointsSystem,
    allowMultiplePointsToSameEntry,
    setPointsSystem,
    setTelevotePointsSystem,
    setSplitPointsSystem,
    setAllowMultiplePointsToSameEntry,
  } = controller;

  // The jury's (or the only) preset also sets the pre-1975 rule.
  const pickMain = (preset: Exclude<Preset, 'custom'>) => {
    setAllowMultiplePointsToSameEntry(preset === 'old');
    setPointsSystem(PREDEFINED_SYSTEMS_MAP[preset]);
  };

  return (
    <section aria-labelledby={`${ids}-title`}>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h3
          id={`${ids}-title`}
          className="text-[17.5px] font-extrabold tracking-[-0.02em]"
        >
          {t('points')}
        </h3>
        <p className="text-[13px] font-bold text-white/55">
          {overridden ? (
            <>
              {t('pointsOwn')}{' '}
              <button
                type="button"
                onClick={onUseSettings}
                className="dp-lib-link rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                {t('useSettingsPoints')}
              </button>
            </>
          ) : (
            t('pointsSame')
          )}
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-2 2cols:flex-row">
        {!splitPointsSystem && (
          <PresetSelect
            caption={t('pointsSystem')}
            points={pointsSystem}
            onPick={pickMain}
          />
        )}
        <StageToggle
          label={t('separatePoints')}
          pressed={splitPointsSystem}
          onChange={setSplitPointsSystem}
          className={splitPointsSystem ? '' : '2cols:w-auto 2cols:flex-none'}
        />
      </div>

      {splitPointsSystem ? (
        <>
          <div className="mt-4">
            <PresetSelect
              caption={t('juryPoints')}
              points={pointsSystem}
              onPick={pickMain}
            />
            <PointsStrip
              label={t('juryPoints')}
              points={pointsSystem}
              onChange={setPointsSystem}
            />
          </div>
          <div className="mt-4">
            <PresetSelect
              caption={t('televotePoints')}
              points={televotePointsSystem}
              onPick={(preset) =>
                setTelevotePointsSystem(PREDEFINED_SYSTEMS_MAP[preset])
              }
            />
            <PointsStrip
              label={t('televotePoints')}
              points={televotePointsSystem}
              onChange={setTelevotePointsSystem}
            />
          </div>
        </>
      ) : (
        <PointsStrip
          label={t('points')}
          points={pointsSystem}
          onChange={setPointsSystem}
        />
      )}

      <p className="dp-ss-hint">
        {t.rich('pointsLegend', {
          star: () => (
            <Star
              className="dp-ss-legend-star mb-[2px] inline size-3"
              aria-label={t('starLabel')}
            />
          ),
        })}
      </p>

      <div className="mt-4">
        <StageToggle
          label={t('sameEntry')}
          pressed={allowMultiplePointsToSameEntry}
          onChange={setAllowMultiplePointsToSameEntry}
          describedBy={sameEntryHintId}
        />
        <p id={sameEntryHintId} className="dp-ss-hint">
          {t('sameEntryHint')}
        </p>
      </div>
    </section>
  );
};

export default StagePointsSection;
