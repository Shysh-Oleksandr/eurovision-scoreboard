import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toast, toastDuration } from './toast';

const base = vi.hoisted(() =>
  Object.assign(
    vi.fn(() => 'id'),
    {
      dismiss: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
    },
  ),
);

vi.mock('react-toastify', () => ({ toast: base }));

describe('toastDuration', () => {
  it('gives confirmations their reading time between 2 and 6 s', () => {
    expect(toastDuration('success', 'Saved')).toBe(2000);
    // 700 + 55 × 30 characters
    expect(toastDuration('success', 'Saved “Junior Eurovision 2026”')).toBe(
      2350,
    );
    expect(toastDuration('info', 'x'.repeat(200))).toBe(6000);
  });

  it('keeps errors and warnings up for at least 5 s, at most 10 s', () => {
    expect(toastDuration('error', 'Failed')).toBe(5000);
    expect(toastDuration('warning', 'Failed')).toBe(5000);
    expect(toastDuration('error', 'x'.repeat(200))).toBe(10_000);
  });

  it('falls back to the floor when the content is not text', () => {
    expect(toastDuration('success', () => null)).toBe(2000);
    expect(toastDuration('error', { type: 'div' })).toBe(5000);
  });
});

describe('toast', () => {
  beforeEach(() => base.mockClear());

  it('announces confirmations politely and errors as alerts', () => {
    toast.success('Saved');
    toast.error('Failed');

    expect(base).toHaveBeenNthCalledWith(
      1,
      'Saved',
      expect.objectContaining({
        type: 'success',
        role: 'status',
        autoClose: 2000,
      }),
    );
    expect(base).toHaveBeenNthCalledWith(
      2,
      'Failed',
      expect.objectContaining({
        type: 'error',
        role: 'alert',
        autoClose: 5000,
      }),
    );
  });

  it('gives the same text of the same type one id, so it is not stacked twice', () => {
    toast.success('Link copied');
    toast.success('Link copied');
    toast.error('Link copied');

    const ids = base.mock.calls.map(
      (call) => (call as unknown as [unknown, { toastId: string }])[1].toastId,
    );

    expect(ids).toEqual([
      'success:Link copied',
      'success:Link copied',
      'error:Link copied',
    ]);
  });

  it("lets the call's own options win", () => {
    toast('Restart?', { autoClose: false, toastId: 'live-update' });

    expect(base).toHaveBeenCalledWith(
      'Restart?',
      expect.objectContaining({ autoClose: false, toastId: 'live-update' }),
    );
  });

  it('keeps the rest of the toast API', () => {
    toast.dismiss('id');

    expect(base.dismiss).toHaveBeenCalledWith('id');
  });
});
