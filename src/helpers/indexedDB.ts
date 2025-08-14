/* eslint-disable no-console */
import { openDB } from 'idb';

import { BaseCountry } from '../models';

const DB_NAME = 'DouzePoints';
const STORE_NAME = 'customCountries';
const ASSETS_STORE_NAME = 'appAssets';

const getDB = async () => {
  return openDB(DB_NAME, 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'code' });
        }
      }

      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(ASSETS_STORE_NAME)) {
          db.createObjectStore(ASSETS_STORE_NAME);
        }
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

// Background image helpers
const CUSTOM_BG_KEY = 'customBgImage';

export const saveCustomBgImageToDB = async (dataUrl: string) => {
  try {
    const db = await getDB();
    await db.put(ASSETS_STORE_NAME, dataUrl, CUSTOM_BG_KEY);
  } catch (err) {
    console.error('Failed to save custom background image to IndexedDB', err);
  }
};

export const getCustomBgImageFromDB = async (): Promise<string | null> => {
  try {
    const db = await getDB();
    const value = await db.get(ASSETS_STORE_NAME, CUSTOM_BG_KEY);
    return (value as string) ?? null;
  } catch (err) {
    console.error('Failed to read custom background image from IndexedDB', err);
    return null;
  }
};

export const deleteCustomBgImageFromDB = async () => {
  try {
    const db = await getDB();
    await db.delete(ASSETS_STORE_NAME, CUSTOM_BG_KEY);
  } catch (err) {
    console.error('Failed to delete custom background image from IndexedDB', err);
  }
};
