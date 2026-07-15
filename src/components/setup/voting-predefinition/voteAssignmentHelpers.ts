import type { PointsItem } from '@/state/generalStore';
import type { Vote } from '@/state/scoreboard/types';

/**
 * Assign distinct point ids from current points system matching each vote's point value.
 */
export function assignPointIdsForVoter(
  votes: { countryCode: string; points: number }[],
  pointsSystem: PointsItem[],
): Vote[] {
  const usedIds = new Set<number>();
  const idsByValue = new Map<number, number[]>();
  for (const p of pointsSystem) {
    if (!idsByValue.has(p.value)) idsByValue.set(p.value, []);
    idsByValue.get(p.value)!.push(p.id);
  }

  const result: Vote[] = [];
  for (const v of votes) {
    const candidates = idsByValue.get(v.points);
    if (!candidates?.length) continue;
    const id = candidates.find((cid) => !usedIds.has(cid));
    if (id === undefined) continue;
    usedIds.add(id);
    const p = pointsSystem.find((x) => x.id === id)!;
    result.push({
      countryCode: v.countryCode,
      points: v.points,
      pointsId: id,
      showDouzePointsAnimation: p.showDouzePoints ?? v.points === 12,
    });
  }
  return result;
}
