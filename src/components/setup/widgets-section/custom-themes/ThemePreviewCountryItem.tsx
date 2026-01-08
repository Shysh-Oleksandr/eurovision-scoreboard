import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import ThemePreviewCountryItemCompact from './ThemePreviewCountryItemCompact';

import { RestartIcon } from '@/assets/icons/RestartIcon';
import { SparklesIcon } from '@/assets/icons/SparklesIcon';
import Button from '@/components/common/Button';

type ThemePreviewCountryItemProps = {
  backgroundImage: string | null;
  overrides?: Record<string, string>;
  baseThemeYear: string;
};

const ThemePreviewCountryItem: React.FC<ThemePreviewCountryItemProps> = ({
  backgroundImage,
  overrides = {},
  baseThemeYear,
}) => {
  const t = useTranslations('widgets.themes');

  const [points, setPoints] = useState(42);
  const [lastPoints, setLastPoints] = useState<number | null>(12);
  const [showDouzePointsAnimation, setShowDouzePointsAnimation] =
    useState(false);

  const handleAwardPoints = (value: number) => {
    setLastPoints(value);
    setPoints((prev) => prev + value);

    // Trigger douze points animation for 12 points
    if (value === 12) {
      setShowDouzePointsAnimation(true);
      // Reset animation state after animation completes
      setTimeout(() => {
        setShowDouzePointsAnimation(false);
      }, 3000); // Animation duration
    }
  };

  const handleReset = () => {
    setPoints(0);
    setLastPoints(null);
    setShowDouzePointsAnimation(false);
  };

  return (
    <div className="sm:space-y-4">
      <ThemePreviewCountryItemCompact
        backgroundImage={backgroundImage}
        overrides={overrides}
        baseThemeYear={baseThemeYear}
        points={points}
        lastPoints={lastPoints}
        showDouzePointsAnimation={showDouzePointsAnimation}
        onClick={() => handleAwardPoints(12)}
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

export default ThemePreviewCountryItem;
