import { ALL_COUNTRIES } from '@/data/countries/common-countries';
import { sanitizeEntryOverrides } from '@/data/countries/entryOverrides';
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
 * keep the name and flag the contest stored for them, and standard countries
 * the contest's own name and flag (`setup.entryOverrides`).
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
  const overrides = sanitizeEntryOverrides(snapshot.setup.entryOverrides);

  const countries: Country[] = byStage[chosen.id].map((item) => {
    const common = ALL_COUNTRIES.find((c) => c.code === item.code);
    const custom = customByCode.get(item.code);
    const override = common ? overrides[item.code] : undefined;
    const jury = item.juryPoints ?? 0;
    const tele = item.televotePoints ?? 0;

    return {
      name: custom?.name ?? override?.name ?? common?.name ?? item.code,
      code: item.code,
      flag: custom?.flag ?? override?.flag,
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

/**
 * Every country taking part in a saved contest (the union of its stages'
 * line-ups), named and flagged the way the contest shows them.
 */
export function resolveSnapshotParticipants(
  snapshot: ContestSnapshot,
): { code: string; name: string; flag?: string }[] {
  const customByCode = new Map(
    (snapshot.customEntriesUsed ?? []).map((e) => [e.code, e]),
  );
  const overrides = sanitizeEntryOverrides(snapshot.setup.entryOverrides);
  const codes = new Set(
    snapshot.setup.stages.flatMap((stage) => stage.participants ?? []),
  );

  return [...codes].map((code) => {
    const common = ALL_COUNTRIES.find((c) => c.code === code);
    const custom = customByCode.get(code);
    const override = common ? overrides[code] : undefined;
    const flag = custom?.flag ?? override?.flag;

    return {
      code,
      name: custom?.name ?? override?.name ?? common?.name ?? code,
      ...(flag ? { flag } : {}),
    };
  });
}
