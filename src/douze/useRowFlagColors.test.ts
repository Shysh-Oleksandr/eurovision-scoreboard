import { describe, expect, it } from 'vitest';

import { renderHook } from '@testing-library/react';

import { useRowFlagColors } from './useRowFlagColors';

describe('useRowFlagColors', () => {
  const ref = { current: null };

  it('uses an entry’s chosen colours without a flag to read', () => {
    const { result } = renderHook(() =>
      useRowFlagColors(ref, true, ['#c8102e', '#000000']),
    );

    // Lifted like a flag's: black reads as dark grey on the dark rows.
    expect(result.current).toEqual(['#c8102e', '#666666']);
  });

  it('gives nothing while the option is off', () => {
    const { result } = renderHook(() =>
      useRowFlagColors(ref, false, ['#c8102e']),
    );

    expect(result.current).toBeNull();
  });
});
