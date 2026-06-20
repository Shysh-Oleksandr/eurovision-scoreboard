import { useTranslations } from 'next-intl';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import ThemePreviewCountryItemUI from './ThemePreviewCountryItemUI';

import Badge from '@/components/common/Badge';
import VotingPointsInfo from '@/components/controlsPanel/VotingPointsInfo';
import { getThemeBackground } from '@/theme/themes';
import {
  DouzePointsAnimationMode,
  FlagShape,
  ItemState,
  PointsContainerShape,
} from '@/theme/types';

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
  juryActivePointsUnderline?: boolean;
  pointsContainerShape?: PointsContainerShape;
  flagShape?: FlagShape;
  isJuryPointsPanelRounded?: boolean;
  usePointsCountUpAnimation?: boolean;
  roundedCountryContainer?: boolean;
  douzePointsAnimationMode?: DouzePointsAnimationMode;
  togglesBelow?: boolean;
  /** Label color for the active (accent-filled) state toggle. Defaults to white. */
  activeToggleTextColor?: string;
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
  juryActivePointsUnderline = true,
  pointsContainerShape = 'triangle',
  flagShape = 'big-rectangle',
  isJuryPointsPanelRounded = false,
  usePointsCountUpAnimation = true,
  roundedCountryContainer = false,
  douzePointsAnimationMode = 'heartsGrid',
  togglesBelow = false,
  activeToggleTextColor = '#ffffff',
}) => {
  const t = useTranslations('widgets.themes.previewCountryItemStates');

  const [state, setState] = useState<ItemState>('jury');

  // Fallback background: base theme background image for the selected year
  const baseBackgroundImage = getThemeBackground(baseThemeYear);

  const preview = (
    <div
      className={`sm:space-y-4 space-y-2 px-4 sm:py-8 py-6 w-full h-full flex flex-col justify-center rounded-[12px] ${
        isListItem && !togglesBelow
          ? 'sm:min-w-[300px] md:min-w-[400px] max-w-[400px]'
          : ''
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
        baseThemeYear={baseThemeYear}
        state={state}
        overrides={overrides}
        points={points}
        lastPoints={lastPoints}
        showDouzePointsAnimation={showDouzePointsAnimation}
        previewCountryCode={previewCountryCode}
        uppercaseEntryName={uppercaseEntryName}
        pointsContainerShape={pointsContainerShape}
        flagShape={flagShape}
        usePointsCountUpAnimation={usePointsCountUpAnimation}
        roundedCountryContainer={roundedCountryContainer}
        douzePointsAnimationMode={douzePointsAnimationMode}
      />

      <VotingPointsInfo
        customVotingPointsIndex={isListItem ? 9 : 0}
        overrides={overrides}
        themeYear={baseThemeYear}
        juryActivePointsUnderline={juryActivePointsUnderline}
        isRounded={isJuryPointsPanelRounded}
      />
    </div>
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const toggleRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [toggleDimensions, setToggleDimensions] = useState<
    { width: number; left: number }[]
  >([]);
  const [isOverlayReady, setIsOverlayReady] = useState(false);

  const measureToggles = useCallback(() => {
    const dimensions = toggleRefs.current.map((ref) => {
      if (!ref) return { width: 0, left: 0 };

      return { width: ref.offsetWidth, left: ref.offsetLeft };
    });

    setToggleDimensions(dimensions);
    setIsOverlayReady(true);
  }, []);

  useEffect(() => {
    if (!togglesBelow) return;

    measureToggles();

    let cancelled = false;

    if (document.fonts && typeof document.fonts.ready?.then === 'function') {
      document.fonts.ready.then(() => {
        if (!cancelled) {
          requestAnimationFrame(() => measureToggles());
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [togglesBelow, measureToggles]);

  useEffect(() => {
    if (!togglesBelow) return;

    const containerEl = containerRef.current;

    if (!containerEl || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => measureToggles());
    });

    observer.observe(containerEl);
    toggleRefs.current.forEach((ref) => ref && observer.observe(ref));

    return () => observer.disconnect();
  }, [togglesBelow, measureToggles]);

  const activeToggleStyle = useMemo(() => {
    const activeIndex = previewBadges.findIndex((badge) => badge.key === state);
    const { width = 0, left = 0 } = toggleDimensions[activeIndex] || {};

    return {
      width: width || 0,
      left: `${left}px`,
    };
  }, [state, toggleDimensions]);

  if (togglesBelow) {
    return (
      <>
        {preview}
        {/* Segmented state toggles below the preview */}
        <div
          ref={containerRef}
          className="relative mt-auto flex flex-nowrap bg-black/25 border border-solid border-white/10 rounded-[10px] p-1 gap-[3px]"
        >
          {isOverlayReady && (
            <div
              className="absolute top-1 bottom-1 rounded-[7px] shadow-md transition-all duration-[400ms] ease-in-out pointer-events-none"
              style={{
                ...activeToggleStyle,
                background: 'var(--t-acc, var(--accent, #ff3d84))',
              }}
            />
          )}
          {previewBadges.map((badge, index) => (
            <button
              key={badge.key}
              ref={(el) => {
                toggleRefs.current[index] = el;
              }}
              type="button"
              onClick={() => setState(badge.key as ItemState)}
              className={`relative z-10 flex-1 text-xs font-bold py-2.5 rounded-[7px] text-center leading-tight tracking-tight whitespace-nowrap transition-colors duration-300 ${
                state === badge.key ? '' : 'text-white/55 hover:text-white'
              }`}
              style={
                state === badge.key
                  ? { color: activeToggleTextColor }
                  : undefined
              }
            >
              {t(badge.key)}
            </button>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {/* State selector (above, pill-badge style) */}
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

      {preview}
    </>
  );
};

export default ThemePreviewCountryItemCompact;
