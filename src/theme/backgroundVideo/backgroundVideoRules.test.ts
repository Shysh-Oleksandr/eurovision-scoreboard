import { describe, expect, it } from 'vitest';

import {
  BACKGROUND_VIDEO_MAX_BYTES,
  checkBackgroundVideoFile,
  checkBackgroundVideoLink,
  checkBackgroundVideoMeta,
} from './backgroundVideoRules';

describe('checkBackgroundVideoFile', () => {
  it('accepts MP4 and WebM within the size limit', () => {
    expect(
      checkBackgroundVideoFile({ name: 'a.mp4', type: 'video/mp4', size: 1 }),
    ).toBeNull();
    expect(
      checkBackgroundVideoFile({ name: 'a.webm', type: 'video/webm', size: 1 }),
    ).toBeNull();
    // Some systems leave the type empty; the extension decides then.
    expect(
      checkBackgroundVideoFile({ name: 'A.MP4', type: '', size: 1 }),
    ).toBeNull();
  });

  it("refuses iPhone's .mov and other types", () => {
    expect(
      checkBackgroundVideoFile({
        name: 'IMG_0001.MOV',
        type: 'video/quicktime',
        size: 1,
      }),
    ).toBe('type');
    expect(
      checkBackgroundVideoFile({ name: 'a.gif', type: 'image/gif', size: 1 }),
    ).toBe('type');
    expect(checkBackgroundVideoFile({ name: 'a.mkv', type: '', size: 1 })).toBe(
      'type',
    );
  });

  it('refuses files over 15 MB', () => {
    expect(
      checkBackgroundVideoFile({
        name: 'a.mp4',
        type: 'video/mp4',
        size: BACKGROUND_VIDEO_MAX_BYTES + 1,
      }),
    ).toBe('size');
  });
});

describe('checkBackgroundVideoMeta', () => {
  it('accepts 1080p up to 60 seconds, landscape or portrait', () => {
    expect(
      checkBackgroundVideoMeta({ duration: 60, width: 1920, height: 1080 }),
    ).toBeNull();
    expect(
      checkBackgroundVideoMeta({ duration: 12, width: 1080, height: 1920 }),
    ).toBeNull();
  });

  it('refuses longer or larger videos', () => {
    expect(
      checkBackgroundVideoMeta({ duration: 61, width: 1920, height: 1080 }),
    ).toBe('duration');
    expect(
      checkBackgroundVideoMeta({ duration: 10, width: 3840, height: 2160 }),
    ).toBe('resolution');
  });

  it('lets an unmeasurable WebM length through but not a missing picture', () => {
    expect(
      checkBackgroundVideoMeta({
        duration: Infinity,
        width: 1280,
        height: 720,
      }),
    ).toBeNull();
    expect(
      checkBackgroundVideoMeta({ duration: 10, width: 0, height: 0 }),
    ).toBe('unplayable');
  });
});

describe('checkBackgroundVideoLink', () => {
  it('accepts https links to files and empty input', () => {
    expect(checkBackgroundVideoLink('https://cdn.test/loop.mp4')).toBeNull();
    expect(checkBackgroundVideoLink('  ')).toBeNull();
  });

  it('refuses non-https links', () => {
    expect(checkBackgroundVideoLink('http://cdn.test/loop.mp4')).toBe('https');
    expect(checkBackgroundVideoLink('loop.mp4')).toBe('https');
  });

  it('refuses video pages', () => {
    expect(
      checkBackgroundVideoLink('https://www.youtube.com/watch?v=abc'),
    ).toBe('page');
    expect(checkBackgroundVideoLink('https://youtu.be/abc')).toBe('page');
    expect(
      checkBackgroundVideoLink('https://drive.google.com/file/d/x/view'),
    ).toBe('page');
  });
});
