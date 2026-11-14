import { beforeEach, describe, expect, it } from 'vitest';

import {
  markLatestUpdateAnnounced,
  readAnnouncedUpdate,
  shouldAnnounceLatestUpdate,
} from './announcedUpdate';
import { LATEST_UPDATE_KEY } from './data';

describe('shouldAnnounceLatestUpdate', () => {
  it('announces an entry this device has not announced or opened', () => {
    expect(
      shouldAnnounceLatestUpdate({
        latest: 'new',
        announced: 'old',
        lastSeenUpdate: 'old',
      }),
    ).toBe(true);
    // An update from a build without the toast: nothing announced yet.
    expect(
      shouldAnnounceLatestUpdate({
        latest: 'new',
        announced: null,
        lastSeenUpdate: null,
      }),
    ).toBe(true);
  });

  it('stays quiet once announced', () => {
    expect(
      shouldAnnounceLatestUpdate({
        latest: 'new',
        announced: 'new',
        lastSeenUpdate: 'old',
      }),
    ).toBe(false);
  });

  it('stays quiet when What’s new was already opened on it', () => {
    expect(
      shouldAnnounceLatestUpdate({
        latest: 'new',
        announced: 'old',
        lastSeenUpdate: 'new',
      }),
    ).toBe(false);
  });

  it('stays quiet without entries', () => {
    expect(
      shouldAnnounceLatestUpdate({
        latest: null,
        announced: null,
        lastSeenUpdate: null,
      }),
    ).toBe(false);
  });
});

describe('announced update storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('remembers the newest entry', () => {
    expect(readAnnouncedUpdate()).toBeNull();

    markLatestUpdateAnnounced();

    expect(readAnnouncedUpdate()).toBe(LATEST_UPDATE_KEY);
    expect(
      shouldAnnounceLatestUpdate({
        latest: LATEST_UPDATE_KEY,
        announced: readAnnouncedUpdate(),
        lastSeenUpdate: null,
      }),
    ).toBe(false);
  });
});
