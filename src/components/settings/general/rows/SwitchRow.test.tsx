import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { SwitchItem } from '../model/types';

import { SwitchRow } from './SwitchRow';

import { useGeneralStore } from '@/state/generalStore';

vi.mock('next-intl', () => {
  const t = (key: string) => key;

  (t as unknown as { rich: (key: string) => string }).rich = (key: string) =>
    key;

  return { useTranslations: () => t };
});

const item: SwitchItem = {
  kind: 'switch',
  id: 'alwaysShowRankings',
  settingKey: 'alwaysShowRankings',
  labelKey: 'settings.ui.alwaysShowRankings',
};

afterEach(cleanup);

describe('SwitchRow', () => {
  it('reflects the store value and toggles it through setSettings', async () => {
    const user = userEvent.setup();

    useGeneralStore.getState().setSettings({ alwaysShowRankings: true });

    render(<SwitchRow item={item} />);

    const toggle = screen.getByRole('switch');

    expect(toggle).toHaveAttribute('aria-checked', 'true');

    await user.click(toggle);

    expect(useGeneralStore.getState().settings.alwaysShowRankings).toBe(false);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });
});
