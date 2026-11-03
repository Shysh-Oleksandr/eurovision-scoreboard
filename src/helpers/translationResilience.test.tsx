import { afterEach, describe, expect, it, vi } from 'vitest';

import { act, cleanup, render } from '@testing-library/react';
import { translateSubtree } from 'translation-resilience/simulator';

import { installDomResilience } from './translationResilience';

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
