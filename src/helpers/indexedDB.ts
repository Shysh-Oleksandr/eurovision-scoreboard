/* eslint-disable no-console */
import { openDB } from 'idb';

const DB_NAME = 'DouzePoints';
const ASSETS_STORE_NAME = 'appAssets';
const PRESETS_STORE_NAME = 'presets';

/** Graphics studio drafts (`DesignRecord`, keyed by id) and uploaded images. */
export const GRAPHICS_DESIGNS_STORE_NAME = 'graphicsDesigns';
export const GRAPHICS_ASSETS_STORE_NAME = 'graphicsAssets';

export const getDB = async () => {
  return openDB(DB_NAME, 4, {
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

      if (oldVersion < 4) {
        if (!db.objectStoreNames.contains(GRAPHICS_DESIGNS_STORE_NAME)) {
          db.createObjectStore(GRAPHICS_DESIGNS_STORE_NAME, {
            keyPath: 'id',
          });
        }
        if (!db.objectStoreNames.contains(GRAPHICS_ASSETS_STORE_NAME)) {
          db.createObjectStore(GRAPHICS_ASSETS_STORE_NAME, { keyPath: 'id' });
        }
      }
    },
  });
};

/**
 * Removes the image of the retired "custom background image" setting, which
 * lived under this key in `appAssets` (the store has no other use).
 */
export const deleteLegacyCustomBgImage = async () => {
  try {
    const db = await getDB();

    await db.delete(ASSETS_STORE_NAME, 'customBgImage');
  } catch (err) {
    console.error(
      'Failed to delete custom background image from IndexedDB',
      err,
    );
  }
};
