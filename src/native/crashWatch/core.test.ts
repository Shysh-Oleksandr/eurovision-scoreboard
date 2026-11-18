import { describe, expect, it } from 'vitest';

import {
  assessPreviousSession,
  buildCrashReport,
  buildRollbackReport,
  canSendReport,
  contextCrumbs,
  createSessionTracker,
  MAX_SENT_PER_DAY,
  NO_LAST_EXIT,
  noteReportSent,
  parseLastExit,
  PENDING_KEY,
  queueReport,
  readPendingReports,
  readSessionRecord,
  removePendingReport,
  SESSION_KEY,
  type KeyValueStorage,
  type LastExit,
  type LiveUpdateRollback,
  type RendererGone,
  type SessionContext,
  type SessionRecord,
} from './core';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage: KeyValueStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };

  return { storage, data };
}

const context = (overrides: Partial<SessionContext> = {}): SessionContext => ({
  path: '/',
  overlays: 0,
  dialogs: [],
  editor: false,
  stage: null,
  winner: false,
  theme: '2026',
  domNodes: 1000,
  canvases: 0,
  ...overrides,
});

const record = (overrides: Partial<SessionRecord> = {}): SessionRecord => ({
  v: 1,
  startedAt: 1_000_000,
  updatedAt: 1_060_000,
  bundle: 'built-in',
  state: 'visible',
  ctx: context(),
  peakDomNodes: 1000,
  crumbs: [],
  ...overrides,
});

const renderer = (overrides: Partial<RendererGone> = {}): RendererGone => ({
  at: 1_060_000,
  didCrash: true,
  rendererPriority: 2,
  visible: true,
  recovered: true,
  recentRecoveries: 0,
  ...overrides,
});

const exit = (overrides: Partial<LastExit> = {}): LastExit => ({
  ...NO_LAST_EXIT,
  ...overrides,
});

describe('assessPreviousSession', () => {
  it('reports a session that ended on screen while the app was in front', () => {
    expect(
      assessPreviousSession(record(), exit({ foreground: true }), false),
    ).toBe('App crash: app ended on screen');
  });

  it('needs native evidence for a session that ended on screen', () => {
    // The page's record lags: a swipe-away right after leaving looks the same.
    expect(
      assessPreviousSession(record(), exit({ foreground: false }), false),
    ).toBeNull();
    // iOS, or a binary without the plugin.
    expect(assessPreviousSession(record(), NO_LAST_EXIT, false)).toBeNull();
  });

  it('reports a page the same WebView loaded again without unloading it', () => {
    expect(assessPreviousSession(record(), NO_LAST_EXIT, true)).toBe(
      'App crash: web content process ended on screen',
    );
  });

  it('ignores sessions that went to the background or unloaded', () => {
    const foreground = exit({ foreground: true });

    expect(
      assessPreviousSession(record({ state: 'hidden' }), foreground, true),
    ).toBeNull();
    expect(
      assessPreviousSession(record({ state: 'closed' }), foreground, true),
    ).toBeNull();
    expect(assessPreviousSession(null, foreground, false)).toBeNull();
  });

  it('names a renderer death the app recovered from', () => {
    expect(
      assessPreviousSession(record(), exit({ renderer: renderer() }), false),
    ).toBe('App crash: Android renderer crashed on screen');
    expect(
      assessPreviousSession(
        record({ state: 'hidden' }),
        exit({ renderer: renderer({ visible: false }) }),
        false,
      ),
    ).toBe('App crash: Android renderer crashed in the background');
    expect(
      assessPreviousSession(
        record(),
        exit({ renderer: renderer({ didCrash: false }) }),
        false,
      ),
    ).toBe('App crash: Android renderer was killed on screen');
  });

  it('flags the crash loop the native guard let through', () => {
    expect(
      assessPreviousSession(
        record(),
        exit({ foreground: true, renderer: renderer({ recovered: false }) }),
        false,
      ),
    ).toBe('App crash: Android renderer crashed on screen (crash loop)');
  });

  it('ignores a renderer Android killed in the background', () => {
    expect(
      assessPreviousSession(
        record({ state: 'hidden' }),
        exit({ renderer: renderer({ didCrash: false, visible: false }) }),
        false,
      ),
    ).toBeNull();
  });
});

describe('buildCrashReport', () => {
  it('carries the session and how it ended', () => {
    const report = buildCrashReport(
      'App crash: Android renderer crashed on screen',
      record({ crumbs: [[0, 'start:visible']] }),
      exit({ foreground: false, renderer: renderer() }),
      { platform: 'Linux' },
    );

    expect(report.message).toBe(
      'App crash: Android renderer crashed on screen',
    );
    expect(report.userDetails).toEqual({ platform: 'Linux' });
    expect(report.generalInfo).toMatchObject({
      kind: 'app-crash',
      previousSession: {
        durationS: 60,
        bundle: 'built-in',
        crumbs: [[0, 'start:visible']],
        lastSeenAt: new Date(1_060_000).toISOString(),
      },
      foregroundAtExit: false,
      renderer: { didCrash: true, at: new Date(1_060_000).toISOString() },
    });
  });
});

describe('buildRollbackReport', () => {
  const rollback: LiveUpdateRollback = {
    failedBundle: '20261118.171120',
    downloadedAt: '2026-11-18T17:34:53.143Z',
    runningBundle: 'built-in',
    platform: 'android',
    runtime: 'be43745f2e9d268c',
    appVersion: '1.3 (3)',
  };

  it('carries the session that ran the failed bundle', () => {
    const report = buildRollbackReport(
      rollback,
      record({ bundle: '20261118.171120', crumbs: [[0, 'start:visible']] }),
      { platform: 'Linux' },
    );

    expect(report.message).toBe('Live update rolled back');
    expect(report.userDetails).toEqual({ platform: 'Linux' });
    expect(report.generalInfo).toMatchObject({
      kind: 'live-update-rollback',
      failedBundle: '20261118.171120',
      runningBundle: 'built-in',
      appVersion: '1.3 (3)',
      failedBundleRan: true,
      previousSession: {
        bundle: '20261118.171120',
        crumbs: [[0, 'start:visible']],
      },
    });
  });

  it('says the bundle never ran when the last session was another bundle', () => {
    const report = buildRollbackReport(rollback, record(), {});

    expect(report.generalInfo).toMatchObject({
      failedBundleRan: false,
      previousSession: null,
    });
  });

  it('copes with no session record at all', () => {
    expect(buildRollbackReport(rollback, null, {}).generalInfo).toMatchObject({
      failedBundleRan: false,
      previousSession: null,
    });
  });
});

describe('contextCrumbs', () => {
  it('notes what changed', () => {
    expect(
      contextCrumbs(
        context(),
        context({
          path: '/?contest',
          overlays: 1,
          dialogs: ['Event setup'],
          editor: true,
          stage: 'Final (televote)',
          winner: true,
          theme: 'custom',
        }),
      ),
    ).toEqual([
      'path:/?contest',
      'overlays:1',
      'dialog:Event setup',
      'editor:open',
      'stage:Final (televote)',
      'winner',
      'theme:custom',
    ]);
  });

  it('notes nothing on the first sample or without changes', () => {
    expect(contextCrumbs(null, context())).toEqual([]);
    expect(contextCrumbs(context(), context({ domNodes: 5000 }))).toEqual([]);
  });
});

describe('createSessionTracker', () => {
  it('returns the previous record and writes the new one at once', () => {
    const { storage, data } = memoryStorage({
      [SESSION_KEY]: JSON.stringify(record()),
    });
    let now = 2_000_000;
    const tracker = createSessionTracker({
      storage,
      readContext: () => context(),
      bundle: '20261113120000',
      now: () => now,
    });

    expect(tracker.start('visible')).toEqual(record());

    const saved = JSON.parse(data.get(SESSION_KEY)!);

    expect(saved).toMatchObject({
      startedAt: 2_000_000,
      state: 'visible',
      bundle: '20261113120000',
      ctx: context(),
      crumbs: [[0, 'start:visible']],
    });

    now += 12_000;
    tracker.setState('hidden');
    expect(readSessionRecord(storage)).toMatchObject({
      state: 'hidden',
      updatedAt: 2_012_000,
      crumbs: [
        [0, 'start:visible'],
        [12, 'hidden'],
      ],
    });
  });

  it('samples the screen, keeps the DOM peak and the newest crumbs', () => {
    const { storage } = memoryStorage();
    let ctx = context();
    const tracker = createSessionTracker({
      storage,
      readContext: () => ctx,
      bundle: 'built-in',
    });

    tracker.start('visible');

    for (let index = 0; index < 40; index += 1) {
      ctx = context({ overlays: index % 2, domNodes: 1000 + index });
      tracker.sample();
    }

    const saved = readSessionRecord(storage)!;

    expect(saved.crumbs).toHaveLength(30);
    expect(saved.crumbs[29][1]).toBe('overlays:1');
    expect(saved.peakDomNodes).toBe(1039);
  });

  it('keeps recording when the context throws', () => {
    const { storage } = memoryStorage();
    const tracker = createSessionTracker({
      storage,
      readContext: () => {
        throw new Error('broken store');
      },
      bundle: 'built-in',
    });

    expect(tracker.start('visible')).toBeNull();
    tracker.setState('closed');
    expect(readSessionRecord(storage)).toMatchObject({
      state: 'closed',
      ctx: null,
    });
  });

  it('saves a crumb noted from outside at once', () => {
    const { storage } = memoryStorage();
    let now = 3_000_000;
    const tracker = createSessionTracker({
      storage,
      readContext: () => context(),
      bundle: 'built-in',
      now: () => now,
    });

    tracker.start('visible');
    now += 7_000;
    tracker.note('share:sheet');
    expect(readSessionRecord(storage)).toMatchObject({
      updatedAt: 3_007_000,
      crumbs: [
        [0, 'start:visible'],
        [7, 'share:sheet'],
      ],
    });
  });

  it('ignores a malformed saved record', () => {
    const { storage } = memoryStorage({ [SESSION_KEY]: '{"v":1}' });

    expect(readSessionRecord(storage)).toBeNull();
    expect(
      readSessionRecord(memoryStorage({ [SESSION_KEY]: 'nope' }).storage),
    ).toBeNull();
  });
});

describe('parseLastExit', () => {
  it('reads the plugin answer', () => {
    expect(
      parseLastExit({
        foreground: true,
        rendererGone: {
          at: 5,
          didCrash: true,
          rendererPriority: 2,
          visible: true,
          recovered: true,
          recentRecoveries: 1,
        },
      }),
    ).toEqual({
      foreground: true,
      renderer: {
        at: 5,
        didCrash: true,
        rendererPriority: 2,
        visible: true,
        recovered: true,
        recentRecoveries: 1,
      },
    });
  });

  it('reads what is missing as no evidence', () => {
    expect(parseLastExit({})).toEqual(NO_LAST_EXIT);
    expect(parseLastExit(undefined)).toEqual(NO_LAST_EXIT);
    expect(
      parseLastExit({ foreground: 'yes', rendererGone: { didCrash: true } }),
    ).toEqual(NO_LAST_EXIT);
  });
});

describe('report queue', () => {
  const pending = (id: string) => ({ id, report: { message: id } });

  it('keeps the three newest reports until they are sent', () => {
    const { storage } = memoryStorage();

    ['a', 'b', 'c', 'd'].forEach((id) => queueReport(storage, pending(id)));
    queueReport(storage, pending('c'));
    expect(readPendingReports(storage).map((item) => item.id)).toEqual([
      'b',
      'd',
      'c',
    ]);

    removePendingReport(storage, 'd');
    expect(readPendingReports(storage).map((item) => item.id)).toEqual([
      'b',
      'c',
    ]);
  });

  it('survives a malformed queue', () => {
    const { storage } = memoryStorage({ [PENDING_KEY]: '[1,{"id":2}]' });

    expect(readPendingReports(storage)).toEqual([]);
  });

  it('caps reports per device per day', () => {
    const { storage } = memoryStorage();
    const day = 24 * 60 * 60 * 1000;

    for (let index = 0; index < MAX_SENT_PER_DAY; index += 1) {
      expect(canSendReport(storage, index)).toBe(true);
      noteReportSent(storage, index);
    }
    expect(canSendReport(storage, MAX_SENT_PER_DAY)).toBe(false);
    expect(canSendReport(storage, day + 1)).toBe(true);
  });
});
