import { buildContestSnapshotFromStores } from './contestSnapshot';

import type { ContestType } from '@/data/contestTypes';
import { useGeneralStore } from '@/state/generalStore';

/** Deterministic JSON: object keys sorted recursively, arrays kept in order. */
export const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
    .join(',')}}`;
};

export interface ContestSetupFingerprintInput {
  /** The `setup` section of a contest snapshot (see `buildContestSnapshotFromStores`). */
  setup: Record<string, unknown>;
  generalInfo: {
    contestName: string;
    contestDescription: string;
    contestYear: string;
    hostingCountryCode: string | undefined;
    contestType: ContestType;
  };
}

/**
 * Fingerprint of everything the Event Setup can change on a contest: stages
 * (sorted by order) with their participants/voters/overrides, points systems,
 * odds (sorted by code) and the general info. Simulation state is excluded.
 */
export const contestSetupFingerprint = ({
  setup,
  generalInfo,
}: ContestSetupFingerprintInput): string => {
  const stages = Array.isArray(setup.stages)
    ? [...(setup.stages as Array<{ order?: number }>)].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      )
    : [];
  const countryOdds = Array.isArray(setup.countryOdds)
    ? [...(setup.countryOdds as Array<[string, number, number]>)].sort(
        ([a], [b]) => a.localeCompare(b),
      )
    : undefined;

  return stableStringify({
    setup: { ...setup, stages, countryOdds },
    generalInfo,
  });
};

/** Fingerprint of the current stores (what a Save would persist). */
export const computeCurrentSetupFingerprint = (): string => {
  const { setup } = buildContestSnapshotFromStores();
  const { settings } = useGeneralStore.getState();

  return contestSetupFingerprint({
    setup,
    generalInfo: {
      contestName: settings.contestName,
      contestDescription: settings.contestDescription,
      contestYear: settings.contestYear,
      hostingCountryCode: settings.hostingCountryCode,
      contestType: settings.contestType,
    },
  });
};

/**
 * Record the current setup as the saved baseline. Call right after a contest
 * snapshot has been applied to the stores or saved from them.
 */
export const markContestSetupClean = (): void => {
  useGeneralStore.setState({
    loadedContestFingerprint: computeCurrentSetupFingerprint(),
  });
};
