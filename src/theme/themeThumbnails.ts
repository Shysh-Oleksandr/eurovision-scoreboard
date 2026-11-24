import { themes } from './themes';

const BACKGROUNDS = '/bgImages/';

/**
 * A small copy of a built-in theme's background (256×144, about 2 kB), for
 * the setup header's theme picker. Made by scripts/theme-thumbnails.mjs into
 * public/bgImages/thumbs/.
 */
export const getThemeThumbnail = (themeKey: string): string | undefined => {
  const background = themes[themeKey as keyof typeof themes]?.backgroundImage;

  if (!background?.startsWith(BACKGROUNDS)) return undefined;

  return `${BACKGROUNDS}thumbs/${background.slice(BACKGROUNDS.length)}`;
};
