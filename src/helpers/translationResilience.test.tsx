import { afterEach, describe, expect, it, vi } from 'vitest';

import { act, cleanup, render } from '@testing-library/react';
import { translateSubtree } from 'translation-resilience/simulator';

import { installDomResilience } from './translationResilience';

const { post } = vi.hoisted(() => ({ post: vi.fn(() => Promise.resolve({})) }));

vi.mock('@/api/client', () => ({ api: { post } }));

/** Yandex Browser's translator: each text node becomes a `<ya-tr-span>`, the original is detached. */
function yandexTranslate(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];

  while (walker.nextNode()) texts.push(walker.currentNode as Text);

  for (const text of texts) {
    const wrapper = document.createElement('ya-tr-span');

    wrapper.setAttribute('data-value', text.data);
    wrapper.textContent = `RU ${text.data}`;
    text.parentNode?.replaceChild(wrapper, text);
  }
}

function Board({ points, showBadge }: { points: number; showBadge: boolean }) {
  return (
    <p>
      {showBadge && 'Douze points!'}
      {points} points
    </p>
  );
}

let uninstall: (() => void) | undefined;

afterEach(() => {
  // No vitest globals, so Testing Library doesn't clean up by itself; a
  // leftover `<ya-tr-span>` would arm the guard for the next test.
  cleanup();
  uninstall?.();
  uninstall = undefined;
});

const renderTranslated = (translate: (root: Node) => void) => {
  const view = render(<Board points={8} showBadge />);

  translate(view.container);

  return view;
};

describe('page translated by Yandex Browser', () => {
  it('crashes React without the guard', () => {
    const { rerender } = renderTranslated(yandexTranslate);

    expect(() =>
      act(() => rerender(<Board points={8} showBadge={false} />)),
    ).toThrow(/not a child|NotFound/i);
  });

  it('keeps React running with it and reports the repair', () => {
    const onEvent = vi.fn();

    uninstall = installDomResilience(onEvent);
    const { rerender, container } = renderTranslated(yandexTranslate);

    expect(() =>
      act(() => rerender(<Board points={8} showBadge={false} />)),
    ).not.toThrow();
    expect(container.querySelector('p')).not.toBeNull();
    expect(onEvent).toHaveBeenCalledWith(
      'Yandex: removeChild of a displaced node',
    );
  });

  it('still throws a genuine NotFoundError on an untranslated page', () => {
    uninstall = installDomResilience(() => {});
    const parent = document.createElement('div');

    expect(() => parent.removeChild(document.createTextNode('x'))).toThrow();
  });
});

describe('page translated by Chrome', () => {
  it('keeps updated text visible', () => {
    uninstall = installDomResilience(() => {});
    const { rerender, container } = renderTranslated(translateSubtree);

    act(() => rerender(<Board points={12} showBadge={false} />));

    expect(container.textContent).toContain('12');
  });
});

describe('reportDomRepair', () => {
  const SIGNAL = 'translation signal detected, observing document';
  const REPAIR = 'removeChild: removing node from its actual parent';

  // The reporter keeps per-page-load state: a fresh module per test.
  const loadReporter = async () => {
    vi.resetModules();

    return (await import('./translationResilience')).reportDomRepair;
  };

  afterEach(() => {
    vi.useRealTimers();
    post.mockClear();
    localStorage.clear();
  });

  it('stays quiet while translation only switches on', async () => {
    vi.useFakeTimers();
    const report = await loadReporter();

    report(SIGNAL);
    report('translation activity detected');
    await vi.advanceTimersByTimeAsync(10_000);

    expect(post).not.toHaveBeenCalled();
  });

  it('reports a repair once, with the earlier events as context', async () => {
    vi.useFakeTimers();
    const report = await loadReporter();

    report(SIGNAL);
    report(REPAIR);
    report('Yandex: removeChild of a displaced node');
    await vi.advanceTimersByTimeAsync(5_000);
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(1));

    expect(post).toHaveBeenCalledWith(
      '/errors',
      expect.objectContaining({
        message: `DOM repaired: ${REPAIR}`,
        generalInfo: {
          domRepairs: [
            { message: SIGNAL, count: 1 },
            { message: REPAIR, count: 1 },
            { message: 'Yandex: removeChild of a displaced node', count: 1 },
          ],
        },
      }),
    );

    report(REPAIR);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('reports at most once a day per browser', async () => {
    vi.useFakeTimers();
    localStorage.setItem('dom-repair-reported-at', String(Date.now()));
    const report = await loadReporter();

    report(REPAIR);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(post).not.toHaveBeenCalled();
  });
});
