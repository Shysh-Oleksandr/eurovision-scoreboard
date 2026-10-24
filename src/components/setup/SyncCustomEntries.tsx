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
      const userCustomEntries: BaseCountry[] = customEntries.map((entry) => ({
        name: entry.name || 'Custom',
        code: `custom-${entry._id}`,
        category: 'Custom',
        flag: entry.flagUrl,
        updatedAt: entry.updatedAt,
        groupId: entry.groupId ?? undefined,
      }));
      const ownCodes = new Set(userCustomEntries.map((c) => c.code));

      // A loaded contest lists every custom entry it uses, the user's own
      // included. Those stay regular custom entries: showing them as Imported
      // hid them from Custom and offered to save them again as duplicates.
      const customCountries = [
        ...userCustomEntries,
        ...importedCustomEntries.filter((c) => !ownCodes.has(c.code)),
      ];

      useCountriesStore.setState({ customCountries });
    } else {
      // User is not authenticated or has no entries
      useCountriesStore.setState({ customCountries: importedCustomEntries });
    }
  }, [customEntries, user, importedCustomEntries]);

  return null;
};
