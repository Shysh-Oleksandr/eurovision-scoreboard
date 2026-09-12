import { useMemo } from 'react';

import { useShallow } from 'zustand/shallow';

import { Country, EventStage, VotingCountry } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { getWinnerCountry } from '@/state/scoreboard/helpers';
import {
  getDouzeAwards,
  getDouzePointsIds,
  getJuryMatrix,
  getScaleSteps,
  getStepAwards,
  hasScaleStepsLeft,
  resolveJuryScaleRevealCursor,
} from '@/state/scoreboard/juryScaleReveal';
import { resolveStagePointsSystem } from '@/state/scoreboard/stageOverrides';
import { useScoreboardStore } from '@/state/scoreboardStore';

/**
 * Set only once a qualifying stage has been decided, so the board can double as
 * the qualifier readout for jury-only / combined semi-finals.
 */
export type RevealQualification = 'qualified' | 'eliminated' | null;

export type RevealColumn = {
  country: Country;
  /** 0–100; bar fill relative to the current highest scorer. */
  barPercent: number;
  /** Points received in the step just revealed (douze phase: accumulated). */
  awardedPoints: number | null;
  /** Juries to show above the bar. Empty in the douze phase except for the latest. */
  voters: VotingCountry[];
  isLeader: boolean;
  qualification: RevealQualification;
};

export type RevealModel = {
  columns: RevealColumn[];
  /** True while the countdown still has a value to reveal. */
  isScalePhase: boolean;
  /** True on the beat after the last award, before the stage is committed. */
  isAwaitingFinish: boolean;
  /** The value the next advance will reveal, or null once the 12s are up. */
  nextStepPoints: number | null;
  /** Country code of the column to keep in view after the latest advance. */
  focusCountryCode: string | null;
};

const EMPTY_MODEL: RevealModel = {
  columns: [],
  isScalePhase: true,
  isAwaitingFinish: false,
  nextStepPoints: null,
  focusCountryCode: null,
};

/** Fixed presentation order — running order when set, otherwise stage order. */
const orderCountries = (stage: EventStage): Country[] => {
  const { runningOrder } = stage;

  if (!runningOrder?.length) return stage.countries;

  const indexByCode = new Map(runningOrder.map((code, index) => [code, index]));

  return [...stage.countries].sort(
    (a, b) =>
      (indexByCode.get(a.code) ?? Number.MAX_SAFE_INTEGER) -
      (indexByCode.get(b.code) ?? Number.MAX_SAFE_INTEGER),
  );
};

/**
 * The entire bar board, derived from the reveal cursor and the predefined vote
 * matrix. Nothing here is stored, so the overlay can never disagree with the
 * points on the board.
 */
export const useRevealColumns = (): RevealModel => {
  const { eventStages, currentStageId, juryScaleReveal, votingCountryIndex } =
    useScoreboardStore(
      useShallow((state) => ({
        eventStages: state.eventStages,
        currentStageId: state.currentStageId,
        juryScaleReveal: state.juryScaleReveal,
        votingCountryIndex: state.votingCountryIndex,
      })),
    );
  const awardsHidden = useScoreboardStore(
    (state) => state.juryScaleRevealAwardsHidden,
  );
  const predefinedVotes = useScoreboardStore((state) => state.predefinedVotes);
  const getStageVotingCountries = useCountriesStore(
    (state) => state.getStageVotingCountries,
  );
  const pointsSystemSource = useGeneralStore(
    useShallow((state) => ({
      pointsSystem: state.pointsSystem,
      televotePointsSystem: state.televotePointsSystem,
      settings: state.settings,
    })),
  );

  const stage = eventStages.find((s) => s.id === currentStageId);

  return useMemo(() => {
    if (!stage) return EMPTY_MODEL;

    const { pointsSystem } = resolveStagePointsSystem(
      stage,
      pointsSystemSource,
    );
    const matrix = getJuryMatrix(stage, predefinedVotes);
    const voters = getStageVotingCountries(stage.id, { channel: 'jury' });
    const voterByCode = new Map(voters.map((voter) => [voter.code, voter]));
    const scaleSteps = getScaleSteps(pointsSystem);
    const douzePointsIds = getDouzePointsIds(pointsSystem);
    const cursor = resolveJuryScaleRevealCursor(juryScaleReveal, stage);
    const isScalePhase = hasScaleStepsLeft(cursor, scaleSteps.length);

    const awardedPointsByCode: Record<string, number> = {};
    const votersByCode: Record<string, VotingCountry[]> = {};
    let focusCountryCode: string | null = null;

    const toVoters = (codes: string[]): VotingCountry[] =>
      codes
        .map((code) => voterByCode.get(code))
        .filter((voter): voter is VotingCountry => !!voter);

    if (cursor.phase === 'scale') {
      // The cursor points at the NEXT step, so the overlay shows the previous one.
      const revealedStep = scaleSteps[cursor.stepIndex - 1];

      if (revealedStep && !awardsHidden) {
        const awards = getStepAwards(matrix, revealedStep.id, voters);
        let bestPoints = -1;

        Object.entries(awards).forEach(([countryCode, award]) => {
          awardedPointsByCode[countryCode] = award.points;
          votersByCode[countryCode] = toVoters(award.voterCodes);

          if (award.points > bestPoints) {
            bestPoints = award.points;
            focusCountryCode = countryCode;
          }
        });
      }
    } else {
      // Douze phase: totals accumulate and stay up, but only the country the
      // latest spokesperson picked shows a flag.
      const { totals, lastVoterCode, lastRecipientCodes } = getDouzeAwards(
        matrix,
        douzePointsIds,
        voters,
        0,
        votingCountryIndex,
      );

      Object.assign(awardedPointsByCode, totals);

      const lastVoter = lastVoterCode
        ? voterByCode.get(lastVoterCode)
        : undefined;

      if (lastVoter) {
        lastRecipientCodes.forEach((countryCode) => {
          votersByCode[countryCode] = [lastVoter];
        });
      }

      focusCountryCode = lastRecipientCodes[0] ?? null;
    }

    const orderedCountries = orderCountries(stage);
    const maxPoints = orderedCountries.reduce(
      (max, country) => Math.max(max, country.points),
      0,
    );
    const leaderCode =
      maxPoints > 0
        ? getWinnerCountry(stage.countries, stage.runningOrder)?.code ?? null
        : null;

    /*
     * On a jury-only / combined semi-final the bars stay up after the stage is
     * decided, and without this the board gives no clue who went through —
     * there is no sorted scoreboard to read the cut-off from.
     */
    const showsQualification =
      stage.isOver && !stage.isLastStage && !!stage.qualifiesTo?.length;

    const columns: RevealColumn[] = orderedCountries.map((country) => ({
      country,
      barPercent: maxPoints > 0 ? (country.points / maxPoints) * 100 : 0,
      awardedPoints: awardedPointsByCode[country.code] ?? null,
      voters: votersByCode[country.code] ?? [],
      isLeader: country.code === leaderCode,
      qualification: showsQualification
        ? country.qualifiedFromStageIds?.includes(stage.id)
          ? 'qualified'
          : 'eliminated'
        : null,
    }));

    const nextStep = isScalePhase ? scaleSteps[cursor.stepIndex] : undefined;

    return {
      columns,
      isScalePhase,
      isAwaitingFinish: cursor.phase === 'awaitingFinish',
      nextStepPoints: nextStep?.value ?? null,
      focusCountryCode,
    };
  }, [
    stage,
    predefinedVotes,
    juryScaleReveal,
    votingCountryIndex,
    awardsHidden,
    getStageVotingCountries,
    pointsSystemSource,
  ]);
};
