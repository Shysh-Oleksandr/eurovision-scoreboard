import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import ThemePreviewCountryItemUI from './ThemePreviewCountryItemUI';

import Badge from '@/components/common/Badge';
import VotingPointsInfo from '@/components/controlsPanel/VotingPointsInfo';
import { getThemeBackground } from '@/theme/themes';
import { FlagShape, ItemState, PointsContainerShape } from '@/theme/types';

const previewBadges = [
  {
    label: 'Jury',
    key: 'jury',
  },
  {
    label: 'Televote',
    key: 'televoteUnfinished',
  },
  {
    label: 'Active',
    key: 'televoteActive',
  },
  {
    label: 'Finished',
    key: 'televoteFinished',
  },
  {
    label: 'Unqualified',
    key: 'unqualified',
  },
];

type ThemePreviewCountryItemCompactProps = {
  backgroundImage: string | null;
  overrides?: Record<string, string>;
  baseThemeYear: string;
  points: number;
  lastPoints: number | null;
  showDouzePointsAnimation: boolean;
  isListItem?: boolean;
  previewCountryCode?: string;
  onClick?: () => void;
  uppercaseEntryName?: boolean;
  pointsContainerShape?: PointsContainerShape;
  flagShape?: FlagShape;
};

const ThemePreviewCountryItemCompact: React.FC<
  ThemePreviewCountryItemCompactProps
> = ({
  backgroundImage,
  overrides = {},
  baseThemeYear,
  points,
  lastPoints,
  showDouzePointsAnimation,
  isListItem = false,
  previewCountryCode,
  onClick,
  uppercaseEntryName = true,
  pointsContainerShape = 'triangle',
  flagShape = 'big-rectangle',
}) => {
  const t = useTranslations('widgets.themes.previewCountryItemStates');

  const [state, setState] = useState<ItemState>('jury');

  // Fallback background: base theme background image for the selected year
  const baseBackgroundImage = getThemeBackground(baseThemeYear);

  return (
    <>
      {/* State selector */}
      <div className="flex w-full sm:flex-wrap sm:gap-2 gap-1.5 overflow-x-auto sm:overflow-x-hidden sm:pb-0 pb-2 narrow-scrollbar">
        {previewBadges.map((badge) => (
          <Badge
            key={badge.label}
            label={t(badge.key)}
            onClick={() => setState(badge.key as ItemState)}
            isActive={state === (badge.key as ItemState)}
          />
        ))}
      </div>

      <div
        className={`sm:space-y-4 space-y-2 px-4 sm:py-8 py-6 max-w-[400px] w-full ${
          isListItem ? 'sm:min-w-[300px] md:min-w-[400px]' : ''
        } ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
        style={{
          backgroundImage: `url(${backgroundImage || baseBackgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <ThemePreviewCountryItemUI
          state={state}
          overrides={overrides}
          points={points}
          lastPoints={lastPoints}
          showDouzePointsAnimation={showDouzePointsAnimation}
          previewCountryCode={previewCountryCode}
          uppercaseEntryName={uppercaseEntryName}
          pointsContainerShape={pointsContainerShape}
          flagShape={flagShape}
        />

        <VotingPointsInfo
          customVotingPointsIndex={isListItem ? 9 : 0}
          overrides={overrides}
        />
      </div>
    </>
  );
};

export default ThemePreviewCountryItemCompact;
