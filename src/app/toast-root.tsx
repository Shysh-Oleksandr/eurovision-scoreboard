'use client';

import React, { useEffect } from 'react';
import { toast, ToastContainer, Zoom } from 'react-toastify';

import { CheckIcon } from '@/assets/icons/CheckIcon';
import { CircleXIcon } from '@/assets/icons/CircleXIcon';
import { InfoIcon } from '@/assets/icons/InfoIcon';
import { TriangleAlertIcon } from '@/assets/icons/TriangleAlertIcon';
import {
  msSinceLastHaptic,
  playHaptic,
  type HapticCue,
} from '@/native/haptics';

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

export default function ToastRoot() {
  useToastHaptics();

  return (
    <ToastContainer
      draggable
      draggablePercent={20}
      transition={Zoom}
      theme="dark"
      closeButton={false}
      autoClose={2000}
      toastClassName={(context) => {
        const baseClassName = `${context?.defaultClassName} leading-5 bg-gradient-to-tl text-white`;

        if (context?.type === 'error') {
          return `${baseClassName} from-red-900 to-red-800 bg-red-800`;
        }
        if (context?.type === 'warning') {
          return `${baseClassName} from-yellow-900 to-yellow-800 bg-yellow-800`;
        }

        return `${baseClassName} from-primary-900 to-primary-800 bg-primary-800`;
      }}
      progressClassName={(context) => {
        const baseClassName = `${context?.defaultClassName} bg-gradient-to-r`;

        if (context?.type === 'error') {
          return `${baseClassName} from-red-800 to-red-600 bg-red-800`;
        }
        if (context?.type === 'warning') {
          return `${baseClassName} from-yellow-500 to-yellow-400 bg-yellow-500`;
        }

        return `${baseClassName} from-primary-900 to-primary-700 bg-primary-800`;
      }}
      limit={3}
      icon={(props) => {
        if (props.type === 'success') {
          return <CheckIcon />;
        }
        if (props.type === 'error') {
          return <CircleXIcon />;
        }
        if (props.type === 'warning') {
          return <TriangleAlertIcon />;
        }

        return <InfoIcon className="w-6 h-6" />;
      }}
    />
  );
}
