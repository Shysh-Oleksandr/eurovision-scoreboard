import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHook } from '@testing-library/react';

import { RAINBOW_CONFETTI_COLORS } from './confettiColors';
import { useConfettiColors } from './useConfettiColors';

import { useCountriesStore } from '@/state/countriesStore';

const loadFlagColors = vi.hoisted(() => vi.fn());

vi.mock('./confettiColors', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./confettiColors')>()),
  loadFlagColors,
}));

const entry = {
  code: 'custom-e1',
  name: 'Westvale',
  category: 'Custom',
  flag: 'https://cdn.douzepoints.app/custom-entries/flags/u/w.png',
};

describe('useConfettiColors', () => {
  beforeEach(() => {
    loadFlagColors.mockReset();
    loadFlagColors.mockResolvedValue(['#123456']);
  });

  it('uses a custom entry’s chosen colours for Flag, without reading it', () => {
    useCountriesStore.setState({
      customCountries: [{ ...entry, colors: ['#c8102e', '#ffffff'] }],
    } as never);

    // A line-up copy without the field still finds the entry's colours.
    const { result } = renderHook(() => useConfettiColors('flag', entry));

    expect(result.current).toEqual(['#c8102e', '#ffffff']);
    expect(loadFlagColors).not.toHaveBeenCalled();
  });

  it('reads the flag when the entry has no colours', () => {
    useCountriesStore.setState({ customCountries: [entry] } as never);

    const { result } = renderHook(() => useConfettiColors('flag', entry));

    // Waits for the flag's colours.
    expect(result.current).toBeNull();
    expect(loadFlagColors).toHaveBeenCalled();
  });

  it('leaves the other modes alone', () => {
    useCountriesStore.setState({
      customCountries: [{ ...entry, colors: ['#c8102e'] }],
    } as never);

    const { result } = renderHook(() => useConfettiColors('rainbow', entry));

    expect(result.current).toBe(RAINBOW_CONFETTI_COLORS);
  });
});
