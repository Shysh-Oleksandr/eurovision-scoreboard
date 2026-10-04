import { beforeEach, describe, expect, it } from 'vitest';

import {
  NOT_QUALIFIED_LIST,
  parseListId,
  POOL_ROOT_LIST,
  poolList,
  stageList,
  TO_BE_DRAWN_LIST,
  UNGROUPED_ID,
} from '../lineup/listIds';

import { getMenuAnchor, useSetupUiStore } from './setupUiStore';

describe('useSetupUiStore', () => {
  beforeEach(() => {
    useSetupUiStore.getState().resetUi();
  });

  it('toggles selection immutably', () => {
    const { toggleSelected } = useSetupUiStore.getState();
    const before = useSetupUiStore.getState().selected;

    toggleSelected('SE');

    const afterAdd = useSetupUiStore.getState().selected;

    expect(afterAdd).not.toBe(before);
    expect(afterAdd.has('SE')).toBe(true);
    expect(before.has('SE')).toBe(false);

    toggleSelected('SE');

    const afterRemove = useSetupUiStore.getState().selected;

    expect(afterRemove).not.toBe(afterAdd);
    expect(afterRemove.has('SE')).toBe(false);
  });

  it('setSelectionMode(false) clears the selection', () => {
    const { setSelectionMode, setSelected } = useSetupUiStore.getState();

    setSelectionMode(true);
    setSelected(['SE', 'FI']);

    expect(useSetupUiStore.getState().selected.size).toBe(2);

    setSelectionMode(false);

    const state = useSetupUiStore.getState();

    expect(state.selectionMode).toBe(false);
    expect(state.selected.size).toBe(0);
  });

  it('setSelectionMode(true) keeps the current selection', () => {
    const { setSelectionMode, toggleSelected } = useSetupUiStore.getState();

    toggleSelected('NO');
    setSelectionMode(true);

    expect(useSetupUiStore.getState().selected.has('NO')).toBe(true);
  });

  it('toggleExpanded flips per list id', () => {
    const { toggleExpanded, setExpanded } = useSetupUiStore.getState();
    const list = stageList('sf1');

    toggleExpanded(list);
    expect(useSetupUiStore.getState().expanded[list]).toBe(true);

    toggleExpanded(list);
    expect(useSetupUiStore.getState().expanded[list]).toBe(false);

    setExpanded(list, true);
    expect(useSetupUiStore.getState().expanded[list]).toBe(true);
  });

  it('toggleExpanded collapses a list that is open by default on the first toggle', () => {
    const { toggleExpanded } = useSetupUiStore.getState();
    const list = stageList('gf');

    toggleExpanded(list, true);
    expect(useSetupUiStore.getState().expanded[list]).toBe(false);

    toggleExpanded(list, true);
    expect(useSetupUiStore.getState().expanded[list]).toBe(true);
  });

  it('keeps the menu anchor out of the store state', () => {
    const { openMenu, closeMenu } = useSetupUiStore.getState();
    const anchor = document.createElement('button');

    openMenu({ kind: 'moveAll', listId: stageList('sf1') }, anchor);

    const state = useSetupUiStore.getState();

    expect(state.activeMenu).toEqual({
      kind: 'moveAll',
      listId: stageList('sf1'),
    });
    expect(Object.values(state.activeMenu ?? {})).not.toContain(anchor);
    expect(getMenuAnchor()).toBe(anchor);

    closeMenu();
    expect(useSetupUiStore.getState().activeMenu).toBeNull();
    expect(getMenuAnchor()).toBeNull();
  });

  it('closes the menu when reopened from the same anchor', () => {
    const { openMenu } = useSetupUiStore.getState();
    const anchor = document.createElement('button');
    const other = document.createElement('button');

    openMenu({ kind: 'tile', code: 'DK', listId: stageList('sf1') }, anchor);
    openMenu({ kind: 'tile', code: 'SE', listId: stageList('sf1') }, other);
    expect(useSetupUiStore.getState().activeMenu).toMatchObject({
      code: 'SE',
    });
    expect(getMenuAnchor()).toBe(other);

    openMenu({ kind: 'tile', code: 'SE', listId: stageList('sf1') }, other);
    expect(useSetupUiStore.getState().activeMenu).toBeNull();
    expect(getMenuAnchor()).toBeNull();
  });

  it('resetUi restores the initial state', () => {
    const state = useSetupUiStore.getState();
    const anchor = document.createElement('button');

    state.setSelectionMode(true);
    state.toggleSelected('DK');
    state.setPoolOpen(true);
    state.setSearch('den');
    state.setDragging('DK');
    state.openMenu({ kind: 'tray' }, anchor);

    state.resetUi();

    const reset = useSetupUiStore.getState();

    expect(reset.selectionMode).toBe(false);
    expect(reset.selected.size).toBe(0);
    expect(reset.poolOpen).toBe(false);
    expect(reset.search).toBe('');
    expect(reset.draggingCode).toBeNull();
    expect(reset.activeMenu).toBeNull();
    expect(getMenuAnchor()).toBeNull();
    expect(reset.expanded).toEqual({});
  });
});

describe('listIds', () => {
  it('round-trips stage ids', () => {
    expect(parseListId(stageList('gf'))).toEqual({
      kind: 'stage',
      stageId: 'gf',
    });
  });

  it('parses the fixed ids', () => {
    expect(parseListId(NOT_QUALIFIED_LIST)).toEqual({ kind: 'notQualified' });
    expect(parseListId(TO_BE_DRAWN_LIST)).toEqual({ kind: 'toBeDrawn' });
    expect(parseListId(POOL_ROOT_LIST)).toEqual({ kind: 'poolRoot' });
  });

  it('round-trips pool category ids without a group', () => {
    expect(parseListId(poolList('Europe'))).toEqual({
      kind: 'pool',
      category: 'Europe',
    });
    expect(parseListId(poolList('Europe'))).not.toHaveProperty('groupId');
  });

  it('round-trips custom-group ids and keeps the ungrouped sentinel literal', () => {
    expect(parseListId(poolList('Custom', 'abc123'))).toEqual({
      kind: 'pool',
      category: 'Custom',
      groupId: 'abc123',
    });
    expect(poolList('Custom', null)).toBe(`pool:Custom:${UNGROUPED_ID}`);
    expect(parseListId(poolList('Custom', null))).toEqual({
      kind: 'pool',
      category: 'Custom',
      groupId: UNGROUPED_ID,
    });
  });

  it('throws on unknown ids', () => {
    expect(() => parseListId('nope:x')).toThrow();
  });
});
