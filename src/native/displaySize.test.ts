import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const platform = vi.hoisted(() => ({ current: 'ios' as string }));

vi.mock('./platform', () => ({
  IS_NATIVE_APP: true,
  nativePlatform: () => platform.current,
}));

import {
  applyDisplayZoom,
  isDisplaySizeSupported,
  resetDisplayZoomForTests,
  viewportContent,
  zoomForDisplaySize,
} from './displaySize';

const APP_VIEWPORT =
  'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no';

const viewportMeta = () =>
  document.querySelector('meta[name="viewport"]') as HTMLMetaElement;

/** Lets the MutationObserver's callback run. */
const flushObserver = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('zoomForDisplaySize', () => {
  it('turns an offered size into a zoom', () => {
    expect(zoomForDisplaySize('75')).toBe(0.75);
    expect(zoomForDisplaySize('85')).toBe(0.85);
    expect(zoomForDisplaySize('100')).toBe(1);
  });

  it('falls back to 100% for anything else', () => {
    expect(zoomForDisplaySize(undefined)).toBe(1);
    expect(zoomForDisplaySize('50')).toBe(1);
    expect(zoomForDisplaySize('abc')).toBe(1);
  });
});

describe('viewportContent', () => {
  it('pins every scale to the zoom', () => {
    expect(viewportContent(0.85)).toBe(
      'width=device-width, initial-scale=0.85, minimum-scale=0.85, maximum-scale=0.85, viewport-fit=cover, user-scalable=no',
    );
  });
});

describe('isDisplaySizeSupported', () => {
  afterEach(() => {
    delete (window as { Capacitor?: unknown }).Capacitor;
  });

  it('is on in every iOS app', () => {
    platform.current = 'ios';

    expect(isDisplaySizeSupported()).toBe(true);
  });

  it('needs the DouzeDisplay plugin on Android', () => {
    platform.current = 'android';
    const isPluginAvailable = vi.fn(() => false);

    (window as { Capacitor?: unknown }).Capacitor = { isPluginAvailable };
    expect(isDisplaySizeSupported()).toBe(false);

    isPluginAvailable.mockReturnValue(true);
    expect(isDisplaySizeSupported()).toBe(true);
    expect(isPluginAvailable).toHaveBeenCalledWith('DouzeDisplay');
  });

  it('is off outside the native shell', () => {
    platform.current = 'web';

    expect(isDisplaySizeSupported()).toBe(false);
  });
});

describe('applyDisplayZoom', () => {
  beforeEach(() => {
    resetDisplayZoomForTests();
    document.head.innerHTML = `<meta name="viewport" content="${APP_VIEWPORT}">`;
  });

  afterEach(() => {
    resetDisplayZoomForTests();
    document.head.innerHTML = '';
  });

  it('leaves the shipped tag alone at 100%', () => {
    applyDisplayZoom(1);

    expect(viewportMeta().content).toBe(APP_VIEWPORT);
    expect(
      document.documentElement.style.getPropertyValue('--dp-display-zoom'),
    ).toBe('');
  });

  it('scales the page and the safe-area insets', () => {
    applyDisplayZoom(0.75);

    expect(viewportMeta().content).toBe(viewportContent(0.75));
    expect(
      document.documentElement.style.getPropertyValue('--dp-display-zoom'),
    ).toBe('0.75');
  });

  it('pins the scale to 1 on the way back to 100%', () => {
    applyDisplayZoom(0.75);
    applyDisplayZoom(1);

    expect(viewportMeta().content).toBe(viewportContent(1));
    expect(
      document.documentElement.style.getPropertyValue('--dp-display-zoom'),
    ).toBe('1');
  });

  it('puts the scaled tag back when the head is rendered again', async () => {
    applyDisplayZoom(0.85);

    viewportMeta().setAttribute('content', APP_VIEWPORT);
    await flushObserver();
    expect(viewportMeta().content).toBe(viewportContent(0.85));

    viewportMeta().remove();
    const fresh = document.createElement('meta');

    fresh.name = 'viewport';
    fresh.content = APP_VIEWPORT;
    document.head.appendChild(fresh);
    await flushObserver();
    expect(viewportMeta().content).toBe(viewportContent(0.85));
  });
});
