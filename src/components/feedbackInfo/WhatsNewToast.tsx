'use client';

import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import {
  markLatestUpdateAnnounced,
  readAnnouncedUpdate,
  shouldAnnounceLatestUpdate,
} from './announcedUpdate';
import { LATEST_UPDATE_KEY } from './data';

import { ActionToast } from '@/components/common/ActionToast';
import { toast } from '@/helpers/toast';
import { getLiveUpdateNotices, liveUpdateBoot } from '@/native/liveUpdate';
import { useGeneralStore } from '@/state/generalStore';

const FeedbackModal = dynamic(() => import('./FeedbackModal'), {
  ssr: false,
});

const TOAST_ID = 'whats-new';
/** After the splash and the first screen's entrance. */
const SHOW_DELAY_MS = 3000;
const AUTO_CLOSE_MS = 10_000;

/**
 * After an update brings a new What's new entry (a store build or a live
 * update), the apps say so once: a toast whose action opens What's new.
 * The feedback button's dot stays until the user opens it. Native apps only;
 * app-bootstrap.tsx mounts it lazily (docs/native-apps.md §11).
 */
export default function WhatsNewToast() {
  const t = useTranslations('feedbackInfo');
  const tLiveUpdate = useTranslations('liveUpdate');
  const [showModal, setShowModal] = useState(false);
  const [isModalMounted, setIsModalMounted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    // A launch that switches to a downloaded bundle reloads first; that
    // bundle decides what's new.
    void liveUpdateBoot().then(() => {
      if (cancelled) return;

      timer = window.setTimeout(() => {
        const { bundle, store } = getLiveUpdateNotices();

        if (
          document.visibilityState !== 'visible' ||
          // An update waiting to be installed goes first; this one can
          // wait for the launch after it.
          bundle ||
          store ||
          !shouldAnnounceLatestUpdate({
            latest: LATEST_UPDATE_KEY,
            announced: readAnnouncedUpdate(),
            lastSeenUpdate: useGeneralStore.getState().lastSeenUpdate,
          })
        ) {
          return;
        }

        markLatestUpdateAnnounced();
        toast(
          <ActionToast
            message={t('updatedToast')}
            action={t('seeWhatsNew')}
            later={tLiveUpdate('later')}
            onAction={() => {
              toast.dismiss(TOAST_ID);
              setIsModalMounted(true);
              setShowModal(true);
            }}
            onLater={() => toast.dismiss(TOAST_ID)}
          />,
          {
            toastId: TOAST_ID,
            icon: <Sparkles />,
            autoClose: AUTO_CLOSE_MS,
            closeOnClick: false,
          },
        );
      }, SHOW_DELAY_MS);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [t, tLiveUpdate]);

  // Kept mounted after the first open so it can animate out.
  return isModalMounted ? (
    <FeedbackModal
      showModal={showModal}
      setShowModal={setShowModal}
      initialTab="whats-new"
    />
  ) : null;
}
