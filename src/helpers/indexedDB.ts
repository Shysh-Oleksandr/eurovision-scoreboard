/* eslint-disable no-console */
import { openDB } from 'idb';

import { BaseCountry } from '../models';

const DB_NAME = 'DouzePoints';
const STORE_NAME = 'customCountries';

const getDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'code' });
      }
    },
  });
};

export const saveCustomCountry = async (entry: BaseCountry) => {
  const db = await getDB();

  await db.put(STORE_NAME, entry);
};

export const getCustomCountries = async (): Promise<BaseCountry[]> => {
  const db = await getDB();

  return db.getAll(STORE_NAME);
};

export const deleteCustomCountryFromDB = async (code: string) => {
  const db = await getDB();

  await db.delete(STORE_NAME, code);
};
