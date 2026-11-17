import { describe, expect, it } from 'vitest';

import {
  assignBinding,
  getActionForBinding,
  getBinding,
  resetBinding,
  SHORTCUT_ACTIONS,
} from './actions';

describe('the default keys', () => {
  it('give every key to one action at most', () => {
    const keys = SHORTCUT_ACTIONS.map((action) => action.defaultBinding).filter(
      Boolean,
    );

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('find actions by key', () => {
    expect(getActionForBinding('Space', {})).toBe('random');
    expect(getActionForBinding('Mod+Z', undefined)).toBe('undo');
    expect(getActionForBinding('Q', {})).toBeNull();
  });
});

describe('assignBinding', () => {
  it('moves a key that is in use and reports who lost it', () => {
    const { overrides, displaced } = assignBinding({}, 'random', 'R');

    expect(displaced).toEqual(['restart']);
    expect(getBinding('random', overrides)).toBe('R');
    expect(getBinding('restart', overrides)).toBeNull();
    expect(getActionForBinding('R', overrides)).toBe('random');
    expect(getActionForBinding('Space', overrides)).toBeNull();
  });

  it('stores only what differs from the defaults', () => {
    const moved = assignBinding({}, 'stats', 'I').overrides;

    expect(moved).toEqual({ stats: 'I' });
    expect(resetBinding(moved, 'stats').overrides).toEqual({});
    expect(assignBinding({}, 'share', null).overrides).toEqual({});
  });

  it('clears a key', () => {
    const { overrides, displaced } = assignBinding({}, 'undo', null);

    expect(displaced).toEqual([]);
    expect(overrides).toEqual({ undo: null });
    expect(getActionForBinding('Mod+Z', overrides)).toBeNull();
  });

  it('takes the default back from whoever holds it on reset', () => {
    const taken = assignBinding({}, 'stats', 'S').overrides;

    expect(getBinding('setup', taken)).toBeNull();

    const { overrides, displaced } = resetBinding(taken, 'setup');

    expect(displaced).toEqual(['stats']);
    expect(getBinding('setup', overrides)).toBe('S');
  });
});
