/* eslint-disable no-console */
import { localAssetIds } from '../model/assetRefs';
import { Design, designSchema, parseDesign } from '../model/design';

import {
  getDB,
  GRAPHICS_ASSETS_STORE_NAME,
  GRAPHICS_DESIGNS_STORE_NAME,
} from '@/helpers/indexedDB';

/**
 * Local drafts for the graphics studio. Designs live in IndexedDB as plain
 * JSON (one record per design); uploaded images live in a second store as
 * data URLs referenced by `asset:<id>` from image elements and fills, so a
 * design stays small and the undo history never copies image bytes.
 * Cloud persistence (Phase 3) will upload assets on first save and rewrite
 * the references.
 */

export interface DesignRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  design: Design;
  /** Cloud `_id` once the draft has been published as a template. */
  cloudId?: string;
}

export interface AssetRecord {
  id: string;
  /** data: URL (PNG or JPEG). */
  dataUrl: string;
  name?: string;
  size: number;
  createdAt: number;
}

/** A stored record whose design no longer passes the schema. */
export interface UnreadableRecord {
  id: string;
  name: string;
  updatedAt: number;
  error: string;
  /** The raw stored document, for "Export" so nothing is lost. */
  raw: unknown;
}

export const newRecordId = (prefix = 'd'): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

/**
 * Every stored draft: the readable ones parsed (defaults filled in) and the
 * ones that fail the schema listed separately so the gallery can still show,
 * export and delete them instead of hiding them.
 */
export async function listDesignsWithUnreadable(): Promise<{
  records: DesignRecord[];
  unreadable: UnreadableRecord[];
}> {
  try {
    const db = await getDB();
    const all = (await db.getAll(
      GRAPHICS_DESIGNS_STORE_NAME,
    )) as DesignRecord[];
    const records: DesignRecord[] = [];
    const unreadable: UnreadableRecord[] = [];

    all.forEach((rec) => {
      const parsed = designSchema.safeParse(rec.design);

      if (parsed.success) {
        records.push({ ...rec, design: parsed.data });
      } else {
        console.warn('[graphics] unreadable design', rec.id, parsed.error);
        unreadable.push({
          id: rec.id,
          name: rec.name || 'Untitled design',
          updatedAt: rec.updatedAt,
          error: parsed.error.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('; '),
          raw: rec.design,
        });
      }
    });
    records.sort((a, b) => b.updatedAt - a.updatedAt);
    unreadable.sort((a, b) => b.updatedAt - a.updatedAt);

    return { records, unreadable };
  } catch (err) {
    console.error('Failed to list graphics designs', err);

    return { records: [], unreadable: [] };
  }
}

export async function listDesigns(): Promise<DesignRecord[]> {
  return (await listDesignsWithUnreadable()).records;
}

export async function getDesignRecord(
  id: string,
): Promise<DesignRecord | null> {
  try {
    const db = await getDB();
    const rec = (await db.get(GRAPHICS_DESIGNS_STORE_NAME, id)) as
      | DesignRecord
      | undefined;

    return rec ? { ...rec, design: parseDesign(rec.design) } : null;
  } catch (err) {
    console.error('Failed to read graphics design', err);

    return null;
  }
}

/**
 * Write a draft. The design is validated first (a document that would not
 * load again is never written) and normalised through the schema so defaults
 * are stored explicitly.
 */
export async function putDesignRecord(record: DesignRecord): Promise<void> {
  const db = await getDB();
  const name = record.name.trim() || 'Untitled design';
  const design = parseDesign({ ...record.design, name });

  // Structured clone needs plain data; the design is already JSON-safe.
  await db.put(
    GRAPHICS_DESIGNS_STORE_NAME,
    JSON.parse(JSON.stringify({ ...record, name, design })),
  );
}

export async function deleteDesignRecord(id: string): Promise<void> {
  const db = await getDB();

  await db.delete(GRAPHICS_DESIGNS_STORE_NAME, id);
  void sweepUnreferencedAssets();
}

/**
 * Delete uploaded images no draft references any more (deleted designs,
 * replaced images). Unreadable drafts are scanned as raw JSON so their
 * images survive too.
 */
export async function sweepUnreferencedAssets(): Promise<number> {
  try {
    const db = await getDB();
    const all = (await db.getAll(
      GRAPHICS_DESIGNS_STORE_NAME,
    )) as DesignRecord[];
    const used = new Set<string>();

    all.forEach((rec) => {
      const parsed = designSchema.safeParse(rec.design);

      if (parsed.success) {
        localAssetIds(parsed.data).forEach((id) => used.add(id));
      } else {
        const matches = JSON.stringify(rec.design ?? '').matchAll(
          /"asset:([^"]+)"/g,
        );

        for (const m of matches) used.add(m[1]);
      }
    });
    const assets = (await db.getAll(
      GRAPHICS_ASSETS_STORE_NAME,
    )) as AssetRecord[];
    const stale = assets.filter((a) => !used.has(a.id));

    await Promise.all(
      stale.map((a) => db.delete(GRAPHICS_ASSETS_STORE_NAME, a.id)),
    );

    return stale.length;
  } catch (err) {
    console.error('Failed to sweep graphics assets', err);

    return 0;
  }
}

export async function countDesigns(): Promise<number> {
  try {
    const db = await getDB();

    return await db.count(GRAPHICS_DESIGNS_STORE_NAME);
  } catch {
    return 0;
  }
}

export async function putAsset(asset: AssetRecord): Promise<void> {
  const db = await getDB();

  await db.put(GRAPHICS_ASSETS_STORE_NAME, asset);
}

export async function getAsset(id: string): Promise<AssetRecord | null> {
  try {
    const db = await getDB();

    return (
      ((await db.get(GRAPHICS_ASSETS_STORE_NAME, id)) as
        | AssetRecord
        | undefined) ?? null
    );
  } catch (err) {
    console.error('Failed to read graphics asset', err);

    return null;
  }
}

export async function deleteAsset(id: string): Promise<void> {
  const db = await getDB();

  await db.delete(GRAPHICS_ASSETS_STORE_NAME, id);
}
