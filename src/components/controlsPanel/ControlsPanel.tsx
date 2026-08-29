import { useTranslations } from 'next-intl';
import React, { type JSX } from 'react';

import { useShallow } from 'zustand/shallow';

import { StageVotingMode } from '../../models';
import { useScoreboardStore } from '../../state/scoreboardStore';
import SnowPileEffect from '../effects/SnowPileEffect';

import CountryInfo from './CountryInfo';
import VotingButtons from './VotingButtons';
import VotingPointsInfo from './VotingPointsInfo';

import { useQualifiedCountriesPanelGlowStyle } from '@/theme/useQualifiedCountriesPanelGlowStyle';
import useThemeSpecifics from '@/theme/useThemeSpecifics';

const ControlsPanel = (): JSX.Element | null => {
  const t = useTranslations('simulation');

  const votingCountryIndex = useScoreboardStore(
    (state) => state.votingCountryIndex,
  );
  // Subscribe to the exact stage fields this panel renders from, so the
  // memoized panel re-renders at phase transitions but not on every award.
  const {
    isJuryVoting,
    isOver: isVotingOver,
    votingMode,
  } = useScoreboardStore(
    useShallow((state) => {
      const stage = state.getCurrentStage();

      return {
        isJuryVoting: stage?.isJuryVoting,
        isOver: stage?.isOver,
        votingMode: stage?.votingMode,
      };
    }),
  );
  const {
    isJuryPointsPanelRounded,
    juryActivePointsUnderline,
    roundedCountryContainer,
  } = useThemeSpecifics();
  const roundedPanelGlowStyle = useQualifiedCountriesPanelGlowStyle(
    roundedCountryContainer,
  );

  if (isVotingOver) {
    return null;
  }

  let votingTitle = t('televote');

  if (votingMode === StageVotingMode.COMBINED) {
    votingTitle = t('voting');
  } else if (isJuryVoting) {
    votingTitle = t('juryVoting');
  }

  return (
    <div className="w-full">
      <div className="md:pb-2 pb-1 md:h-12 md:flex items-center hidden">
        <h3
          className="lg:text-2xl text-xl text-white"
          style={{ textShadow: '0 0 10px rgba(0, 0, 0, 0.2)' }}
        >
          {votingTitle}
        </h3>
      </div>
      <div
        className={`bg-gradient-to-tr from-[30%] from-primary-950 to-primary-900 ${
          roundedCountryContainer
            ? 'qualified-countries-panel--rounded'
            : 'rounded-[10px]'
        } relative`}
        style={roundedPanelGlowStyle}
      >
        <SnowPileEffect snowEffect="middle" className="!w-full" />
        {isJuryVoting && (
          <CountryInfo votingCountryIndex={votingCountryIndex} />
        )}
        <VotingButtons />
      </div>
      {isJuryVoting && (
        <VotingPointsInfo
          juryActivePointsUnderline={juryActivePointsUnderline}
          isRounded={isJuryPointsPanelRounded}
        />
      )}
    </div>
  );
};

export default React.memo(ControlsPanel);
