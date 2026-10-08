'use client';
import React, { createContext, useContext, useMemo } from 'react';

import { resolveSnapshotCountries, snapshotStages } from '../data/contestRows';
import {
  SAMPLE_COUNTRIES,
  SAMPLE_RUNNING_ORDER,
  SAMPLE_STAGE,
  SAMPLE_VOTERS,
  SAMPLE_VOTES,
} from '../data/sampleRows';
import { DataBinding, ManualRow } from '../model/design';

import { useContestSnapshotQuery } from '@/api/contests';
import { useCountryDisplay, useCountrySorter } from '@/components/board/hooks';
import {
  Country,
  EventStage,
  StageVotingType,
  StatsTableType,
  VotingCountry,
} from '@/models';
import type { StageVotes } from '@/state/scoreboard/types';
import { useScoreboardStore } from '@/state/scoreboardStore';

/**
 * Everything a stats element needs; computed by the stats modals from their
 * own state and handed through (not serialisable, like `provided` rows).
 */
export interface StatsSource {
  rankedCountries: (Country & { rank: number })[];
  selectedStage: EventStage | undefined;
  selectedStageId: string | null;
  selectedVoteType: StageVotingType | 'Total';
  getCellPoints: (
    participantCode: string,
    voterCode: string,
  ) => string | number;
  getCellClassName: (points: number) => string;
  getPoints: (
    country: Country,
    type?: 'jury' | 'televote' | 'combined',
  ) => number;
  aggregateTotalsOnly?: boolean;
  table?: StatsTableType;
  /** Table columns; absent = ask the countries store for the stage's voters. */
  votingCountries?: VotingCountry[];
}

export interface ContestAccessProblem {
  contestName: string;
  /** 403 → `private`, 404 → `missing`, anything else → `error`. */
  reason: 'private' | 'missing' | 'error';
}

export interface ResolvedDesignData {
  /** Ranked rows for scoreboard elements. */
  countries: Country[];
  /** The stage the rows come from is over (affects NQ display). */
  isVotingOver: boolean;
  /** Name of the stage the rows come from ("Grand Final"); '' when unknown. */
  stageName: string;
  /** Country codes in the stage's running order, when the source has one. */
  runningOrder?: string[];
  status: 'ready' | 'loading' | 'error';
  /** Stats handed in by a share modal; wins over `statsStage`. */
  stats?: StatsSource;
  /**
   * A live stage + its predefined votes, for stats elements to compute
   * their own tables (statsAccessors). Only the live source has it.
   */
  statsStage?: {
    stage: EventStage;
    votes?: Partial<StageVotes>;
    /** Voters per channel when the stage isn't in the stores (sample). */
    voters?: Record<'jury' | 'televote', VotingCountry[]>;
  };
  /** Stages of the bound contest (Data panel stage select). */
  contestStages?: ReturnType<typeof snapshotStages>;
  /**
   * The bound contest could not be opened; rows fell back to the live
   * scoreboard (handoff §9, "quiet fallback with a note").
   */
  inaccessible?: ContestAccessProblem;
  /** No contest is running: the live rows are the sample ones (sampleRows). */
  isSample?: boolean;
}

const DesignDataContext = createContext<ResolvedDesignData>({
  countries: [],
  isVotingOver: false,
  stageName: '',
  status: 'ready',
});

export const useDesignData = (): ResolvedDesignData =>
  useContext(DesignDataContext);

const manualToCountries = (rows: ManualRow[]): Country[] =>
  rows.map((row) => ({
    name: row.name,
    code: row.code,
    flag: row.flag,
    juryPoints: row.juryPoints ?? 0,
    televotePoints: row.televotePoints ?? 0,
    points: row.points,
    lastReceivedPoints: null,
    isVotingFinished: true,
  }));

interface ProviderProps {
  binding: DataBinding;
  /** Rows for `provided` bindings (running order, podium…). */
  providedCountries?: Country[];
  stats?: StatsSource;
  children: React.ReactNode;
}

const EMPTY: Country[] = [];

/**
 * Resolves a design's data binding. `live` reads the scoreboard store exactly
 * like the board does (same display filter and tiebreak sorter), so a results
 * image always matches what is on screen; a `stageId` on the binding picks
 * another stage of the running event. `contest` loads the saved contest's
 * snapshot (React Query) and ranks the chosen stage; when the contest can't
 * be opened the rows fall back to live and `inaccessible` says why. With
 * no contest running, live rows are the sample Grand Final (`isSample`) so
 * scoreboards and stats tables never preview empty.
 */
export const DesignDataProvider: React.FC<ProviderProps> = ({
  binding,
  providedCountries,
  stats,
  children,
}) => {
  const liveStageId = binding.source === 'live' ? binding.stageId : undefined;
  const liveStage = useScoreboardStore((s) => {
    const wanted = liveStageId
      ? s.eventStages.find((st) => st.id === liveStageId)
      : undefined;

    return (
      wanted ||
      s.eventStages.find((st) => st.id === s.viewedStageId) ||
      s.getCurrentStage()
    );
  });
  const liveVotes = useScoreboardStore((s) =>
    liveStage ? s.predefinedVotes[liveStage.id] : undefined,
  );
  const viewedCountries = useCountryDisplay();
  // A stage picked explicitly reads that stage's rows; otherwise the viewed
  // stage with the board's "all participants" merge.
  const pickedCountries =
    liveStageId && liveStage?.id === liveStageId
      ? liveStage.countries
      : viewedCountries;
  const sortedLive = useCountrySorter(pickedCountries ?? EMPTY);

  const contestId = binding.source === 'contest' ? binding.contestId : '';
  const snapshotQuery = useContestSnapshotQuery(contestId, !!contestId);
  const snapshot = snapshotQuery.data;
  const snapshotError = snapshotQuery.error as {
    response?: { status?: number };
  } | null;

  const value = useMemo<ResolvedDesignData>(() => {
    const live: ResolvedDesignData = !liveStage
      ? {
          countries: SAMPLE_COUNTRIES,
          isVotingOver: true,
          stageName: SAMPLE_STAGE.name,
          runningOrder: SAMPLE_RUNNING_ORDER,
          status: 'ready',
          stats,
          statsStage: {
            stage: SAMPLE_STAGE,
            votes: SAMPLE_VOTES,
            voters: SAMPLE_VOTERS,
          },
          isSample: true,
        }
      : {
          countries: sortedLive,
          isVotingOver: !!liveStage?.isOver,
          stageName: liveStage?.name ?? '',
          runningOrder: liveStage?.runningOrder?.length
            ? liveStage.runningOrder
            : liveStage?.countries.map((c) => c.code),
          status: 'ready',
          stats,
          statsStage: liveStage
            ? { stage: liveStage, votes: liveVotes }
            : undefined,
        };

    switch (binding.source) {
      case 'provided':
        return {
          countries: providedCountries ?? EMPTY,
          isVotingOver: false,
          stageName: liveStage?.name ?? '',
          status: 'ready',
          stats,
        };
      case 'manual':
        return {
          countries: [...manualToCountries(binding.rows)].sort(
            (a, b) => b.points - a.points,
          ),
          isVotingOver: true,
          stageName: '',
          status: 'ready',
          stats,
        };
      case 'contest': {
        const contestName = binding.contestName ?? '';

        if (snapshot) {
          const { countries, stage } = resolveSnapshotCountries(
            snapshot,
            binding.stageId,
          );

          const setupStage = snapshot.setup.stages.find(
            (s) => s.id === stage?.id,
          );

          return {
            countries,
            isVotingOver: stage?.isOver ?? true,
            stageName: stage?.name ?? '',
            runningOrder: setupStage?.participants,
            status: 'ready',
            stats,
            contestStages: snapshotStages(snapshot),
          };
        }
        if (snapshotQuery.isError) {
          const code = snapshotError?.response?.status;

          return {
            ...live,
            status: 'error',
            inaccessible: {
              contestName,
              reason:
                code === 403 || code === 401
                  ? 'private'
                  : code === 404
                  ? 'missing'
                  : 'error',
            },
          };
        }

        return {
          ...live,
          countries: EMPTY,
          status: 'loading',
          stats,
          isSample: false,
        };
      }
      case 'live':
      default:
        return live;
    }
  }, [
    binding,
    providedCountries,
    stats,
    sortedLive,
    liveStage,
    liveVotes,
    snapshot,
    snapshotQuery.isError,
    snapshotError,
  ]);

  return (
    <DesignDataContext.Provider value={value}>
      {children}
    </DesignDataContext.Provider>
  );
};
