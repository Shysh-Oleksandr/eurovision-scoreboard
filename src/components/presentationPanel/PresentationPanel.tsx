import { useTranslations } from 'next-intl';
import React, { useMemo, type JSX } from 'react';

import { useShallow } from 'zustand/shallow';

import Button from '../common/Button';
import { Checkbox } from '../common/Checkbox';
import { RangeSlider } from '../common/RangeSlider';
import Tabs from '../common/tabs/Tabs';
import SnowPileEffect from '../effects/SnowPileEffect';

import {
  MAX_SPEED_SECONDS,
  MIN_SPEED_SECONDS,
  usePresentationLoop,
} from './usePresentationLoop';

import { Columns2Icon } from '@/assets/icons/Columns2Icon';
import { PauseIcon } from '@/assets/icons/PauseIcon';
import { PlayIcon } from '@/assets/icons/PlayIcon';
import { Rows2Icon } from '@/assets/icons/Rows2Icon';
import { StageId } from '@/models';
import {
  PresentationPointsGrouping,
  ScoreboardMobileLayout,
  useGeneralStore,
} from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';
import { useQualifiedCountriesPanelGlowStyle } from '@/theme/useQualifiedCountriesPanelGlowStyle';
import useThemeSpecifics from '@/theme/useThemeSpecifics';

const layoutTabs = [
  {
    value: ScoreboardMobileLayout.ONE_COLUMN,
    label: <Rows2Icon className="w-6 h-6" />,
  },
  {
    value: ScoreboardMobileLayout.TWO_COLUMN,
    label: <Columns2Icon className="w-6 h-6" />,
  },
];

const PresentationPanel = (): JSX.Element | null => {
  const t = useTranslations();
  const { roundedCountryContainer } = useThemeSpecifics();
  const roundedPanelGlowStyle = useQualifiedCountriesPanelGlowStyle(
    roundedCountryContainer,
  );

  const tabs = useMemo(
    () => [
      {
        value: PresentationPointsGrouping.INDIVIDUAL,
        label: t('simulation.presentation.pointsGrouping.individual'),
      },
      {
        value: PresentationPointsGrouping.GROUPED,
        label: t('simulation.presentation.pointsGrouping.grouped'),
      },
    ],
    [t],
  );

  // The panel only renders from these stage facts; subscribing to them keeps
  // the memoized panel out of per-award commits.
  const { stageId, stageIsJuryVoting } = useScoreboardStore(
    useShallow((state) => {
      const stage = state.getCurrentStage();

      return {
        stageId: stage?.id,
        stageIsJuryVoting: stage?.isJuryVoting,
      };
    }),
  );

  const {
    presentationSettings,
    isPickQualifiersMode,
    enableJuryScaleReveal,
    setPresentationSettings,
  } = useGeneralStore(
    useShallow((s) => ({
      presentationSettings: s.presentationSettings,
      isPickQualifiersMode: s.settings.isPickQualifiersMode,
      enableJuryScaleReveal: s.settings.enableJuryScaleReveal,
      setPresentationSettings: s.setPresentationSettings,
    })),
  );

  const {
    isPresenting,
    pauseAfterAnimatedPoints,
    presentationSpeedSeconds,
    presentationJuryGrouping,
  } = presentationSettings;

  const activeTab =
    presentationJuryGrouping === 'grouped'
      ? PresentationPointsGrouping.GROUPED
      : PresentationPointsGrouping.INDIVIDUAL;

  const isNotQualifierModeStage =
    !isPickQualifiersMode ||
    stageId?.toUpperCase() === StageId.GF.toUpperCase();

  const withPointsGrouping = stageIsJuryVoting && isNotQualifierModeStage;

  usePresentationLoop();

  return (
    <div className="w-full">
      <div
        className={`min-h-[120px] relative bg-gradient-to-tr from-[30%] from-primary-950 to-primary-900 ${
          roundedCountryContainer
            ? 'qualified-countries-panel--rounded'
            : 'rounded-[10px]'
        } lg:pb-4 pb-3 lg:pt-3 md:pt-2 ${
          withPointsGrouping ? 'pt-2' : 'xs:pt-3 pt-2'
        } lg:px-4 px-3 gap-2 flex flex-col`}
        style={roundedPanelGlowStyle}
      >
        <SnowPileEffect snowEffect="middle" className="!w-full" />

        <div className="flex items-center justify-between gap-4">
          <h3 className="lg:text-[1.35rem] text-lg text-white">
            {t('simulation.presentation.title')}
          </h3>

          {isNotQualifierModeStage && (
            <Tabs
              tabs={layoutTabs}
              activeTab={
                presentationSettings.scoreboardMobileLayout ||
                ScoreboardMobileLayout.ONE_COLUMN
              }
              setActiveTab={(tab) => {
                setPresentationSettings({
                  scoreboardMobileLayout: tab as ScoreboardMobileLayout,
                });
              }}
              containerClassName="!px-0 !py-0 !overflow-hidden !h-8 !w-40 xs:hidden"
              overlayClassName="!top-0 !h-8"
            />
          )}
        </div>
        <Button
          label={
            isPresenting
              ? t('simulation.presentation.pause')
              : t('common.start')
          }
          className="w-full justify-center"
          variant={isPresenting ? 'secondary' : 'primary'}
          Icon={
            isPresenting ? (
              <PauseIcon className="w-5 h-5" />
            ) : (
              <PlayIcon className="w-5 h-5" />
            )
          }
          onClick={() => {
            setPresentationSettings({ isPresenting: !isPresenting });
          }}
        />
        {withPointsGrouping && (
          <div className="flex flex-col gap-1">
            {/* Grouping is meaningless during the scale countdown — the whole
                board is revealed one points value at a time — but the pause
                after animated points still applies to the douze phase. */}
            {!enableJuryScaleReveal && (
              <>
                <h4 className="text-base font-medium text-white">
                  {t('simulation.presentation.pointsGrouping.title')}
                </h4>
                <Tabs
                  tabs={tabs}
                  activeTab={activeTab}
                  setActiveTab={(tab) => {
                    const grouping =
                      (tab as PresentationPointsGrouping) ===
                      PresentationPointsGrouping.GROUPED
                        ? PresentationPointsGrouping.GROUPED
                        : PresentationPointsGrouping.INDIVIDUAL;

                    setPresentationSettings({
                      presentationJuryGrouping: grouping,
                    });
                  }}
                  containerClassName="!p-[3px] !overflow-hidden"
                  overlayClassName="!inset-y-[2px]"
                />
              </>
            )}
            <Checkbox
              id="pause-after-animated-points"
              labelClassName="w-full !px-0 !pt-1 text-white"
              label={t('simulation.presentation.pauseAfterAnimatedPoints')}
              checked={pauseAfterAnimatedPoints}
              onChange={(e) =>
                setPresentationSettings({
                  pauseAfterAnimatedPoints: e.target.checked,
                })
              }
            />
          </div>
        )}

        <RangeSlider
          id="presentationSpeedSeconds"
          min={MIN_SPEED_SECONDS}
          max={MAX_SPEED_SECONDS}
          step={0.5}
          value={presentationSpeedSeconds}
          onChange={(value) =>
            setPresentationSettings({
              presentationSpeedSeconds: value,
            })
          }
          minLabel={t('simulation.presentation.slow')}
          maxLabel={t('simulation.presentation.fast')}
          displayValue={false}
        />
      </div>
    </div>
  );
};

export default React.memo(PresentationPanel);
