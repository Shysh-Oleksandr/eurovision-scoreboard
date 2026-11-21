import {
  toast as baseToast,
  type ToastContent,
  type ToastOptions,
  type TypeOptions,
} from 'react-toastify';

/**
 * react-toastify's `toast` with the app's defaults (DESIGN.md "Toasts"):
 * - how long a toast stays follows how long its text takes to read, and an
 *   error stays longer than a confirmation (it keeps a close button,
 *   src/app/toast-root.tsx);
 * - screen readers hear confirmations politely (`status`) and only errors
 *   as alerts;
 * - the same text of the same type shown again while it's up isn't stacked
 *   a second time.
 * Import `toast` from here, not from react-toastify. A call's own options
 * win over these.
 */

const CONFIRMATION_MS = { base: 700, perChar: 55, min: 2000, max: 6000 };
const ERROR_MS = { base: 1500, perChar: 60, min: 5000, max: 10_000 };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** The characters to read, when the content is plain text. */
const textOf = (content: unknown): string | null =>
  typeof content === 'string' || typeof content === 'number'
    ? String(content)
    : null;

const isError = (type: TypeOptions | undefined) =>
  type === 'error' || type === 'warning';

/** Reading time for a toast's text: a floor, then a little per character. */
export const toastDuration = (
  type: TypeOptions | undefined,
  content: unknown,
): number => {
  const length = textOf(content)?.length ?? 0;
  const { base, perChar, min, max } = isError(type)
    ? ERROR_MS
    : CONFIRMATION_MS;

  return clamp(base + perChar * length, min, max);
};

const withDefaults = <T>(
  type: TypeOptions | undefined,
  content: ToastContent<T>,
  options: ToastOptions<T> | undefined,
): ToastOptions<T> => {
  const text = textOf(content);

  return {
    autoClose: toastDuration(type, content),
    role: type === 'error' ? 'alert' : 'status',
    ...(text !== null && { toastId: `${type ?? 'default'}:${text}` }),
    ...options,
  };
};

const typed =
  (type: TypeOptions) =>
  <T = unknown>(content: ToastContent<T>, options?: ToastOptions<T>) =>
    baseToast(content, { ...withDefaults(type, content, options), type });

export const toast: typeof baseToast = Object.assign(
  <T = unknown>(content: ToastContent<T>, options?: ToastOptions<T>) =>
    baseToast(content, withDefaults(options?.type, content, options)),
  baseToast,
  {
    success: typed('success'),
    info: typed('info'),
    error: typed('error'),
    warning: typed('warning'),
    warn: typed('warning'),
  },
);
