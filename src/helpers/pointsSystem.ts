import { POINTS_ARRAY } from '@/data/data';
import { PointsItem } from '@/state/generalStore';

export const isDefaultPointsSystem = (pointsSystem: PointsItem[]) => {
  if (pointsSystem.length !== POINTS_ARRAY.length) return false;
  for (let i = 0; i < pointsSystem.length; i++) {
    const item = pointsSystem[i];
    if (item.id !== i) return false;
    if (item.value !== POINTS_ARRAY[i]) return false;
    if (item.showDouzePoints !== (item.value === 12)) return false;
  }
  return true;
};
