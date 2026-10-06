import { ALL_COUNTRIES } from '@/data/countries/common-countries';
import { Country } from '@/models';
import type { ContestSnapshot } from '@/types/contestSnapshot';

export interface SnapshotStage {
  id: string;
  name: string;
  order: number;
  /** The stage has countries with results in the snapshot. */
  hasRows: boolean;
  isOver: boolean;
}

/** Stages of a saved contest in event order, flagged with what they hold. */
export function snapshotStages(snapshot: ContestSnapshot): SnapshotStage[] {
  const byStage = snapshot.simulation?.countriesStateByStage ?? {};
  const simStages = snapshot.simulation?.stages ?? [];

  return [...snapshot.setup.stages]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      id: s.id,
      name: s.name,
      order: s.order,
      hasRows: (byStage[s.id]?.length ?? 0) > 0,
      isOver: !!simStages.find((st) => st.id === s.id)?.isOver,
    }));
}

/**
 * Rows of one stage of a saved contest, ranked by points. `stageId` picks a
 * stage with results; otherwise the last stage that has any. Custom entries
 * keep the name and flag the contest stored for them.
 */
export function resolveSnapshotCountries(
  snapshot: ContestSnapshot,
  stageId?: string,
): { countries: Country[]; stage: SnapshotStage | null } {
  const byStage = snapshot.simulation?.countriesStateByStage ?? {};
  const stages = snapshotStages(snapshot);
  const withRows = stages.filter((s) => s.hasRows);
  const chosen =
    (stageId && withRows.find((s) => s.id === stageId)) ||
    withRows[withRows.length - 1] ||
    null;

  if (!chosen) return { countries: [], stage: null };

  const customByCode = new Map(
    (snapshot.customEntriesUsed ?? []).map((e) => [e.code, e]),
  );

  const countries: Country[] = byStage[chosen.id].map((item) => {
    const common = ALL_COUNTRIES.find((c) => c.code === item.code);
    const custom = customByCode.get(item.code);
    const jury = item.juryPoints ?? 0;
    const tele = item.televotePoints ?? 0;

    return {
      name: custom?.name ?? common?.name ?? item.code,
      code: item.code,
      flag: custom?.flag,
      juryPoints: jury,
      televotePoints: tele,
      points: jury + tele,
      lastReceivedPoints: null,
      isVotingFinished: true,
    };
  });

  countries.sort((a, b) => b.points - a.points);

  return { countries, stage: chosen };
}
