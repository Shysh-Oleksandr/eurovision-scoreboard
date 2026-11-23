import { describe, expect, it } from 'vitest';

import { resolveSnapshotParticipants } from './contestRows';

import type { ContestSnapshot } from '@/types/contestSnapshot';

const snapshot = (setup: Record<string, unknown>, extra = {}) =>
  ({ setup, ...extra } as unknown as ContestSnapshot);

describe('resolveSnapshotParticipants', () => {
  it('joins every stage line-up once, named the way the contest shows them', () => {
    const result = resolveSnapshotParticipants(
      snapshot(
        {
          stages: [
            { id: 'SF1', participants: ['SE', 'MK', 'XX'] },
            { id: 'GF', participants: ['SE', 'FR'] },
          ],
          entryOverrides: { MK: { name: 'F.Y.R. Macedonia' } },
        },
        {
          customEntriesUsed: [
            { code: 'XX', name: 'Atlantis', flag: 'https://cdn.example/a.png' },
          ],
        },
      ),
    );

    expect(result).toEqual([
      { code: 'SE', name: 'Sweden' },
      { code: 'MK', name: 'F.Y.R. Macedonia' },
      { code: 'XX', name: 'Atlantis', flag: 'https://cdn.example/a.png' },
      { code: 'FR', name: 'France' },
    ]);
  });
});
