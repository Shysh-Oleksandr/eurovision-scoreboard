'use client';

import { Check, CircleAlert, Info, TriangleAlert, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect } from 'react';
import {
  type CloseButtonProps,
  cssTransition,
  type IconProps,
  ToastContainer,
} from 'react-toastify';

import { toast } from '@/helpers/toast';
import {
  msSinceLastHaptic,
  playHaptic,
  type HapticCue,
} from '@/native/haptics';
import { noteReviewSetback } from '@/native/review';

/** A toast this soon after another cue confirms an action already felt. */
const TOAST_AFTER_CUE_MS = 300;
/** Long enough for the action's own cue (fired after its toast) to land. */
const TOAST_DEFER_MS = 80;

/**
 * Every success, warning and error toast is felt too (native apps,
 * docs/haptics.md): saved, exported, signed in, failures. Not when the
 * action that raised it just played its own cue (a drop that moved a
 * country, a shuffle): the toast is then only its caption.
 */
function useToastHaptics() {
  useEffect(
    () =>
      toast.onChange((item) => {
        if (item.status !== 'added') return;

        let cue: HapticCue | null = null;

        if (item.type === 'success') cue = { id: 'success' };
        else if (item.type === 'error') cue = { id: 'error' };
        else if (item.type === 'warning') cue = { id: 'warning' };
        if (!cue) return;

        const toastCue = cue;
        const addedAt = performance.now();

        if (msSinceLastHaptic() < TOAST_AFTER_CUE_MS) return;
        window.setTimeout(() => {
          // Nothing else played since the toast appeared.
          if (msSinceLastHaptic() > performance.now() - addedAt) {
            playHaptic(toastCue);
          }
        }, TOAST_DEFER_MS);
      }),
    [],
  );
}

/** After an error toast the apps won't ask for a store rating this session. */
function useToastReviewSetbacks() {
  useEffect(
    () =>
      toast.onChange((item) => {
        if (item.status === 'added' && item.type === 'error') {
          noteReviewSetback();
        }
      }),
    [],
  );
}

/**
 * Rises from the top edge and settles; leaves by lifting and fading
 * (styles.css `.dp-toast-in` / `.dp-toast-out`, a fade with reduced motion).
 */
const toastTransition = cssTransition({
  enter: 'dp-toast-in',
  exit: 'dp-toast-out',
  collapseDuration: 200,
});

/** Status is the icon's colour only (styles.css `.dp-toast`). */
const ToastIcon = ({ type }: IconProps) => {
  if (type === 'success') return <Check />;
  if (type === 'error') return <CircleAlert />;
  if (type === 'warning') return <TriangleAlert />;

  return <Info />;
};

/**
 * Toasts look and sit the same everywhere (DESIGN.md "Toasts"): the menus'
 * material in the theme's font, as wide as their text, top centre, where no
 * header keeps its actions. Durations and roles come with each toast
 * (src/helpers/toast.ts); no countdown bar.
 */
export default function ToastRoot() {
  const t = useTranslations('common');

  useToastHaptics();
  useToastReviewSetbacks();

  // Only errors stay long enough to need a close button; a tap or an upward
  // swipe dismisses the rest.
  const closeButton = ({ closeToast, type }: CloseButtonProps) =>
    type === 'error' ? (
      <button
        type="button"
        className="dp-toast-close"
        aria-label={t('close')}
        onClick={(event) => {
          event.stopPropagation();
          closeToast(event);
        }}
      >
        <X aria-hidden="true" />
      </button>
    ) : null;

  return (
    <ToastContainer
      position="top-center"
      newestOnTop
      draggable
      draggableDirection="y"
      draggablePercent={50}
      transition={toastTransition}
      theme="dark"
      hideProgressBar
      closeButton={closeButton}
      autoClose={2000}
      role="status"
      limit={3}
      toastClassName="dp-toast"
      icon={ToastIcon}
    />
  );
}
