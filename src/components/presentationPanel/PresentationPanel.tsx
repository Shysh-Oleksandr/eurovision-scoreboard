import React, { useEffect, useRef, type JSX } from 'react';

import { useShallow } from 'zustand/shallow';

import Button from '../common/Button';
import { Checkbox } from '../common/Checkbox';
import { RangeSlider } from '../common/RangeSlider';
import Tabs from '../common/tabs/Tabs';

import { PauseIcon } from '@/assets/icons/PauseIcon';
import { PlayIcon } from '@/assets/icons/PlayIcon';
import { StageId } from '@/models';
import {
  PresentationPointsGrouping,
  useGeneralStore,
} from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

const MIN_SPEED_SECONDS = 0.5;
const MAX_SPEED_SECONDS = 7.5;

const tabs = [
  { value: PresentationPointsGrouping.INDIVIDUAL, label: 'Individual' },
  { value: PresentationPointsGrouping.GROUPED, label: 'Grouped' },
];

const PresentationPanel = (): JSX.Element | null => {
  const {
    getCurrentStage,
    givePredefinedJuryPoint,
    givePredefinedJuryPointsGrouped,
    givePredefinedTelevotePoints,
    pickQualifierRandomly,
  } = useScoreboardStore(
    useShallow((state) => ({
      getCurrentStage: state.getCurrentStage,
      givePredefinedJuryPoint: state.givePredefinedJuryPoint,
      givePredefinedJuryPointsGrouped: state.givePredefinedJuryPointsGrouped,
      givePredefinedTelevotePoints: state.givePredefinedTelevotePoints,
      pickQualifierRandomly: state.pickQualifierRandomly,
    })),
  );

  const {
    presentationSettings,
    isPickQualifiersMode,
    setPresentationSettings,
  } = useGeneralStore(
    useShallow((s) => ({
      presentationSettings: s.presentationSettings,
      isPickQualifiersMode: s.settings.isPickQualifiersMode,
      setPresentationSettings: s.setPresentationSettings,
    })),
  );

  const currentStage = getCurrentStage();

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

  const withPointsGrouping =
    currentStage.isJuryVoting &&
    (!isPickQualifiersMode || currentStage.id === StageId.GF);

  // Timer handling
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isPresenting) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      return;
    }

    if (!currentStage || currentStage.isOver) {
      return;
    }

    // Single-step executor that reschedules itself after completion
    const runOnce = () => {
      const latestStage = getCurrentStage();
      const generalStore = useGeneralStore.getState();

      const {
        presentationJuryGrouping,
        presentationSpeedSeconds,
        pauseAfterAnimatedPoints,
      } = generalStore.presentationSettings;

      if (!latestStage || latestStage.isOver) return;

      if (
        generalStore.settings.isPickQualifiersMode &&
        latestStage.id !== StageId.GF
      ) {
        pickQualifierRandomly();
      } else if (latestStage.isJuryVoting) {
        if (presentationJuryGrouping === 'grouped') {
          givePredefinedJuryPointsGrouped();
        } else {
          givePredefinedJuryPoint();
        }
      } else {
        givePredefinedTelevotePoints();
      }

      // Schedule next cycle with the latest speed read at schedule time
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // If the just-awarded batch contains an animated point, add +2s delay
      const awardedAnimated = useScoreboardStore
        .getState()
        .getCurrentStage()
        .countries.some((c) => c.showDouzePointsAnimation);

      const baseSeconds = MAX_SPEED_SECONDS - presentationSpeedSeconds;
      const delayAfterAnimation = pauseAfterAnimatedPoints
        ? Math.max(4.5, baseSeconds)
        : baseSeconds;
      const nextDelaySeconds = awardedAnimated
        ? delayAfterAnimation
        : baseSeconds;

      const nextDelay = Math.max(MIN_SPEED_SECONDS, nextDelaySeconds) * 1000;

      timeoutRef.current = setTimeout(runOnce, nextDelay);
    };

    // Start the loop
    const initialDelay = 1000;

    timeoutRef.current = setTimeout(runOnce, initialDelay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresenting, currentStage?.id, currentStage?.isJuryVoting]);

  return (
    <div className="w-full">
      <div
        className={`min-h-[120px] bg-gradient-to-tr from-[30%] from-primary-950 to-primary-900 rounded-md lg:pb-4 pb-3 lg:pt-3 md:pt-2 ${
          withPointsGrouping ? 'pt-2' : 'xs:pt-3 pt-2'
        } lg:px-4 px-3 gap-2 flex flex-col`}
      >
        <h3 className="lg:text-[1.35rem] text-lg text-white">Presentation</h3>
        <Button
          label={isPresenting ? 'Pause' : 'Start'}
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
            <h4 className="text-base font-medium text-white">
              Points grouping
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

                setPresentationSettings({ presentationJuryGrouping: grouping });
              }}
              containerClassName="!px-0 !py-0 !overflow-hidden"
              overlayClassName="!top-0"
            />
            <Checkbox
              id="pause-after-animated-points"
              labelClassName="w-full !px-0 !pt-1 text-white"
              label="Pause after animated points"
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
          minLabel="Slow"
          maxLabel="Fast"
          displayValue={false}
        />
      </div>
    </div>
  );
};

export default PresentationPanel;
