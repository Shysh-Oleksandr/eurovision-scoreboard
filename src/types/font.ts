import type { ThemeCreator } from './customTheme';

export type FontWeightSlot = 400 | 500 | 600 | 700;
export type FontStoredFormat = 'woff2' | 'woff';

export interface FontFace {
  weight: FontWeightSlot;
  /** Inclusive weight range this face serves; emitted verbatim as `font-weight: lo hi`. */
  weightRange: [number, number];
  url: string;
  format: FontStoredFormat;
  isVariable: boolean;
  wghtRange?: [number, number];
  sha256: string;
  bytes: number;
  sourceFilename?: string;
}

export interface Font {
  _id: string;
  name: string;
  familyName?: string;
  userId: string;
  isPublic: boolean;
  isVariable: boolean;
  faces: FontFace[];
  forksCount: number;
  forkedFrom?: string;
  forkedFromName?: string;
  forkedFromUserId?: string;
  createdAt: string;
  updatedAt: string;
  creator?: ThemeCreator;
  /** Own-library listing only. */
  usedByThemesCount?: number;
  /** Public listing only, for a signed-in viewer. */
  forkedByMe?: boolean;
}

/** Minimal shape attached to themes (`customTheme.customFonts`); persisted to localStorage for the FOUC script. */
export interface ThemeFontSnapshot {
  _id: string;
  name: string;
  isVariable: boolean;
  faces: Array<{
    url: string;
    format: FontStoredFormat;
    weight: number;
    weightRange: [number, number];
  }>;
}

export interface FontListResponse {
  fonts: Font[];
  total: number;
  page: number;
  totalPages: number;
}

export interface FontUploadResponse {
  font: Font;
  warnings: string[];
}
