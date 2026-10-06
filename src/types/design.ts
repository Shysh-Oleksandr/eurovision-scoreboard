import type { Design } from '@/graphics/model/design';
import type { ThemeCreator } from '@/types/customTheme';

export type DesignSizeClass =
  | 'landscape'
  | 'portrait'
  | 'square'
  | 'story'
  | 'broadcast'
  | 'content';

/** A design published to the cloud (template or shared design). */
export interface CloudDesign {
  _id: string;
  name: string;
  description?: string;
  userId: string;
  /** `false` = unlisted: reachable by link, not listed in Community. */
  isPublic: boolean;
  likes: number;
  saves: number;
  duplicatesCount?: number;
  remixedFrom?: string;
  remixedFromName?: string;
  remixedFromUserId?: string;
  design: Design;
  thumbnailUrl?: string;
  thumbnailKey?: string;
  assetKeys?: string[];
  canvasWidth: number;
  canvasHeight: number;
  autoSize: boolean;
  sizeClass: DesignSizeClass;
  hasScoreboard: boolean;
  hasStats: boolean;
  fieldsCount: number;
  createdAt: string;
  updatedAt: string;
  creator?: ThemeCreator;
}

export interface DesignListResponse {
  designs: CloudDesign[];
  total: number;
  page: number;
  totalPages: number;
}

export interface DesignState {
  likedIds: string[];
  savedIds: string[];
}
