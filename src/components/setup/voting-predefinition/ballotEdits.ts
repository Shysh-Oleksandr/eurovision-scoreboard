import type { PointsItem } from '@/models';
import type { Vote } from '@/state/scoreboard/types';

/**
 * Edits to one voter's ballot in the Detailed matrix: typing a number into a
 * cell, picking a value in the points bar, giving the next value in "whole
 * vote" mode. Pure: each takes the ballot and returns the new one plus what
 * happened, so the bar can say it ("Moved 12 points from Norway") instead of
 * the cell silently changing or emptying.
 *
 * A ballot is the voter's `Vote[]` in one channel. Each points slot is an id
 * (`pointsId`), so a system may hold the same value twice (two 6s).
 */

export type CellOutcome =
  /** The cell now holds the new points. */
  | { kind: 'set' }
  /** The cell is empty now. */
  | { kind: 'cleared' }
  /** Nothing changed (same value, or nothing to clear). */
  | { kind: 'unchanged' }
  /** The value was taken from another recipient of the same voter. */
  | { kind: 'moved'; from: string; points: number }
  /** The typed text isn't a value of the points system; the cell is kept. */
  | { kind: 'notInSystem'; raw: string }
  /**
   * Several points per entry: no free points add up to the typed total; the
   * cell is kept.
   */
  | { kind: 'unreachable'; value: number };

export type BallotEdit = { ballot: Vote[]; outcome: CellOutcome };

const toVote = (countryCode: string, item: PointsItem): Vote => ({
  countryCode,
  points: item.value,
  pointsId: item.id,
  showDouzePointsAnimation: !!item.showDouzePoints,
});

const unchanged = (ballot: Vote[]): BallotEdit => ({
  ballot,
  outcome: { kind: 'unchanged' },
});

/** The points `participant` gets from this ballot (a sum with several per entry). */
export const cellTotal = (ballot: readonly Vote[], participant: string) =>
  ballot.reduce(
    (sum, vote) => (vote.countryCode === participant ? sum + vote.points : sum),
    0,
  );

/** The system's slots, top value first (ties keep the system's order). */
export const pointsDesc = (pointsSystem: readonly PointsItem[]) =>
  pointsSystem
    .map((item, index) => ({ item, index }))
    .sort((a, b) => b.item.value - a.item.value || a.index - b.index)
    .map(({ item }) => item);

/** The highest-value slot nobody has yet, or null when every slot is given. */
export const nextFreePoint = (
  ballot: readonly Vote[],
  pointsSystem: readonly PointsItem[],
): PointsItem | null => {
  const used = new Set(ballot.map((vote) => vote.pointsId));

  return pointsDesc(pointsSystem).find((item) => !used.has(item.id)) ?? null;
};

/** Every slot given exactly once, nothing else: the save-valid ballot. */
export const isBallotComplete = (
  ballot: readonly Vote[],
  pointsSystem: readonly PointsItem[],
) => {
  const ids = ballot.map((vote) => vote.pointsId);

  return (
    ids.length === pointsSystem.length &&
    new Set(ids).size === ids.length &&
    pointsSystem.every((item) => ids.includes(item.id))
  );
};

export type BallotChip = {
  item: PointsItem;
  /** Who has this slot, if anyone. */
  holder: string | null;
};

/** The points bar's chips: every slot, top value first, with its holder. */
export const ballotChips = (
  ballot: readonly Vote[],
  pointsSystem: readonly PointsItem[],
): BallotChip[] => {
  const holderById = new Map<number, string>();

  ballot.forEach((vote) => {
    if (!holderById.has(vote.pointsId)) {
      holderById.set(vote.pointsId, vote.countryCode);
    }
  });

  return pointsDesc(pointsSystem).map((item) => ({
    item,
    holder: holderById.get(item.id) ?? null,
  }));
};

/**
 * Free slots adding up to `target` exactly, highest values first; null when
 * none do. A depth-first search rather than a greedy pass: with 10, 8 and 7
 * left, 15 is 8 + 7 even though 10 comes first.
 */
const findSubsetSum = (
  items: readonly PointsItem[],
  target: number,
): PointsItem[] | null => {
  const sorted = pointsDesc(items).filter((item) => item.value > 0);
  const failed = new Set<string>();

  const search = (start: number, remaining: number): PointsItem[] | null => {
    if (remaining === 0) return [];

    const key = `${start}:${remaining}`;

    if (failed.has(key)) return null;

    for (let i = start; i < sorted.length; i += 1) {
      if (sorted[i].value <= remaining) {
        const rest = search(i + 1, remaining - sorted[i].value);

        if (rest) return [sorted[i], ...rest];
      }
    }

    failed.add(key);

    return null;
  };

  return search(0, target);
};

/**
 * Typing `raw` into the cell of `participant`. With one value per entry, a
 * value the voter already gave someone else moves from them; with several
 * per entry (`multiple`), the number is the cell's total, made of free slots.
 * Blank or 0 empties the cell; anything that isn't a points value leaves it
 * as it was.
 */
export const typeCellValue = (
  ballot: readonly Vote[],
  participant: string,
  raw: string,
  pointsSystem: readonly PointsItem[],
  multiple = false,
): BallotEdit => {
  const text = raw.trim();
  const current = cellTotal(ballot, participant);
  const others = ballot.filter((vote) => vote.countryCode !== participant);

  if (text === '' || Number(text) === 0) {
    return current === 0 && others.length === ballot.length
      ? unchanged([...ballot])
      : { ballot: others, outcome: { kind: 'cleared' } };
  }

  const value = Number(text);

  if (!Number.isFinite(value) || value < 0) {
    return { ballot: [...ballot], outcome: { kind: 'notInSystem', raw: text } };
  }

  if (value === current) return unchanged([...ballot]);

  if (multiple) {
    const used = new Set(others.map((vote) => vote.pointsId));
    const free = pointsSystem.filter((item) => !used.has(item.id));
    const chosen = findSubsetSum(free, value);

    if (!chosen) {
      return { ballot: [...ballot], outcome: { kind: 'unreachable', value } };
    }

    return {
      ballot: [...others, ...chosen.map((item) => toVote(participant, item))],
      outcome: { kind: 'set' },
    };
  }

  const matching = pointsSystem.filter((item) => item.value === value);

  if (matching.length === 0) {
    return { ballot: [...ballot], outcome: { kind: 'notInSystem', raw: text } };
  }

  const usedByOthers = new Set(others.map((vote) => vote.pointsId));
  const free = matching.find((item) => !usedByOthers.has(item.id));

  if (free) {
    return {
      ballot: [...others, toVote(participant, free)],
      outcome: { kind: 'set' },
    };
  }

  // Every slot of this value is someone else's: take the first one.
  const donor = others.find((vote) =>
    matching.some((item) => item.id === vote.pointsId),
  )!;
  const item = matching.find((point) => point.id === donor.pointsId)!;

  return {
    ballot: [
      ...others.filter((vote) => vote !== donor),
      toVote(participant, item),
    ],
    outcome: { kind: 'moved', from: donor.countryCode, points: item.value },
  };
};

/**
 * Picking a slot in the points bar for `participant`'s cell. A slot the cell
 * already holds is taken back (a toggle); a slot someone else holds moves
 * here. With one value per entry the cell's previous slot is freed; with
 * several per entry the slot is added to what the cell has.
 */
export const pickCellPoint = (
  ballot: readonly Vote[],
  participant: string,
  pointsId: number,
  pointsSystem: readonly PointsItem[],
  multiple = false,
): BallotEdit => {
  const item = pointsSystem.find((point) => point.id === pointsId);

  if (!item) return unchanged([...ballot]);

  const holder = ballot.find((vote) => vote.pointsId === pointsId);

  if (holder?.countryCode === participant) {
    const next = ballot.filter((vote) => vote !== holder);

    return {
      ballot: next,
      outcome:
        cellTotal(next, participant) === 0
          ? { kind: 'cleared' }
          : { kind: 'set' },
    };
  }

  const next = ballot.filter(
    (vote) => vote !== holder && (multiple || vote.countryCode !== participant),
  );

  next.push(toVote(participant, item));

  return {
    ballot: next,
    outcome: holder
      ? { kind: 'moved', from: holder.countryCode, points: item.value }
      : { kind: 'set' },
  };
};

/** Empties `participant`'s cell. */
export const clearCell = (
  ballot: readonly Vote[],
  participant: string,
): BallotEdit => {
  const next = ballot.filter((vote) => vote.countryCode !== participant);

  return next.length === ballot.length
    ? unchanged([...ballot])
    : { ballot: next, outcome: { kind: 'cleared' } };
};

/**
 * "Whole vote" mode: a tap on `participant` gives the next value, the top
 * free one unless `preferredId` names another free slot. With one value per
 * entry, tapping a row that already has points from this voter takes them
 * back, so a second tap undoes the first. A complete ballot is unchanged.
 */
export const giveNextPoint = (
  ballot: readonly Vote[],
  participant: string,
  pointsSystem: readonly PointsItem[],
  multiple = false,
  preferredId: number | null = null,
): BallotEdit => {
  if (!multiple && cellTotal(ballot, participant) > 0) {
    return clearCell(ballot, participant);
  }

  const used = new Set(ballot.map((vote) => vote.pointsId));
  const preferred =
    preferredId !== null && !used.has(preferredId)
      ? pointsSystem.find((item) => item.id === preferredId) ?? null
      : null;
  const item = preferred ?? nextFreePoint(ballot, pointsSystem);

  if (!item) return unchanged([...ballot]);

  return {
    ballot: [...ballot, toVote(participant, item)],
    outcome: { kind: 'set' },
  };
};
