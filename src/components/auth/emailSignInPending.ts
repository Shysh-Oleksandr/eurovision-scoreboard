/**
 * The code request in flight, kept in localStorage so that reopening the
 * dialog (after a reload, or the app being killed while the user was in
 * their mail app) lands on the code step instead of sending another email.
 */

const STORAGE_KEY = 'email-sign-in-pending';

export interface PendingEmailSignIn {
  email: string;
  /** Epoch ms when another code may be requested. */
  resendAt: number;
  /** Epoch ms when the code expires. */
  expiresAt: number;
}

export function loadPendingEmailSignIn(
  now = Date.now(),
): PendingEmailSignIn | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return null;
    const pending = JSON.parse(raw) as Partial<PendingEmailSignIn>;

    if (
      typeof pending.email === 'string' &&
      typeof pending.resendAt === 'number' &&
      typeof pending.expiresAt === 'number' &&
      pending.expiresAt > now
    ) {
      return pending as PendingEmailSignIn;
    }
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked or a malformed entry: start from the email step.
  }

  return null;
}

export function savePendingEmailSignIn(pending: PendingEmailSignIn) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // Not essential: only reopening the dialog loses the code step.
  }
}

export function clearPendingEmailSignIn() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}
