/* eslint-disable no-console */
import { openDB } from 'idb';

import { BaseCountry } from '../models';
import { GeneralState } from '@/state/generalStore';
import { CountriesState } from '@/state/countriesStore';

const DB_NAME = 'DouzePoints';
const STORE_NAME = 'customCountries';
const ASSETS_STORE_NAME = 'appAssets';
const PRESETS_STORE_NAME = 'presets';

const getDB = async () => {
  return openDB(DB_NAME, 3, {
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

      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains(PRESETS_STORE_NAME)) {
          db.createObjectStore(PRESETS_STORE_NAME, { keyPath: 'id' });
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
    console.error(
      'Failed to delete custom background image from IndexedDB',
      err,
    );
  }
};

// Presets helpers
export interface Preset {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  // Keep only selected parts of the app state for portability
  general: Pick<
    GeneralState,
    'year' | 'themeYear' | 'settings' | 'settingsPointsSystem'
  >;
  countries: Pick<
    CountriesState,
    'eventAssignments' | 'configuredEventStages' | 'countryOdds' | 'activeMode'
  >;
}

export const savePresetToDB = async (preset: Preset) => {
  try {
    const db = await getDB();
    await db.put(PRESETS_STORE_NAME, preset);
  } catch (err) {
    console.error('Failed to save preset to IndexedDB', err);
    throw err;
  }
};

export const getAllPresetsFromDB = async (): Promise<Preset[]> => {
  try {
    const db = await getDB();
    const presets = await db.getAll(PRESETS_STORE_NAME);
    return (presets as Preset[]) || [];
  } catch (err) {
    console.error('Failed to read presets from IndexedDB', err);
    return [];
  }
};

export const getPresetFromDB = async (id: string): Promise<Preset | null> => {
  try {
    const db = await getDB();
    const preset = await db.get(PRESETS_STORE_NAME, id);
    return (preset as Preset) ?? null;
  } catch (err) {
    console.error('Failed to read a preset from IndexedDB', err);
    return null;
  }
};

export const deletePresetFromDB = async (id: string) => {
  try {
    const db = await getDB();
    await db.delete(PRESETS_STORE_NAME, id);
  } catch (err) {
    console.error('Failed to delete preset from IndexedDB', err);
    throw err;
  }
};
