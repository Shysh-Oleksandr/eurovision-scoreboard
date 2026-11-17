import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanup, render } from '@testing-library/react';

import { sanitizeGradient } from './ColorOverridePicker';
import SafeColorPicker from './SafeColorPicker';

const { post } = vi.hoisted(() => ({
  post: vi.fn(() => Promise.resolve({})),
}));

vi.mock('@/api/client', () => ({ api: { post } }));

// Stands in for the library: its parser throws on a spaced angle the same way.
vi.mock('react-best-gradient-color-picker', () => ({
  default: ({ value }: { value: string }) => {
    if (/\d\s+deg/.test(value)) {
      throw new Error(`${value.split('(')[1]}: Expected color definition`);
    }

    return <p data-testid="picker">{value}</p>;
  },
}));

afterEach(() => {
  cleanup();
  post.mockClear();
});

const BROKEN =
  'linear-gradient(0 deg,   rgba(2,0,36,1) 0%, rgba(0,212,255,1) 100%)';

describe('sanitizeGradient', () => {
  it('joins a spaced angle and tidies the stops', () => {
    expect(sanitizeGradient(BROKEN)).toBe(
      'linear-gradient(0deg, rgba(2,0,36,1) 0%, rgba(0,212,255,1) 100%)',
    );
    expect(
      sanitizeGradient('linear-gradient(360 deg, RGBA(253, 9, 9, 0.52) 0%)'),
    ).toBe('linear-gradient(360deg, RGBA(253, 9, 9, 0.52) 0%)');
  });

  it('leaves a valid gradient alone', () => {
    const valid =
      'linear-gradient(90deg, rgba(2,0,36,1) 0%, rgba(0,212,255,1) 100%)';

    expect(sanitizeGradient(valid)).toBe(valid);
  });
});

describe('SafeColorPicker', () => {
  it('shows the fallback instead of crashing on a value it cannot read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { getByTestId, rerender } = render(
      <SafeColorPicker
        value={BROKEN}
        fallbackValue="#112233"
        onChange={() => {}}
      />,
    );

    expect(getByTestId('picker').textContent).toBe('#112233');
    await vi.waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        '/errors',
        expect.objectContaining({
          message: 'Color picker could not read a value',
        }),
      ),
    );

    // A new value is tried again.
    rerender(
      <SafeColorPicker
        value="#abcdef"
        fallbackValue="#112233"
        onChange={() => {}}
      />,
    );
    expect(getByTestId('picker').textContent).toBe('#abcdef');
  });
});
