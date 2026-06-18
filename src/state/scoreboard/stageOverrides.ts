import { EventStage, PointsItem } from '@/models';
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
