import { useShallow } from 'zustand/shallow';

import { StageVotingMode, VotingCountry } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

export type VoterPhase =
  /** A jury (or combined) voter gives the points system to the board. */
  | 'jury'
  /** One country's televote points are entered, lowest jury score first. */
  | 'televote'
  /** ESC 2016-2018 style: a points value is revealed, the user picks who gets it. */
  | 'reveal';

export interface VoterInfo {
  phase: VoterPhase;
  /** The voter (jury) or the country receiving televote points. */
  country?: VotingCountry;
  /** 1-based position in the order of voters / televote entries. */
  index: number;
  total: number;
  /** Share of the round already done, 0-1. */
  progress: number;
  /** The jury value given next, or the televote value being revealed. */
  points: number;
  isCombined: boolean;
}

/**
 * Who is voting right now, how far the round is and which value goes next:
 * the facts the spokesperson window, the sheet's peek and the stripe show.
 */
export const useVoterInfo = (): VoterInfo => {
  const {
    isJuryVoting,
    votingMode,
    stageCountriesLength,
    votingCountryIndex,
    televotingProgress,
    votingPoints,
    currentRevealTelevotePoints,
  } = useScoreboardStore(
    useShallow((state) => {
      const stage = state.getCurrentStage();

      return {
        isJuryVoting: !!stage?.isJuryVoting,
        votingMode: stage?.votingMode,
        stageCountriesLength: stage?.countries.length ?? 0,
        votingCountryIndex: state.votingCountryIndex,
        televotingProgress: state.televotingProgress,
        votingPoints: state.getVotingPoints(),
        currentRevealTelevotePoints: state.currentRevealTelevotePoints,
      };
    }),
  );
  const revealTelevoteLowestToHighest = useGeneralStore(
    (state) => state.settings.revealTelevoteLowestToHighest,
  );
  const getVotingCountry = useCountriesStore((state) => state.getVotingCountry);
  const getVotingCountriesLength = useCountriesStore(
    (state) => state.getVotingCountriesLength,
  );

  // Read imperatively; the subscriptions above (index, phase) keep it fresh.
  const votingCountry = getVotingCountry();
  const isCombined = votingMode === StageVotingMode.COMBINED;

  if (isJuryVoting) {
    const total = getVotingCountriesLength();

    return {
      phase: 'jury',
      country: votingCountry,
      index: votingCountryIndex + 1,
      total,
      progress: total ? Math.min(votingCountryIndex / total, 1) : 0,
      points: votingPoints,
      isCombined,
    };
  }

  return {
    phase: revealTelevoteLowestToHighest ? 'reveal' : 'televote',
    country: revealTelevoteLowestToHighest ? undefined : votingCountry,
    index: televotingProgress + 1,
    total: stageCountriesLength,
    progress: stageCountriesLength
      ? Math.min(televotingProgress / stageCountriesLength, 1)
      : 0,
    points: currentRevealTelevotePoints ?? 0,
    isCombined,
  };
};
