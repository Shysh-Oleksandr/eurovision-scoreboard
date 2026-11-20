import { useTranslations } from 'next-intl';
import React, { useEffect, useRef, useState } from 'react';

import ThemePreviewCountryItemCompact from './ThemePreviewCountryItemCompact';

import { RestartIcon } from '@/assets/icons/RestartIcon';
import { SparklesIcon } from '@/assets/icons/SparklesIcon';
import Button from '@/components/common/Button';
import { type DouzeOptions, douzeDurationScale } from '@/douze/options';
import {
  DouzePointsAnimationMode,
  FlagShape,
  PointsContainerShape,
} from '@/theme/types';

type ThemePreviewCountryItemProps = {
  backgroundImage: string | null;
  backgroundVideo?: string | null;
  onBackgroundVideoError?: () => void;
  overrides?: Record<string, string>;
  baseThemeYear: string;
  uppercaseEntryName?: boolean;
  juryActivePointsUnderline?: boolean;
  pointsContainerShape?: PointsContainerShape;
  flagShape?: FlagShape;
  isJuryPointsPanelRounded?: boolean;
  usePointsCountUpAnimation?: boolean;
  roundedCountryContainer?: boolean;
  douzePointsAnimationMode?: DouzePointsAnimationMode;
  douzeOptions?: DouzeOptions | null;
  /** Gives the row a 12 whenever it changes (not on mount): the animation's options were changed. */
  replayDouzeKey?: number;
};

const ThemePreviewCountryItem: React.FC<ThemePreviewCountryItemProps> = ({
  backgroundImage,
  backgroundVideo,
  onBackgroundVideoError,
  overrides = {},
  baseThemeYear,
  uppercaseEntryName = true,
  juryActivePointsUnderline = true,
  pointsContainerShape = 'triangle',
  flagShape = 'big-rectangle',
  isJuryPointsPanelRounded = false,
  usePointsCountUpAnimation = true,
  roundedCountryContainer = false,
  douzePointsAnimationMode = 'heartsGrid',
  douzeOptions,
  replayDouzeKey,
}) => {
  const t = useTranslations('widgets.themes');

  const [points, setPoints] = useState(42);
  const [lastPoints, setLastPoints] = useState<number | null>(12);
  const [showDouzePointsAnimation, setShowDouzePointsAnimation] =
    useState(false);
  const douzeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const handleAwardPoints = (value: number) => {
    setLastPoints(value);
    setPoints((prev) => prev + value);

    // Trigger douze points animation for 12 points
    if (value === 12) {
      setShowDouzePointsAnimation(true);
      // Reset animation state after animation completes (a newer 12 keeps
      // it up for its own run).
      clearTimeout(douzeTimerRef.current);
      douzeTimerRef.current = setTimeout(
        () => {
          setShowDouzePointsAnimation(false);
        },
        3000 * douzeDurationScale(douzeOptions), // Animation duration
      );
    }
  };

  useEffect(() => () => clearTimeout(douzeTimerRef.current), []);

  // Every change to the animation's options plays it again, so the change
  // is seen in motion: once the changes settle (a colour being dragged, a
  // few quick taps), not on each one.
  const replayedKeyRef = useRef(replayDouzeKey);
  const awardRef = useRef(handleAwardPoints);

  awardRef.current = handleAwardPoints;
  useEffect(() => {
    if (replayDouzeKey === replayedKeyRef.current) return undefined;

    const timer = setTimeout(() => {
      replayedKeyRef.current = replayDouzeKey;
      awardRef.current(12);
    }, 350);

    return () => clearTimeout(timer);
  }, [replayDouzeKey]);

  const handleReset = () => {
    setPoints(0);
    setLastPoints(null);
    setShowDouzePointsAnimation(false);
  };

  return (
    <div className="sm:space-y-4">
      <ThemePreviewCountryItemCompact
        backgroundImage={backgroundImage}
        backgroundVideo={backgroundVideo}
        onBackgroundVideoError={onBackgroundVideoError}
        overrides={overrides}
        baseThemeYear={baseThemeYear}
        points={points}
        lastPoints={lastPoints}
        showDouzePointsAnimation={showDouzePointsAnimation}
        onClick={() => handleAwardPoints(12)}
        uppercaseEntryName={uppercaseEntryName}
        juryActivePointsUnderline={juryActivePointsUnderline}
        pointsContainerShape={pointsContainerShape}
        flagShape={flagShape}
        isJuryPointsPanelRounded={isJuryPointsPanelRounded}
        usePointsCountUpAnimation={usePointsCountUpAnimation}
        roundedCountryContainer={roundedCountryContainer}
        douzePointsAnimationMode={douzePointsAnimationMode}
        douzeOptions={douzeOptions}
      />

      {/* Actions */}
      <div className="sm:space-y-2 mt-2">
        <p className="text-white text-xs">{t('awardPoints')}:</p>
        <div className="flex flex-wrap gap-1">
          <Button
            variant="tertiary"
            onClick={() => handleAwardPoints(1)}
            className="!py-1.5"
          >
            1 {t('points', { count: 1 })}
          </Button>
          <Button
            variant="tertiary"
            onClick={() => handleAwardPoints(12)}
            className="!py-1.5"
            Icon={<SparklesIcon className="w-4 h-4" />}
          >
            12 {t('points', { count: 12 })}
          </Button>
          <Button
            variant="tertiary"
            onClick={handleReset}
            className="!py-1.5"
            Icon={<RestartIcon className="w-4.5 h-4.5" />}
          ></Button>
        </div>
      </div>
      <p className="text-white/60 text-xs sm:block hidden">
        {t('previewDescription')}
      </p>
    </div>
  );
};

// Memoized so it re-renders with the (debounced) overrides rather than on every
// pointer-move while a swatch is dragged — all props are primitives or the
// stable debounced overrides object, so shallow comparison is effective.
export default React.memo(ThemePreviewCountryItem);
