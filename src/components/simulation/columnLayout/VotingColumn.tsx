'use client';
import { useTranslations } from 'next-intl';
import React from 'react';

import { AtRandomGroup, PresentRow, SpeedSlider } from './controls';
import { useSimViewStore } from './simViewStore';
import TelevoteEntry from './TelevoteEntry';
import { useVoterInfo, VoterInfo } from './useVoterInfo';
import VoterWindow from './VoterWindow';

import VotingPointsInfo from '@/components/controlsPanel/VotingPointsInfo';
import { useGeneralStore } from '@/state/generalStore';
import useThemeSpecifics from '@/theme/useThemeSpecifics';

/**
 * "Choose a country to give 7 points": the one thing on screen that says the
 * board's rows are what you tap. Only until points were first given that
 * way on this device (`boardTapped`), and never in the televote, where the
 * window names the country and the field says what to type.
 */
export const VotingHint = ({
  voter,
  className = '',
}: {
  voter: VoterInfo;
  className?: string;
}) => {
  const t = useTranslations('simulation');
  const hideVotingHints = useGeneralStore(
    (state) => state.settings.hideVotingHints,
  );
  const boardTapped = useSimViewStore((state) => state.boardTapped);

  if (hideVotingHints || boardTapped || voter.phase === 'televote') {
    return null;
  }

  return (
    <p
      className={`text-[15px] font-semibold leading-snug text-white ${className}`}
    >
      {t('chooseCountryToGivePoints', { count: voter.points })}
    </p>
  );
};

/** The theme's own jury points strip (`VotingPointsInfo`), unchanged. */
export const ThemePointsStrip = () => {
  const { isJuryPointsPanelRounded, juryActivePointsUnderline } =
    useThemeSpecifics();

  return (
    <div className="[&>div]:!mt-0">
      <VotingPointsInfo
        juryActivePointsUnderline={juryActivePointsUnderline}
        isRounded={isJuryPointsPanelRounded}
      />
    </div>
  );
};

/**
 * The window shows the flag in a flag's own shape (3:2), as wide as the
 * column. When the column is held to the board's height or the screen it
 * gives way first, down to 2:1 (the flag cropped a little), so the controls
 * never scroll. `useColumnFit` counts on that minimum.
 */
export const WINDOW_FRAME_CLASS = 'min-h-0 shrink';
export const WINDOW_CLASS =
  'aspect-[3/2] min-h-[calc(var(--sim-col-w,360px)/2)] shrink';

/** Marks the column's fixed-height parts for `useColumnFit`. */
export const COLUMN_PART = { 'data-col-part': '' };

/**
 * Desktop: the spokesperson column next to the board. The voter's window on
 * top, the controls under it, Present (Pause while presenting) pinned at the
 * bottom; the space between takes whatever height the column has to spare.
 */
const VotingColumn = ({ isPresenting }: { isPresenting: boolean }) => {
  const voter = useVoterInfo();
  const presentationModeEnabled = useGeneralStore(
    (state) => state.settings.presentationModeEnabled,
  );

  let controls: React.ReactNode = null;
  let footer: React.ReactNode = null;

  if (isPresenting) {
    // Read-only during a presentation: which value is next.
    controls = voter.phase === 'jury' && <ThemePointsStrip />;
    footer = (
      <>
        <SpeedSlider />
        <div className="h-px bg-hair" />
        <PresentRow isPresenting withJuryOptions={voter.phase === 'jury'} />
      </>
    );
  } else {
    controls = (
      <>
        <VotingHint voter={voter} />
        {voter.phase === 'jury' ? (
          <ThemePointsStrip />
        ) : (
          <TelevoteEntry autoFocus />
        )}
        <AtRandomGroup voter={voter} />
      </>
    );
    footer = presentationModeEnabled && (
      <>
        <div className="h-px bg-hair" />
        <PresentRow />
      </>
    );
  }

  return (
    <aside
      aria-label={voter.country?.name}
      className="dp-sim-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px]"
    >
      <VoterWindow
        voter={voter}
        className={WINDOW_FRAME_CLASS}
        windowClassName={WINDOW_CLASS}
      />
      {controls && (
        <div {...COLUMN_PART} className="flex flex-none flex-col gap-3.5 p-4">
          {controls}
        </div>
      )}
      <div className="min-h-4 flex-1" />
      {footer && (
        <div
          {...COLUMN_PART}
          className="flex flex-none flex-col gap-3.5 px-4 pb-4"
        >
          {footer}
        </div>
      )}
    </aside>
  );
};

export default VotingColumn;
