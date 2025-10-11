import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import Button from '../common/Button';

import {
  useCreateCustomEntryMutation,
  useUploadCustomEntryFlagMutation,
} from '@/api/customEntries';
import GoogleIcon from '@/assets/icons/GoogleIcon';
import { TrashIcon } from '@/assets/icons/TrashIcon';
import { getFlagPath } from '@/helpers/getFlagPath';
import {
  getCustomCountries,
  deleteCustomCountryFromDB,
  deleteAllCustomCountriesFromDB,
} from '@/helpers/indexedDB';
import { BaseCountry } from '@/models';
import { useAuthStore } from '@/state/useAuthStore';

export const CustomEntriesMigration: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = !!user;
  const login = useAuthStore((s) => s.login);
  const [localEntries, setLocalEntries] = useState<BaseCountry[]>([]);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isMigrated, setIsMigrated] = useState(false);

  const { mutateAsync: createEntry } = useCreateCustomEntryMutation();
  const { mutateAsync: uploadFlag } = useUploadCustomEntryFlagMutation();

  useEffect(() => {
    const checkIndexedDB = async () => {
      const entries = await getCustomCountries();

      setLocalEntries(entries);
    };

    checkIndexedDB();
  }, [isAuthenticated]);

  const handleMigration = async () => {
    if (!isAuthenticated) {
      toast('Please sign in to migrate your custom entries.', {
        type: 'error',
      });

      return;
    }

    setIsMigrating(true);

    try {
      const entries = localEntries;
      let uploadedCount = 0;
      let skippedCount = 0;
      const entriesToDelete: string[] = [];

      for (const entry of entries) {
        try {
          let flagUrl = entry.flag;
          let needsFileUpload = false;
          let fileToUpload: File | null = null;

          // Check if flag is a base64 string
          if (flagUrl && flagUrl.startsWith('data:image')) {
            const sizeInBytes = (flagUrl.length * 3) / 4;
            const sizeInMB = sizeInBytes / (1024 * 1024);

            if (sizeInMB > 1) {
              skippedCount += 1;
              toast(`Skipped "${entry.name}" - flag image is larger than 1MB`, {
                type: 'warning',
                autoClose: 7000,
              });
              continue;
            }

            // Convert base64 to file
            const response = await fetch(flagUrl);
            const blob = await response.blob();

            fileToUpload = new File([blob], 'flag.png', { type: blob.type });
            needsFileUpload = true;
            flagUrl = ''; // Don't send base64 to backend
          }

          // Create entry
          const newEntry = await createEntry({
            name: entry.name,
            flagUrl: flagUrl || '',
          });

          // Upload file if needed
          if (needsFileUpload && fileToUpload) {
            await uploadFlag({ id: newEntry._id, file: fileToUpload });
          }

          uploadedCount += 1;
          entriesToDelete.push(entry.code);
        } catch (error) {
          console.error(`Failed to migrate entry "${entry.name}":`, error);
          skippedCount += 1;
        }
      }

      // Delete successfully uploaded entries from IndexedDB
      for (const code of entriesToDelete) {
        await deleteCustomCountryFromDB(code);
      }

      // If all entries were uploaded, set migration flag
      if (skippedCount === 0) {
        setIsMigrated(true);
        setLocalEntries([]);
      } else {
        // Still have entries left to migrate (skipped ones)
        const remainingEntries = await getCustomCountries();

        setLocalEntries(remainingEntries);
      }

      toast(
        `Migration complete! Uploaded ${uploadedCount} entries${
          skippedCount > 0 ? `, skipped ${skippedCount}` : ''
        }.`,
        { type: 'success', autoClose: 5000 },
      );
    } catch (error) {
      toast('Migration failed. Please try again.', { type: 'error' });
      console.error('Migration error:', error);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDeleteEntry = async (code: string) => {
    await deleteCustomCountryFromDB(code);
    setLocalEntries(localEntries.filter((entry) => entry.code !== code));
    toast('Entry deleted.', { type: 'success' });
  };

  const handleDelete = async () => {
    if (
      confirm(
        'Are you sure you want to delete all custom entries? This action cannot be undone.',
      )
    ) {
      await deleteAllCustomCountriesFromDB();
      setLocalEntries([]);
      toast('All custom entries deleted.', { type: 'success' });
    }
  };

  const hasLocalEntries = localEntries.length > 0;

  const localEntriesList = () => (
    <ul className="text-white/80 text-sm space-y-1">
      {localEntries.map((entry) => (
        <li key={entry.code} className="flex items-center gap-2">
          •{' '}
          <img
            src={getFlagPath(entry)}
            width={24}
            height={16}
            alt={entry.name}
            loading="lazy"
            className="rounded-sm w-6 h-4 object-cover"
          />{' '}
          <span title={entry.name}>{entry.name}</span>
          <button
            onClick={() => handleDeleteEntry(entry.code)}
            className="pr-1"
          >
            <TrashIcon className="w-4 h-4 text-red-300" />
          </button>
        </li>
      ))}
    </ul>
  );

  if (!hasLocalEntries || (isAuthenticated && isMigrated)) {
    return null;
  }

  // Unauthenticated user with local entries
  if (!isAuthenticated) {
    return (
      <div className="bg-red-900/30 border border-red-500/50 rounded-md p-4 mb-4">
        <h3 className="text-white font-semibold mb-2">
          Legacy Local Custom Entries Detected
        </h3>
        <p className="text-white/80 text-sm mb-3">
          You have {localEntries.length} custom{' '}
          {localEntries.length === 1 ? 'entry' : 'entries'} stored locally from
          a previous version. Custom entries now require an account and are
          saved to the cloud.
        </p>
        <div className="bg-black/20 rounded p-3 mb-3 max-h-32 overflow-y-auto">
          <p className="text-white/60 text-xs mb-2">
            Your local entries (click to delete for those you don't want to
            keep):
          </p>
          {localEntriesList()}
        </div>
        <p className="text-red-300 text-xs mb-3">
          ⚠️ These entries will be permanently removed on 19 October 2025.
        </p>
        <div className="flex gap-2 items-center flex-wrap">
          <Button
            variant="tertiary"
            onClick={login}
            className="!px-4 !py-2 !text-sm"
            Icon={<GoogleIcon className="w-5 h-5 flex-none" />}
          >
            Sign In to Migrate
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="!px-4 !py-2 !text-sm"
          >
            Delete All
          </Button>
        </div>
      </div>
    );
  }

  // Authenticated user with local entries to migrate
  return (
    <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-md p-4 mb-4">
      <h3 className="text-white font-semibold mb-2">Migrate Custom Entries</h3>
      <p className="text-white/80 text-sm mb-3">
        You have {localEntries.length} custom{' '}
        {localEntries.length === 1 ? 'entry' : 'entries'} stored locally. Click
        the button below to upload them to your account. Entries with flag
        images larger than 1MB will be skipped.
      </p>
      <div className="bg-black/20 rounded p-3 mb-3 max-h-32 overflow-y-auto">
        <p className="text-white/60 text-xs mb-2">
          Entries to migrate (click to delete for those you don't want to keep):
        </p>
        {localEntriesList()}
      </div>
      <p className="text-yellow-300 text-xs mb-3">
        ⚠️ Local entries will be removed on 19 October 2025. Please migrate them
        to keep them (if you need them).
      </p>
      <div className="flex gap-2 items-center flex-wrap">
        <Button
          variant="tertiary"
          onClick={handleMigration}
          disabled={isMigrating}
          className="!px-4 !py-2 !text-sm"
        >
          {isMigrating ? 'Migrating...' : 'Upload Local Entries'}
        </Button>
        <Button
          variant="destructive"
          onClick={handleDelete}
          className="!px-4 !py-2 !text-sm"
        >
          Don't Migrate, delete them
        </Button>
      </div>
    </div>
  );
};
