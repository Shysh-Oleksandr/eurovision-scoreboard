import { useGeneralStore } from '../state/generalStore';

import type { ThemeColors } from './types';

type DotPrefix<T extends string> = T extends '' ? '' : `.${T}`;

type NestedPaths<T> = {
  [K in keyof T]: T[K] extends string
    ? K & string
    : // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      `${K & string}${DotPrefix<NestedPaths<T[K]>>}`;
}[keyof T];

type ColorPath = NestedPaths<ThemeColors>;

function getColorFromPath(
  theme: { colors: ThemeColors },
  path: ColorPath,
): string {
  const parts = path.split('.');
  let color: any = theme.colors;

  for (const part of parts) {
    color = color[part];
  }

  return color as string;
}

export function useThemeColor(path: ColorPath): string;
export function useThemeColor(paths: ColorPath[]): string[];
export function useThemeColor(
  pathOrPaths: ColorPath | ColorPath[],
): string | string[] {
  const { theme } = useGeneralStore();

  if (Array.isArray(pathOrPaths)) {
    return pathOrPaths.map((path) => getColorFromPath(theme, path));
  }

  return getColorFromPath(theme, pathOrPaths);
}
