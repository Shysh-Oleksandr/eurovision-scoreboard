/* eslint-disable no-console */
import { openDB } from 'idb';

const DB_NAME = 'DouzePoints';
const ASSETS_STORE_NAME = 'appAssets';
const PRESETS_STORE_NAME = 'presets';

const getDB = async () => {
  return openDB(DB_NAME, 3, {
    upgrade(db, oldVersion) {
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(ASSETS_STORE_NAME)) {
          db.createObjectStore(ASSETS_STORE_NAME);
        }
      }

      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains(PRESETS_STORE_NAME)) {
          db.createObjectStore(PRESETS_STORE_NAME, { keyPath: 'id' });
        }
      }
    },
  });
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
    console.error(
      'Failed to delete custom background image from IndexedDB',
      err,
    );
  }
};
