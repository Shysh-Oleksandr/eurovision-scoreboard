import { describe, expect, it } from 'vitest';

import { queryView } from './useQueryView';

describe('queryView', () => {
  it('shows data whenever there is some, offline too', () => {
    expect(
      queryView({ data: [], status: 'success', fetchStatus: 'paused' }, true),
    ).toBe('ready');
  });

  it('is offline for a paused query, or any query without data while offline', () => {
    expect(
      queryView(
        { data: undefined, status: 'pending', fetchStatus: 'paused' },
        false,
      ),
    ).toBe('offline');
    expect(
      queryView(
        { data: undefined, status: 'pending', fetchStatus: 'fetching' },
        true,
      ),
    ).toBe('offline');
    expect(
      queryView(
        { data: undefined, status: 'error', fetchStatus: 'idle' },
        true,
      ),
    ).toBe('offline');
  });

  it('separates a first load from an answered error', () => {
    expect(
      queryView(
        { data: undefined, status: 'pending', fetchStatus: 'fetching' },
        false,
      ),
    ).toBe('loading');
    expect(
      queryView(
        { data: undefined, status: 'error', fetchStatus: 'idle' },
        false,
      ),
    ).toBe('error');
  });

  it('leaves a disabled query to the screen (its own empty state)', () => {
    expect(
      queryView(
        { data: undefined, status: 'pending', fetchStatus: 'idle' },
        false,
      ),
    ).toBe('ready');
  });
});
