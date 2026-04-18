import {
  BoardAnimationMode,
  DouzePointsAnimationMode,
  FlagShape,
  PointsContainerShape,
  ThemeSpecifics,
} from '@/theme/types';
import type { ThemeSoundEventId } from '@/theme/themeSoundEvents';

export type { BoardAnimationMode, DouzePointsAnimationMode };

export interface ThemeGroupSummary {
  _id: string;
  name: string;
}

export interface CustomTheme {
  _id: string;
  name: string;
  description?: string;
  userId: string;
  groupId?: string;
  group?: ThemeGroupSummary | null;
  isPublic: boolean;
  likes: number;
  saves: number;
  duplicatesCount?: number;
  baseThemeYear: string;
  hue: number;
  shadeValue?: number;
  overrides: Record<string, string>;
  backgroundImageUrl?: string;
  backgroundImageKey?: string;
  themeSounds?: Partial<
    Record<ThemeSoundEventId, { url: string; key?: string; delayMs?: number }>
  >;
  hasCustomAudio?: boolean;
  pointsContainerShape?: PointsContainerShape;
  uppercaseEntryName?: boolean;
  juryActivePointsUnderline?: boolean;
  isJuryPointsPanelRounded?: boolean;
  flagShape?: FlagShape;
  usePointsCountUpAnimation?: boolean;
  boardAnimationMode?: BoardAnimationMode;
  douzePointsAnimationMode?: DouzePointsAnimationMode;
  themeSpecifics?: Partial<ThemeSpecifics>;
  /** e.g. `montserrat` | `geist` | `dm-sans` — see `normalizeFontAlias` */
  fontAlias?: string;
  createdAt: string;
  updatedAt: string;
  creator?: ThemeCreator;
}

export interface ThemeListResponse {
  themes: CustomTheme[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ThemeState {
  likedIds: string[];
  savedIds: string[];
  quickSelectedIds: string[];
}

export interface ThemeCreator {
  _id: string;
  username: string;
  name?: string;
  country?: string;
  avatarUrl?: string;
  createdAt?: string;
  followerCount?: number;
  isFollowing?: boolean;
}
