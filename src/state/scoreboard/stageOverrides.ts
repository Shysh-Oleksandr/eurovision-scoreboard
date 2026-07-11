import { EventStage, PointsItem } from '@/models';
import type { CountryOdds } from '@/state/countriesStore';
import { GeneralState } from '@/state/generalStore';

export interface ResolvedPointsSystem {
  pointsSystem: PointsItem[];
  televotePointsSystem: PointsItem[];
  splitPointsSystem: boolean;
  allowMultiplePointsToSameEntry: boolean;
}

export const resolveStagePointsSystem = (
  stage: EventStage | undefined,
  general: Pick<
    GeneralState,
    'pointsSystem' | 'televotePointsSystem' | 'settings'
  >,
): ResolvedPointsSystem => {
  const o = stage?.overrides?.pointsSystem;

  if (o) {
    return {
      pointsSystem: o.pointsSystem,
      televotePointsSystem: o.splitPointsSystem
        ? o.televotePointsSystem
        : o.pointsSystem,
      splitPointsSystem: o.splitPointsSystem,
      allowMultiplePointsToSameEntry: o.allowMultiplePointsToSameEntry,
    };
  }

  const { splitPointsSystem, allowMultiplePointsToSameEntry } =
    general.settings;

  return {
    pointsSystem: general.pointsSystem,
    televotePointsSystem: splitPointsSystem
      ? general.televotePointsSystem
      : general.pointsSystem,
    splitPointsSystem,
    allowMultiplePointsToSameEntry,
  };
};

export interface ResolvedStageOdds {
  countryOdds: CountryOdds;
  randomnessLevel: number;
  pointsSpread: number;
}

/**
 * Resolves the odds configuration a stage uses during simulation. When the stage
 * carries an `odds` override, its per-country odds are merged over the global map
 * (override wins for the stage's countries) and its randomness/spread replace the
 * globals. Otherwise the passed-in globals are returned unchanged.
 */
export const resolveStageOdds = (
  stage: EventStage | undefined,
  globals: {
    countryOdds: CountryOdds;
    randomnessLevel: number;
    pointsSpread: number;
  },
): ResolvedStageOdds => {
  const o = stage?.overrides?.odds;

  if (o) {
    return {
      countryOdds: { ...globals.countryOdds, ...o.countryOdds },
      randomnessLevel: o.randomnessLevel,
      pointsSpread: o.pointsSpread,
    };
  }

  return globals;
};
