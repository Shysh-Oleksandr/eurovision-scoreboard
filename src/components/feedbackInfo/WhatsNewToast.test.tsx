import { toast, ToastContainer } from 'react-toastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

import { readAnnouncedUpdate } from './announcedUpdate';
import { LATEST_UPDATE_KEY } from './data';
import WhatsNewToast from './WhatsNewToast';

import { useGeneralStore } from '@/state/generalStore';

const translators = new Map<string, (key: string) => string>();

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => {
    if (!translators.has(namespace)) {
      translators.set(namespace, (key: string) => `${namespace}.${key}`);
    }

    return translators.get(namespace);
  },
}));

let notices: { bundle: unknown; store: unknown } = {
  bundle: null,
  store: null,
};

vi.mock('@/native/liveUpdate', () => ({
  liveUpdateBoot: () => Promise.resolve(),
  getLiveUpdateNotices: () => notices,
}));

vi.mock('next/dynamic', () => ({
  default:
    () =>
    ({ showModal, initialTab }: { showModal: boolean; initialTab: string }) =>
      (
        <div
          data-testid="feedback-modal"
          data-open={String(showModal)}
          data-tab={initialTab}
        />
      ),
}));

const renderToast = () =>
  render(
    <>
      <ToastContainer />
      <WhatsNewToast />
    </>,
  );

/** Past liveUpdateBoot() and the 3 s delay. */
const waitForTheDelay = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(3100);
  });

describe('WhatsNewToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    notices = { bundle: null, store: null };
    useGeneralStore.setState({ lastSeenUpdate: null });
  });

  afterEach(() => {
    toast.dismiss();
    cleanup();
    vi.useRealTimers();
  });

  it('announces a new entry once and opens What’s new from it', async () => {
    renderToast();
    expect(screen.queryByText('feedbackInfo.updatedToast')).toBeNull();

    await waitForTheDelay();

    expect(screen.getByText('feedbackInfo.updatedToast')).toBeInTheDocument();
    expect(readAnnouncedUpdate()).toBe(LATEST_UPDATE_KEY);

    fireEvent.click(screen.getByText('feedbackInfo.seeWhatsNew'));

    const modal = screen.getByTestId('feedback-modal');

    expect(modal).toHaveAttribute('data-open', 'true');
    expect(modal).toHaveAttribute('data-tab', 'whats-new');
  });

  it('stays quiet once the entry was announced', async () => {
    window.localStorage.setItem('dp-whats-new-announced', LATEST_UPDATE_KEY!);
    renderToast();

    await waitForTheDelay();

    expect(screen.queryByText('feedbackInfo.updatedToast')).toBeNull();
  });

  it('waits for a launch without a pending update', async () => {
    notices = { bundle: { level: 'prompt', version: '1' }, store: null };
    renderToast();

    await waitForTheDelay();

    expect(screen.queryByText('feedbackInfo.updatedToast')).toBeNull();
    expect(readAnnouncedUpdate()).toBeNull();
  });
});
