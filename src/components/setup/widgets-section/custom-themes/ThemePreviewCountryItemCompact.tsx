import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useRef, useState } from 'react';

import ThemePreviewCountryItemUI from './ThemePreviewCountryItemUI';

import AnchoredMenu from '@/components/common/AnchoredMenu';
import Badge from '@/components/common/Badge';
import VotingPointsInfo from '@/components/controlsPanel/VotingPointsInfo';
import type { DouzeOptions } from '@/douze/options';
import { playHaptic } from '@/native/haptics';
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
  /** The theme editor's preview only; lists show the still image. */
  backgroundVideo?: string | null;
  onBackgroundVideoError?: () => void;
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
  douzeOptions?: DouzeOptions | null;
  /**
   * Lists: the state is picked from a small menu in the preview's top
   * corner ("Jury ▾") instead of a row of five, which no translation can
   * outgrow and which costs the card no height.
   */
  stateMenu?: boolean;
};

const ThemePreviewCountryItemCompact: React.FC<
  ThemePreviewCountryItemCompactProps
> = ({
  backgroundImage,
  backgroundVideo = null,
  onBackgroundVideoError,
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
  douzeOptions,
  stateMenu = false,
}) => {
  const t = useTranslations('widgets.themes.previewCountryItemStates');
  const tThemes = useTranslations('widgets.themes');

  const [state, setState] = useState<ItemState>('jury');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnchorRef = useRef<HTMLButtonElement>(null);
  const stateIndex = Math.max(
    previewBadges.findIndex((badge) => badge.key === state),
    0,
  );
  const stateLabel = t(previewBadges[stateIndex].key);

  /** The arrows: the previous or next state, round the end. */
  const stepState = (by: number) => {
    const next =
      previewBadges[
        (stateIndex + by + previewBadges.length) % previewBadges.length
      ];

    playHaptic({ id: 'selection' });
    setState(next.key as ItemState);
  };

  // Fallback background: base theme background image for the selected year
  const baseBackgroundImage = getThemeBackground(baseThemeYear);

  const preview = (
    <div
      className={`sm:space-y-4 space-y-2 px-4 w-full h-full flex flex-col justify-center rounded-[12px] ${
        // The state menu sits in the top corner, clear of the row.
        stateMenu ? 'relative pt-[42px] pb-6 sm:pb-8' : 'sm:py-8 py-6'
      } ${
        isListItem && !stateMenu
          ? 'sm:min-w-[300px] md:min-w-[400px] max-w-[400px]'
          : ''
      } ${onClick ? 'cursor-pointer' : ''} ${
        backgroundVideo ? 'relative isolate' : ''
      }`}
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
        douzeOptions={douzeOptions}
      />

      <VotingPointsInfo
        customVotingPointsIndex={isListItem ? 9 : 0}
        overrides={overrides}
        themeYear={baseThemeYear}
        juryActivePointsUnderline={juryActivePointsUnderline}
        isRounded={isJuryPointsPanelRounded}
      />

      {/* After the row in the DOM, so `space-y` leaves the row alone. */}
      {stateMenu && (
        // The preview itself awards points on a tap: clicks stop here.
        <div
          role="group"
          aria-label={tThemes('previewState')}
          onClick={(e) => e.stopPropagation()}
          className="dp-preview-state absolute left-2 top-2 !m-0 z-20 flex h-7 max-w-[calc(100%-16px)] items-center rounded-full text-[12px] font-bold"
        >
          {/* The arrows first: they stay put while the name changes. */}
          <button
            type="button"
            onClick={() => stepState(-1)}
            aria-label={tThemes('previousState')}
            className="dp-preview-step grid h-7 w-[26px] place-items-center rounded-full pl-0.5"
          >
            <ChevronLeft className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => stepState(1)}
            aria-label={tThemes('nextState')}
            className="dp-preview-step -ml-1 grid h-7 w-[26px] place-items-center rounded-full"
          >
            <ChevronRight className="size-3.5" aria-hidden />
          </button>
          <button
            ref={menuAnchorRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`${tThemes('previewState')}: ${stateLabel}`}
            onClick={() => setMenuOpen((open) => !open)}
            className="dp-preview-label h-7 min-w-0 truncate rounded-full pl-1 pr-3"
          >
            {stateLabel}
          </button>
        </div>
      )}

      {backgroundVideo && (
        // Last child so `space-y` spacing above is unchanged; z -1 inside
        // the isolated box puts it over the image and under the content.
        <video
          key={backgroundVideo}
          src={backgroundVideo}
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          disableRemotePlayback
          aria-hidden
          tabIndex={-1}
          onError={onBackgroundVideoError}
          className="pointer-events-none absolute inset-0 -z-10 !m-0 h-full w-full rounded-[12px] object-cover"
        />
      )}
    </div>
  );

  if (stateMenu) {
    return (
      <>
        {preview}
        {/* Outside the preview: a pick in the menu must not award points. */}
        <AnchoredMenu
          open={menuOpen}
          anchor={menuAnchorRef.current}
          onClose={() => setMenuOpen(false)}
          placement="bottom-start"
          ariaLabel={tThemes('previewState')}
          plainHeaders
          items={[
            { variant: 'header', label: tThemes('previewState') },
            ...previewBadges.map((badge) => ({
              label: t(badge.key),
              onClick: () => setState(badge.key as ItemState),
              trailing:
                badge.key === state ? (
                  <Check className="size-4 text-accent" aria-hidden />
                ) : undefined,
            })),
          ]}
        />
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
