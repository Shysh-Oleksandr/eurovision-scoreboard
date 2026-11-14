'use client';
import { useTranslations } from 'next-intl';
import React from 'react';

import { PresentRow, SpeedSlider } from './controls';
import {
  QualifiedList,
  QualifierHint,
  QualifierRandomGroup,
  QualifierResultsActions,
  QualifierWindow,
} from './QualifierParts';
import { useQualifiers } from './useQualifiers';
import { COLUMN_PART, WINDOW_CLASS, WINDOW_FRAME_CLASS } from './VotingColumn';

import { useGeneralStore } from '@/state/generalStore';

/**
 * Desktop, Pick qualifiers mode: the column next to the board. The window
 * shows the latest qualifier (the split screen's candidates while it shows),
 * then "Qualified for the Grand Final" as numbered places, At random, and
 * Present pinned at the bottom, as in the standard mode's column. Once the
 * stage is over: the qualifiers' flags, the full list, Share and Continue.
 */
const QualifiersColumn = ({
  isPresenting,
  onShare,
}: {
  isPresenting: boolean;
  onShare: () => void;
}) => {
  const t = useTranslations('simulation.view');
  const q = useQualifiers();
  const presentationModeEnabled = useGeneralStore(
    (state) => state.settings.presentationModeEnabled,
  );

  if (q.isOver) {
    return (
      <aside
        aria-label={t('votingControls')}
        className="dp-sim-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px]"
      >
        <QualifierWindow q={q} windowClassName={WINDOW_CLASS} />
        <div className="flex flex-col gap-4 p-4">
          <QualifiedList q={q} />
          <QualifierResultsActions onShare={onShare} />
        </div>
      </aside>
    );
  }

  let footer: React.ReactNode = null;

  if (isPresenting) {
    footer = (
      <>
        <SpeedSlider />
        <div className="h-px bg-hair" />
        <PresentRow isPresenting withJuryOptions={false} />
      </>
    );
  } else if (presentationModeEnabled) {
    footer = (
      <>
        <div className="h-px bg-hair" />
        <PresentRow />
      </>
    );
  }

  return (
    <aside
      aria-label={t('votingControls')}
      className="dp-sim-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px]"
    >
      <QualifierWindow
        q={q}
        className={WINDOW_FRAME_CLASS}
        windowClassName={WINDOW_CLASS}
      />
      <div {...COLUMN_PART} className="flex flex-none flex-col gap-3.5 p-4">
        {!isPresenting && <QualifierHint />}
        <QualifiedList q={q} />
        {!isPresenting && <QualifierRandomGroup q={q} />}
      </div>
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

export default QualifiersColumn;
