import { useTranslations } from 'next-intl';
import { type JSX } from 'react';

import { StageVotingMode } from '../../models';
import { useScoreboardStore } from '../../state/scoreboardStore';
import SnowPileEffect from '../effects/SnowPileEffect';

import CountryInfo from './CountryInfo';
import VotingButtons from './VotingButtons';
import VotingPointsInfo from './VotingPointsInfo';

import { useGeneralStore } from '@/state/generalStore';

const ControlsPanel = (): JSX.Element | null => {
  const t = useTranslations('simulation');

  const votingCountryIndex = useScoreboardStore(
    (state) => state.votingCountryIndex,
  );
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const isJuryPointsPanelRounded = useGeneralStore(
    (state) => state.customTheme?.isJuryPointsPanelRounded ?? false,
  );
  const juryActivePointsUnderline = useGeneralStore(
    (state) => state.customTheme?.juryActivePointsUnderline ?? true,
  );

  const {
    isJuryVoting,
    isOver: isVotingOver,
    votingMode,
  } = getCurrentStage() || {};

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
      <div className="bg-gradient-to-tr from-[30%] from-primary-950 to-primary-900 rounded-md relative">
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

export default ControlsPanel;
