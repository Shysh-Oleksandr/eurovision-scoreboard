import { useEffect } from 'react';

import { useMyCustomEntriesQuery } from '@/api/customEntries';
import { BaseCountry } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';

/**
 * Syncs custom entries from React Query to Zustand store.
 * This component doesn't render anything but keeps the Zustand store
 * synchronized with the React Query cache.
 */
export const SyncCustomEntries: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const { data: customEntries } = useMyCustomEntriesQuery(!!user);
  const importedCustomEntries = useGeneralStore((s) => s.importedCustomEntries);

  useEffect(() => {
    if (customEntries) {
      const userCustomEntries: BaseCountry[] = customEntries
        .map((entry) => ({
          name: entry.name || 'Custom',
          code: `custom-${entry._id}`,
          category: 'Custom',
          flag: entry.flagUrl,
          updatedAt: entry.updatedAt,
        }))
        .filter((c) => !importedCustomEntries.some((i) => i.code === c.code));

      const customCountries = [...userCustomEntries, ...importedCustomEntries];

      useCountriesStore.setState({ customCountries });
    } else {
      // User is not authenticated or has no entries
      useCountriesStore.setState({ customCountries: importedCustomEntries });
    }
  }, [customEntries, user, importedCustomEntries]);

  return null;
};
