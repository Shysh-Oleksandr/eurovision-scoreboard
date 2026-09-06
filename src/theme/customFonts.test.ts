import { beforeEach, describe, expect, it } from 'vitest';

import {
  applyDocumentFonts,
  buildFontFaceCss,
  ensureFontFacesInjected,
  fontFacesStyleId,
  getCustomFontFamilyCss,
  getFontCssVars,
} from './customFonts';

import type { ThemeFontSnapshot } from '@/types/font';

const snapshot: ThemeFontSnapshot = {
  _id: 'abc123',
  name: 'Test Sans',
  isVariable: false,
  faces: [
    {
      url: 'https://cdn.example/fonts/blobs/aaa.woff2',
      format: 'woff2',
      weight: 400,
      weightRange: [400, 500],
    },
    {
      url: 'https://cdn.example/fonts/blobs/bbb.woff',
      format: 'woff',
      weight: 700,
      weightRange: [600, 700],
    },
    {
      url: 'http://insecure.example/evil.woff2',
      format: 'woff2',
      weight: 600,
      weightRange: [600, 600],
    },
  ],
};

describe('buildFontFaceCss', () => {
  it('emits one rule per https face with the server weight range', () => {
    const css = buildFontFaceCss(snapshot);

    expect(css).toBe(
      [
        `@font-face{font-family:'dp-font-abc123';src:url("https://cdn.example/fonts/blobs/aaa.woff2") format('woff2');font-weight:400 500;font-style:normal;font-display:swap}`,
        `@font-face{font-family:'dp-font-abc123';src:url("https://cdn.example/fonts/blobs/bbb.woff") format('woff');font-weight:600 700;font-style:normal;font-display:swap}`,
      ].join('\n'),
    );
  });
});

describe('getCustomFontFamilyCss', () => {
  it('prefixes the namespaced family before the fallback stack', () => {
    expect(getCustomFontFamilyCss(snapshot, 'geist')).toBe(
      `'dp-font-abc123', "Geist Sans", sans-serif`,
    );
    expect(getCustomFontFamilyCss(snapshot, 'nope')).toBe(
      `'dp-font-abc123', montserrat, sans-serif`,
    );
  });
});

describe('ensureFontFacesInjected', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('creates the style once and leaves it alone on repeat calls', () => {
    ensureFontFacesInjected(snapshot);
    const first = document.getElementById(fontFacesStyleId('abc123'));

    expect(first?.textContent).toContain('dp-font-abc123');

    ensureFontFacesInjected(snapshot);
    expect(document.getElementById(fontFacesStyleId('abc123'))).toBe(first);
    expect(document.head.querySelectorAll('style').length).toBe(1);
  });
});

describe('getFontCssVars', () => {
  it('always sets both scoreboard variables so scoped blocks never inherit the document font', () => {
    const vars = getFontCssVars(
      {
        ui: { kind: 'builtin', alias: 'geist' },
        scoreboard: { kind: 'builtin', alias: 'geist' },
        scoreboardInherits: true,
      },
      { includeUi: false },
    );

    expect(vars).toEqual({
      '--dp-scoreboard-font-family': '"Geist Sans", sans-serif',
      '--dp-scoreboard-font-synthesis': 'weight style',
    });
  });

  it('disables synthesis only for custom slots', () => {
    const vars = getFontCssVars({
      ui: { kind: 'builtin', alias: 'montserrat' },
      scoreboard: { kind: 'custom', snapshot, fallbackAlias: 'montserrat' },
      scoreboardInherits: false,
    });

    expect(vars['--dp-font-synthesis']).toBe('weight style');
    expect(vars['--dp-scoreboard-font-synthesis']).toBe('none');
    expect(vars['--dp-scoreboard-font-family']).toBe(
      `'dp-font-abc123', montserrat, sans-serif`,
    );
  });
});

describe('applyDocumentFonts', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.documentElement.removeAttribute('style');
    delete document.documentElement.dataset.font;
  });

  it('writes inline variables for a custom UI font and clears them when going back to builtin', () => {
    applyDocumentFonts({
      ui: { kind: 'custom', snapshot, fallbackAlias: 'geist' },
      scoreboard: { kind: 'builtin', alias: 'antonio' },
      scoreboardInherits: false,
    });

    const { style } = document.documentElement;

    expect(document.documentElement.dataset.font).toBe('geist');
    expect(style.getPropertyValue('--dp-font-family')).toBe(
      `'dp-font-abc123', "Geist Sans", sans-serif`,
    );
    expect(style.getPropertyValue('--dp-font-synthesis')).toBe('none');
    expect(style.getPropertyValue('--dp-scoreboard-font-family')).toBe(
      'Antonio, sans-serif',
    );
    expect(document.getElementById(fontFacesStyleId('abc123'))).not.toBeNull();

    applyDocumentFonts({
      ui: { kind: 'builtin', alias: 'montserrat' },
      scoreboard: { kind: 'builtin', alias: 'montserrat' },
      scoreboardInherits: true,
    });

    expect(document.documentElement.dataset.font).toBe('montserrat');
    expect(style.getPropertyValue('--dp-font-family')).toBe('');
    expect(style.getPropertyValue('--dp-scoreboard-font-family')).toBe('');
    expect(style.getPropertyValue('--dp-scoreboard-font-synthesis')).toBe('');
  });
});
