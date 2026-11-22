import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { render } from '@testing-library/react';

import DouzeRowOverlay from './DouzeRowOverlay';
import type { DouzeAnimationSpec } from './model';
import { getDouzeSpec } from './registry';

const played = vi.hoisted(() => [] as DouzeAnimationSpec[]);

vi.mock('./DouzeSpecPlayer', () => ({
  default: ({ spec }: { spec: DouzeAnimationSpec }) => {
    played.push(spec);

    return null;
  },
}));
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock('@/hooks/useIsLowPerfDevice', () => ({
  useIsLowPerfDevice: () => false,
}));
vi.mock('@/native/haptics', () => ({ playHaptic: vi.fn() }));
vi.mock('@/theme/playThemeSound', () => ({ playThemeSound: vi.fn() }));

describe('DouzeRowOverlay', () => {
  it('plays the spec it was mounted with, whatever the options become', () => {
    // The theme editor's overlay outlives its run; an option change used
    // to restart it at once, before the preview's replay played it again.
    const { rerender } = render(
      <DouzeRowOverlay mode="year2023" pointsAmount={12} isThemePreview />,
    );

    rerender(
      <DouzeRowOverlay
        mode="year2023"
        options={{ speed: 2, off: ['flashText'] }}
        pointsAmount={12}
        isThemePreview
      />,
    );

    expect(new Set(played)).toEqual(new Set([getDouzeSpec('year2023')]));
  });
});
