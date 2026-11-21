'use client';

import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { TypeOptions } from 'react-toastify';

import { toast } from '@/helpers/toast';

/** How long the action's answer ("Copied") shows before the toast leaves. */
const DONE_CLOSE_MS = 1200;
/** Time to reach the action (a toast without one closes after 2–6 s). */
const ACTION_AUTO_CLOSE_MS = 6000;

interface ToastBodyProps {
  message: string;
  /** The action's label: "Copy link", "Undo". */
  action: string;
  /** Replaces the action once it has run: "Copied". */
  doneLabel: string;
  onAction: () => unknown;
  closeToast?: () => void;
}

/**
 * A toast's message and one text action. The action sits after the message
 * and moves under it when both don't fit on one line (styles.css
 * `.dp-toast-body`). It answers in place ("Copied") and the toast leaves
 * shortly after, rather than raising a second toast.
 */
export function ToastBody({
  message,
  action,
  doneLabel,
  onAction,
  closeToast,
}: ToastBodyProps) {
  const [done, setDone] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const run = () => {
    Promise.resolve()
      .then(onAction)
      .then(() => {
        setDone(true);
        closeTimer.current = window.setTimeout(
          () => closeToast?.(),
          DONE_CLOSE_MS,
        );
      })
      .catch(() => undefined);
  };

  return (
    <div className="dp-toast-body">
      <span className="dp-toast-msg">{message}</span>
      {done ? (
        <span className="dp-toast-act" data-done="">
          <Check aria-hidden="true" />
          {doneLabel}
        </span>
      ) : (
        <button type="button" className="dp-toast-act" onClick={run}>
          {action}
        </button>
      )}
    </div>
  );
}

/** A toast with one follow-up action (see `ToastBody`). */
export const toastWithAction = ({
  type = 'success',
  ...body
}: Omit<ToastBodyProps, 'closeToast'> & { type?: TypeOptions }) =>
  toast(({ closeToast }) => <ToastBody {...body} closeToast={closeToast} />, {
    type,
    autoClose: ACTION_AUTO_CLOSE_MS,
    // A tap on the action mustn't close the toast before it answers.
    closeOnClick: false,
  });
