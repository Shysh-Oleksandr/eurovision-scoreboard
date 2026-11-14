import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { useShallow } from 'zustand/shallow';

import { useSimViewStore } from './simViewStore';
import { pickAllQualifiersRandomly } from './useQualifiers';
import { VoterInfo } from './useVoterInfo';

import { useHotKey } from '@/hooks/useHotKey';
import { StageId } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

export interface RandomAction {
  id: 'next' | 'voter' | 'all';
  label: string;
  /** Second line under the label, e.g. "whole vote" under the voter's name. */
  detail?: string;
  run: () => void;
}

/**
 * The "At random" group: each action names what gets randomised instead of
 * the old Random / Vote randomly / Finish randomly trio. Jury: the next value,
 * the current voter's whole vote, every remaining jury. Televote: this
 * country's points, every remaining country.
 *
 * Running a jury scope (next value or whole vote) also makes it the one-tap
 * Random's scope (`useQuickRandomAction`).
 */
export const useRandomActions = (voter: VoterInfo): RandomAction[] => {
  const t = useTranslations('simulation.view');

  const useGroupedJuryPoints = useGeneralStore(
    (state) => state.settings.useGroupedJuryPoints,
  );
  const {
    finishJuryVotingRandomly,
    finishTelevoteVotingRandomly,
    giveRandomJuryPoints,
    givePredefinedJuryPoint,
    givePredefinedJuryPointsGrouped,
    givePredefinedTelevotePoints,
  } = useScoreboardStore(
    useShallow((state) => ({
      finishJuryVotingRandomly: state.finishJuryVotingRandomly,
      finishTelevoteVotingRandomly: state.finishTelevoteVotingRandomly,
      giveRandomJuryPoints: state.giveRandomJuryPoints,
      givePredefinedJuryPoint: state.givePredefinedJuryPoint,
      givePredefinedJuryPointsGrouped: state.givePredefinedJuryPointsGrouped,
      givePredefinedTelevotePoints: state.givePredefinedTelevotePoints,
    })),
  );

  const setQuickRandom = useSimViewStore((state) => state.setQuickRandom);
  const isJury = voter.phase === 'jury';

  const finishAll = useCallback(() => {
    if (isJury) finishJuryVotingRandomly();
    else finishTelevoteVotingRandomly();
  }, [isJury, finishJuryVotingRandomly, finishTelevoteVotingRandomly]);

  return useMemo(() => {
    if (isJury) {
      return [
        {
          id: 'next',
          label: t('pointsCount', { count: voter.points }),
          run: () => {
            setQuickRandom('next');
            givePredefinedJuryPoint();
          },
        },
        {
          id: 'voter',
          label: voter.country?.name ?? t('thisVote'),
          detail: t('wholeVote'),
          run: () => {
            setQuickRandom('voter');

            if (useGroupedJuryPoints) givePredefinedJuryPointsGrouped();
            else giveRandomJuryPoints();
          },
        },
        {
          id: 'all',
          label: voter.isCombined ? t('allVoters') : t('allJuries'),
          run: finishAll,
        },
      ];
    }

    return [
      {
        id: 'next',
        label:
          voter.phase === 'reveal'
            ? t('pointsCount', { count: voter.points })
            : voter.country?.name ?? t('thisCountry'),
        run: givePredefinedTelevotePoints,
      },
      { id: 'all', label: t('allCountries'), run: finishAll },
    ];
  }, [
    isJury,
    t,
    voter.points,
    voter.country?.name,
    voter.isCombined,
    voter.phase,
    setQuickRandom,
    givePredefinedJuryPoint,
    useGroupedJuryPoints,
    givePredefinedJuryPointsGrouped,
    giveRandomJuryPoints,
    givePredefinedTelevotePoints,
    finishAll,
  ]);
};

/**
 * The one-tap Random (the stripe's split button, the sheet's peek): in a jury
 * round the scope last picked, the next value by default; in the televote
 * this country's points. `isWholeVote` asks for the "whole vote" subtitle.
 */
export const useQuickRandomAction = (voter: VoterInfo) => {
  const actions = useRandomActions(voter);
  const quickRandom = useSimViewStore((state) => state.quickRandom);
  const isWholeVote = voter.phase === 'jury' && quickRandom === 'voter';
  const quick =
    actions.find((action) => action.id === (isWholeVote ? 'voter' : 'next')) ??
    actions[0];

  return { actions, quick, isWholeVote };
};

/** Ctrl+F finishes the round at random; mount once per layout. */
export const useFinishRandomlyHotkey = () => {
  const finishJuryVotingRandomly = useScoreboardStore(
    (state) => state.finishJuryVotingRandomly,
  );
  const finishTelevoteVotingRandomly = useScoreboardStore(
    (state) => state.finishTelevoteVotingRandomly,
  );

  const finish = useCallback(() => {
    const stage = useScoreboardStore.getState().getCurrentStage();

    if (!stage || stage.isOver) return;

    // Pick qualifiers mode: every place left.
    const { isPickQualifiersMode } = useGeneralStore.getState().settings;

    if (isPickQualifiersMode && stage.id.toUpperCase() !== StageId.GF) {
      pickAllQualifiersRandomly();

      return;
    }

    if (stage.isJuryVoting) finishJuryVotingRandomly();
    else finishTelevoteVotingRandomly();
  }, [finishJuryVotingRandomly, finishTelevoteVotingRandomly]);

  useHotKey('f', finish);
};
