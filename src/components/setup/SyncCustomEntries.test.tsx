import { describe, expect, it, vi } from 'vitest';

import { render } from '@testing-library/react';

import { SyncCustomEntries } from './SyncCustomEntries';

import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import type { CustomEntry } from '@/types/customEntry';

const ownEntries: CustomEntry[] = [
  {
    _id: 'own1',
    name: 'Ohio (renamed)',
    flagUrl: 'https://cdn.douzepoints.app/custom-entries/flags/u/ohio.png',
    userId: 'u',
    createdAt: '2026-10-09T00:00:00.000Z',
    updatedAt: '2026-10-21T00:00:00.000Z',
  },
];

vi.mock('@/api/customEntries', () => ({
  useMyCustomEntriesQuery: () => ({ data: ownEntries }),
}));

describe('SyncCustomEntries', () => {
  it("keeps the user's own entries out of a loaded contest's Imported list", () => {
    useAuthStore.setState({ user: { _id: 'u' } } as never);
    useGeneralStore.setState({
      importedCustomEntries: [
        // The loaded contest is the user's own and uses their entry...
        {
          code: 'custom-own1',
          name: 'Ohio',
          category: 'Custom',
          flag: 'https://cdn.douzepoints.app/custom-entries/flags/u/ohio.png',
          isImported: true,
        },
        // ...and someone else's entry, which stays imported.
        {
          code: 'custom-theirs1',
          name: 'Utah',
          category: 'Custom',
          flag: 'https://cdn.douzepoints.app/custom-entries/presets/world.svg',
          isImported: true,
        },
      ],
    });

    render(<SyncCustomEntries />);

    const { customCountries } = useCountriesStore.getState();

    expect(
      customCountries.map((c) => [c.code, c.name, !!c.isImported]),
    ).toEqual([
      ['custom-own1', 'Ohio (renamed)', false],
      ['custom-theirs1', 'Utah', true],
    ]);
  });
});
