import { EventStage, PointsItem } from '../../models';
import { useCountriesStore } from '../countriesStore';
import { useGeneralStore } from '../generalStore';

import { resolveStagePointsSystem } from './stageOverrides';

import { playHaptic } from '@/native/haptics';

/**
 * The award moments' haptics, called from the voting actions at the award
 * (docs/haptics.md §4). Animations that follow an award (the douze overlay,
 * the row's move) play their own cues when they start.
 */

const maxPointsValue = (pointsSystem: PointsItem[]) =>
  pointsSystem.reduce((max, item) => Math.max(max, item.value), 1);

/** One jury award: a tap graded by the points, or the douze hit. */
export function hapticJuryAward(
  points: number,
  isDouze: boolean,
  pointsSystem: PointsItem[],
): void {
  playHaptic(
    isDouze
      ? { id: 'douzeHit' }
      : { id: 'points', points, maxPoints: maxPointsValue(pointsSystem) },
  );
}

/** Several jury awards at once (grouped points, a random jury). */
export function hapticJuryAwards(
  awards: { points: number; showDouzePointsAnimation?: boolean }[],
  pointsSystem: PointsItem[],
): void {
  if (awards.length === 0) return;

  const hasDouze = awards.some((award) => award.showDouzePointsAnimation);
  const values = awards
    .filter((award) => !award.showDouzePointsAnimation)
    .map((award) => award.points);

  if (values.length === 0) {
    playHaptic({ id: 'douzeHit' });

    return;
  }
  if (values.length === 1 && !hasDouze) {
    hapticJuryAward(values[0], false, pointsSystem);

    return;
  }

  playHaptic({
    id: 'pointsFlurry',
    values,
    maxPoints: maxPointsValue(pointsSystem),
    endsWithDouze: hasDouze,
  });
}

/**
 * One country's televote: a rumble as long as the haul, measured against
 * the most it could get (every televote voter's top score); nul points get
 * their own cue.
 */
export function hapticTelevoteAward(points: number, stage: EventStage): void {
  if (points <= 0) {
    playHaptic({ id: 'nulPoints' });

    return;
  }

  const { televotePointsSystem } = resolveStagePointsSystem(
    stage,
    useGeneralStore.getState(),
  );
  const voters = useCountriesStore
    .getState()
    .getStageVotingCountries(undefined, { channel: 'televote' }).length;

  playHaptic({
    id: 'televote',
    share: points / Math.max(1, maxPointsValue(televotePointsSystem) * voters),
  });
}
