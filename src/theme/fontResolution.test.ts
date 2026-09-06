import { describe, expect, it } from 'vitest';

import { resolveActiveFonts, resolveThemeFonts } from './fontResolution';

import type { CustomTheme } from '@/types/customTheme';
import type { ThemeFontSnapshot } from '@/types/font';

const snapshot = (id: string): ThemeFontSnapshot => ({
  _id: id,
  name: `Font ${id}`,
  isVariable: false,
  faces: [
    {
      url: `https://cdn.example/fonts/blobs/${id}.woff2`,
      format: 'woff2',
      weight: 400,
      weightRange: [400, 700],
    },
  ],
});

const theme = (overrides: Partial<CustomTheme> = {}): CustomTheme =>
  ({
    _id: 't1',
    name: 'Theme',
    userId: 'u1',
    isPublic: false,
    likes: 0,
    saves: 0,
    baseThemeYear: '2025',
    hue: 200,
    overrides: {},
    createdAt: '',
    updatedAt: '',
    ...overrides,
  } as CustomTheme);

describe('resolveActiveFonts', () => {
  it('the account override forces one bundled font into both slots', () => {
    const fonts = resolveActiveFonts({
      themeYear: '2025',
      customTheme: theme({
        fontId: 'f1',
        scoreboardFontId: 'f2',
        customFonts: { ui: snapshot('f1'), scoreboard: snapshot('f2') },
      }),
      overrideThemeFont: true,
      overrideThemeFontAlias: 'geist',
    });

    expect(fonts.ui).toEqual({ kind: 'builtin', alias: 'geist' });
    expect(fonts.scoreboard).toEqual({ kind: 'builtin', alias: 'geist' });
    expect(fonts.scoreboardInherits).toBe(true);
  });

  it('a custom UI font is inherited by the scoreboard by default', () => {
    const fonts = resolveActiveFonts({
      themeYear: '2025',
      customTheme: theme({
        fontAlias: 'geist',
        fontId: 'f1',
        customFonts: { ui: snapshot('f1') },
      }),
      overrideThemeFont: false,
    });

    expect(fonts.ui).toEqual({
      kind: 'custom',
      snapshot: snapshot('f1'),
      fallbackAlias: 'geist',
    });
    expect(fonts.scoreboard).toBe(fonts.ui);
    expect(fonts.scoreboardInherits).toBe(true);
  });

  it('a bundled UI font with a custom scoreboard font', () => {
    const fonts = resolveActiveFonts({
      themeYear: '2025',
      customTheme: theme({
        fontAlias: 'orbitron',
        scoreboardFontId: 'f2',
        customFonts: { scoreboard: snapshot('f2') },
      }),
      overrideThemeFont: false,
    });

    expect(fonts.ui).toEqual({ kind: 'builtin', alias: 'orbitron' });
    expect(fonts.scoreboard).toEqual({
      kind: 'custom',
      snapshot: snapshot('f2'),
      fallbackAlias: 'orbitron',
    });
    expect(fonts.scoreboardInherits).toBe(false);
  });

  it('a bundled scoreboard alias applies without any custom font', () => {
    const fonts = resolveActiveFonts({
      themeYear: '2025',
      customTheme: theme({ scoreboardFontAlias: 'antonio' }),
      overrideThemeFont: false,
    });

    expect(fonts.ui).toEqual({ kind: 'builtin', alias: 'montserrat' });
    expect(fonts.scoreboard).toEqual({ kind: 'builtin', alias: 'antonio' });
    expect(fonts.scoreboardInherits).toBe(false);
  });

  it('a deleted font (id without a matching snapshot) degrades to the alias', () => {
    const fonts = resolveActiveFonts({
      themeYear: '2025',
      customTheme: theme({
        fontAlias: 'satoshi',
        fontId: 'gone',
        scoreboardFontId: 'f2',
        customFonts: { ui: snapshot('other'), scoreboard: snapshot('f2') },
      }),
      overrideThemeFont: false,
    });

    expect(fonts.ui).toEqual({ kind: 'builtin', alias: 'satoshi' });
    expect(fonts.scoreboard.kind).toBe('custom');
  });

  it('built-in year themes keep their default font and inherit it on the board', () => {
    const fonts = resolveActiveFonts({
      themeYear: '2026',
      customTheme: null,
      overrideThemeFont: false,
    });

    expect(fonts.ui).toEqual({ kind: 'builtin', alias: 'gotham' });
    expect(fonts.scoreboardInherits).toBe(true);
  });
});

describe('resolveThemeFonts', () => {
  it('ignores the account override and resolves from the theme alone', () => {
    const fonts = resolveThemeFonts(
      theme({
        fontId: 'f1',
        customFonts: { ui: snapshot('f1') },
        scoreboardFontAlias: 'zodiak',
      }),
    );

    expect(fonts.ui.kind).toBe('custom');
    expect(fonts.scoreboard).toEqual({ kind: 'builtin', alias: 'zodiak' });
  });
});
