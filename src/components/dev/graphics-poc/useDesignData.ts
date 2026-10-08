'use client';
import { useMemo } from 'react';

import {
  resolveFixtureCountries,
  resolveManualCountries,
  resolveSnapshotCountries,
} from './fixture';
import { DataBinding } from './model';

import { useContestSnapshotQuery } from '@/api/contests';
import { Country } from '@/models';
import { useScoreboardStore } from '@/state/scoreboardStore';

export interface ResolvedData {
  countries: Country[];
  status: 'ready' | 'loading' | 'error' | 'empty';
  info: string;
}

/** Resolves a design's data binding to a ranked `Country[]`. */
export function useResolvedCountries(binding: DataBinding): ResolvedData {
  const contestId = binding.source === 'contest' ? binding.contestId : '';
  const snapshotQuery = useContestSnapshotQuery(contestId, !!contestId);
  const eventStages = useScoreboardStore((s) => s.eventStages);
  const currentStageId = useScoreboardStore((s) => s.currentStageId);

  return useMemo<ResolvedData>(() => {
    switch (binding.source) {
      case 'fixture': {
        const countries = resolveFixtureCountries(binding.count);

        return {
          countries,
          status: 'ready',
          info: `fixture · ${countries.length} rows`,
        };
      }
      case 'manual': {
        const countries = resolveManualCountries(binding.rows);

        return {
          countries,
          status: countries.length ? 'ready' : 'empty',
          info: `manual · ${countries.length} rows`,
        };
      }
      case 'live': {
        const stage =
          eventStages.find((s) => s.id === currentStageId) ??
          eventStages[eventStages.length - 1];
        const countries = stage
          ? [...stage.countries].sort((a, b) => b.points - a.points)
          : [];

        return {
          countries,
          status: countries.length ? 'ready' : 'empty',
          info: stage
            ? `live · ${stage.name} · ${countries.length} rows`
            : 'live · no stage in scoreboard store',
        };
      }
      case 'contest': {
        if (snapshotQuery.isLoading) {
          return {
            countries: [],
            status: 'loading',
            info: 'loading snapshot…',
          };
        }
        if (snapshotQuery.isError || !snapshotQuery.data) {
          return {
            countries: [],
            status: 'error',
            info: `snapshot error: ${String(
              (snapshotQuery.error as Error | null)?.message ?? 'no data',
            )}`,
          };
        }
        const { countries, stageId } = resolveSnapshotCountries(
          snapshotQuery.data,
          binding.stageId,
        );

        return {
          countries,
          status: countries.length ? 'ready' : 'empty',
          info: `contest ${binding.contestId} · stage ${stageId ?? '—'} · ${
            countries.length
          } rows`,
        };
      }
      default:
        return { countries: [], status: 'empty', info: 'unknown source' };
    }
  }, [
    binding,
    eventStages,
    currentStageId,
    snapshotQuery.data,
    snapshotQuery.isLoading,
    snapshotQuery.isError,
    snapshotQuery.error,
  ]);
}
