import { ListId, parseListId, POOL_ROOT_LIST, UNGROUPED_ID } from '../listIds';

import { CountryAssignmentGroup } from '@/models';

export interface ParsedDrop {
  /** Assignment group the drop resolves to. */
  group: string;
  /** Custom-entry group to regroup into (null = ungrouped); undefined when the zone is not a custom group. */
  customGroupId?: string | null;
  listId: ListId;
}

/** Drop-zone ids are the ListIds of the lists they contain. */
export const parseDrop = (id: string): ParsedDrop | null => {
  let parsed: ReturnType<typeof parseListId>;

  try {
    parsed = parseListId(id);
  } catch {
    return null;
  }

  switch (parsed.kind) {
    case 'stage':
      return { group: parsed.stageId, listId: id };
    case 'notQualified':
      return { group: CountryAssignmentGroup.NOT_QUALIFIED, listId: id };
    case 'poolRoot':
      return { group: CountryAssignmentGroup.NOT_PARTICIPATING, listId: id };
    case 'pool':
      return {
        group: CountryAssignmentGroup.NOT_PARTICIPATING,
        listId: id,
        ...(parsed.groupId !== undefined
          ? {
              customGroupId:
                parsed.groupId === UNGROUPED_ID ? null : parsed.groupId,
            }
          : {}),
      };
    default:
      return null;
  }
};

/**
 * Custom groups only accept custom entries — any other tile would just land
 * back in its own category. Every other zone accepts any tile.
 */
export const acceptsDrop = (
  id: string,
  homeCategories: ReadonlySet<string>,
): boolean => {
  let parsed: ReturnType<typeof parseListId>;

  try {
    parsed = parseListId(id);
  } catch {
    return true;
  }

  return (
    parsed.kind !== 'pool' ||
    parsed.groupId === undefined ||
    homeCategories.has(parsed.category)
  );
};

/**
 * The zone that lights up while `overId` is the drop target. A country can't
 * be re-categorised, so hovering a pool category highlights the whole pool.
 */
export const highlightedZone = (overId: string): string => {
  let parsed: ReturnType<typeof parseListId>;

  try {
    parsed = parseListId(overId);
  } catch {
    return overId;
  }

  return parsed.kind === 'pool' && parsed.groupId === undefined
    ? POOL_ROOT_LIST
    : overId;
};

/** Nesting depth so the innermost zone under the pointer wins (group > category > pool; stages = 1). */
export const dropDepth = (id: string): number => {
  if (id === 'pool') return 0;

  return id.split(':').length;
};
