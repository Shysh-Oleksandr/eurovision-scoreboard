/**
 * Identifiers for the droppable lists in the Event Setup lineup.
 *
 * Shapes:
 * - `stage:<stageId>`                        — a contest stage
 * - `group:NOT_QUALIFIED`                    — the "Not Qualified" group
 * - `pool`                                   — the whole country pool
 * - `pool:<category>`                        — a pool category (e.g. `Custom`)
 * - `pool:Custom:<groupId|__ungrouped__>`    — a custom-entry group inside the pool
 */
export type ListId = string;

export const UNGROUPED_ID = '__ungrouped__';

export const NOT_QUALIFIED_LIST: ListId = 'group:NOT_QUALIFIED';

export const POOL_ROOT_LIST: ListId = 'pool';

export const stageList = (stageId: string): ListId => `stage:${stageId}`;

export const poolList = (category: string, groupId?: string | null): ListId =>
  groupId !== undefined
    ? `pool:${category}:${groupId ?? UNGROUPED_ID}`
    : `pool:${category}`;

export type ParsedListId =
  | { kind: 'stage'; stageId: string }
  | { kind: 'notQualified' }
  | { kind: 'poolRoot' }
  | { kind: 'pool'; category: string; groupId?: string };

export function parseListId(id: ListId): ParsedListId {
  if (id === NOT_QUALIFIED_LIST) return { kind: 'notQualified' };
  if (id === POOL_ROOT_LIST) return { kind: 'poolRoot' };

  const separator = id.indexOf(':');
  const prefix = separator === -1 ? id : id.slice(0, separator);
  const rest = separator === -1 ? '' : id.slice(separator + 1);

  if (prefix === 'stage') return { kind: 'stage', stageId: rest };

  if (prefix === 'pool') {
    const groupSeparator = rest.indexOf(':');

    if (groupSeparator === -1) return { kind: 'pool', category: rest };

    return {
      kind: 'pool',
      category: rest.slice(0, groupSeparator),
      groupId: rest.slice(groupSeparator + 1),
    };
  }

  throw new Error(`Unknown list id: ${id}`);
}
