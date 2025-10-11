import { useEffect } from 'react';

import { useMyCustomEntriesQuery } from '@/api/customEntries';
import { BaseCountry } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';
import { useAuthStore } from '@/state/useAuthStore';

/**
 * Syncs custom entries from React Query to Zustand store.
 * This component doesn't render anything but keeps the Zustand store
 * synchronized with the React Query cache.
 */
export const SyncCustomEntries: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const { data: customEntries } = useMyCustomEntriesQuery(!!user);

  useEffect(() => {
    if (customEntries) {
      const customCountries: BaseCountry[] = customEntries.map((entry) => ({
        name: entry.name,
        code: `custom-${entry._id}`,
        category: 'Custom',
        flag: entry.flagUrl,
      }));

      useCountriesStore.setState({ customCountries });
    } else {
      // User is not authenticated or has no entries
      useCountriesStore.setState({ customCountries: [] });
    }
  }, [customEntries, user]);

  return null;
};
