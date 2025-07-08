/* eslint-disable no-console */
import { openDB } from 'idb';

import { BaseCountry } from '../models';

const DB_NAME = 'DouzePoints';
const STORE_NAME = 'customCountries';
const MIGRATION_FLAG = 'customCountriesMigratedToIDB';

const getDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'code' });
      }
    },
  });
};

const migrateFromLocalStorage = async () => {
  if (localStorage.getItem(MIGRATION_FLAG)) {
    return;
  }

  const oldData = localStorage.getItem('countries-storage');

  if (oldData) {
    try {
      const parsed = JSON.parse(oldData);
      const customCountries = parsed?.state?.customCountries;

      if (Array.isArray(customCountries) && customCountries.length > 0) {
        const db = await getDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        for (const country of customCountries) {
          if (country.code && country.name) {
            await store.put(country);
          }
        }
        await tx.done;
        console.log(
          'Successfully migrated custom countries from localStorage to IndexedDB.',
        );
      }
    } catch (e) {
      console.error('Failed to migrate custom countries from localStorage', e);

      return;
    }
  }

  localStorage.setItem(MIGRATION_FLAG, 'true');
};

export const saveCustomCountry = async (entry: BaseCountry) => {
  const db = await getDB();

  await db.put(STORE_NAME, entry);
};

export const getCustomCountries = async (): Promise<BaseCountry[]> => {
  await migrateFromLocalStorage();
  const db = await getDB();

  return db.getAll(STORE_NAME);
};

export const deleteCustomCountryFromDB = async (code: string) => {
  const db = await getDB();

  await db.delete(STORE_NAME, code);
};
