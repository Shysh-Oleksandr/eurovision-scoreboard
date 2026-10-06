import { loadAsset } from '../assets/localAssets';
import { exportNode } from '../export/exportNode';
import { dataUrlToBlob } from '../export/imageActions';
import { localAssetIds, rewriteAssetRefs } from '../model/assetRefs';
import { Design } from '../model/design';

import {
  createDesign,
  updateDesign,
  uploadDesignAsset,
  uploadDesignThumbnail,
} from '@/api/designs';
import type { CloudDesign } from '@/types/design';

export interface PublishOptions {
  design: Design;
  name: string;
  description: string;
  /** Public = listed in Community; otherwise unlisted (link only). */
  isPublic: boolean;
  /** Update this cloud record instead of creating one. */
  cloudId: string | null;
  /** Source template id for provenance (first publish only). */
  remixedFrom?: string;
  /** The design node, for the thumbnail (optional). */
  node?: HTMLDivElement | null;
  /**
   * Called as soon as a cloud record exists (before assets upload) so the
   * caller can remember its id even if a later step fails.
   */
  onCreated?: (id: string) => void;
}

/** A referenced upload is no longer in this browser's storage. */
export class MissingAssetError extends Error {
  constructor(public readonly assetId: string) {
    super('missing-asset');
  }
}

const isNotFound = (err: unknown) =>
  (err as { response?: { status?: number } })?.response?.status === 404;

const THUMB_WIDTH = 640;

export { localAssetIds, rewriteAssetRefs };

/**
 * Publish a design: create (or update) the cloud record, upload the locally
 * stored images it references and rewrite them to their R2 URLs, then
 * upload a JPEG thumbnail of the stage. The local draft keeps its
 * `asset:` references; only the cloud copy is rewritten.
 *
 * Failure modes: an upload that was already removed from this browser
 * throws `MissingAssetError` before anything is sent; a `cloudId` whose
 * record was deleted (unpublished elsewhere) falls back to creating a new
 * record; while assets are still uploading the record stays unlisted, so a
 * failure mid-way never leaves a public design with `asset:` references.
 */
export async function publishDesign(
  options: PublishOptions,
): Promise<CloudDesign> {
  const {
    design,
    name,
    description,
    isPublic,
    cloudId,
    remixedFrom,
    node,
    onCreated,
  } = options;
  const assetIds = localAssetIds(design);
  const needsRewrite = assetIds.length > 0;
  const named = { ...design, name };

  // Resolve every upload first so a missing one fails before any request.
  const dataUrls = new Map<string, string>();

  for (const id of assetIds) {
    // eslint-disable-next-line no-await-in-loop
    const dataUrl = await loadAsset(id);

    if (!dataUrl) throw new MissingAssetError(id);
    dataUrls.set(id, dataUrl);
  }

  const base = {
    name,
    description,
    isPublic: needsRewrite ? false : isPublic,
    design: named,
  };
  let record: CloudDesign | null = null;

  if (cloudId) {
    try {
      record = await updateDesign(cloudId, base);
    } catch (err) {
      // Unpublished from the gallery in the meantime: publish afresh.
      if (!isNotFound(err)) throw err;
    }
  }
  if (!record) {
    record = await createDesign({ ...base, remixedFrom });
    onCreated?.(record._id);
  }

  if (needsRewrite) {
    const urls = new Map<string, string>();

    for (const id of assetIds) {
      const dataUrl = dataUrls.get(id)!;

      // eslint-disable-next-line no-await-in-loop
      const blob = await dataUrlToBlob(dataUrl);
      const ext = blob.type === 'image/jpeg' ? 'jpg' : 'png';
      // eslint-disable-next-line no-await-in-loop
      const uploaded = await uploadDesignAsset(
        record._id,
        blob,
        `${id}.${ext}`,
      );

      urls.set(id, uploaded.url);
    }
    record = await updateDesign(record._id, {
      isPublic,
      design: rewriteAssetRefs(named, urls),
    });
  }

  if (node) {
    try {
      const { width, height } = design.canvas;
      const size = {
        width: node.offsetWidth || width,
        height: node.offsetHeight || height,
      };
      const result = await exportNode(node, {
        ...size,
        scale: Math.min(1, THUMB_WIDTH / size.width),
        format: 'jpeg',
        quality: 0.82,
      });

      record = await uploadDesignThumbnail(
        record._id,
        await dataUrlToBlob(result.dataUrl),
      );
    } catch (err) {
      console.error('Thumbnail upload failed', err);
    }
  }

  return record;
}
