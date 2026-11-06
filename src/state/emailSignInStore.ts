import { create } from 'zustand';

/**
 * `signIn`: sign in or sign up with a code. `link`: add or change the
 * signed-in account's address (the sign-in methods in Edit profile).
 */
export type EmailDialogMode = 'signIn' | 'link';

interface EmailSignInState {
  isOpen: boolean;
  mode: EmailDialogMode;
  open: (mode?: EmailDialogMode) => void;
  close: () => void;
}

/**
 * One email sign-in dialog for the whole app (`EmailSignInHost` in
 * Providers): every `SignInButtons` opens it over whatever modal it sits in.
 */
export const useEmailSignInStore = create<EmailSignInState>((set) => ({
  isOpen: false,
  mode: 'signIn',
  open: (mode = 'signIn') => set({ isOpen: true, mode }),
  close: () => set({ isOpen: false }),
}));

export const openEmailSignIn = () => useEmailSignInStore.getState().open();

/** Opens the dialog to add or change the signed-in account's address. */
export const openEmailLink = () => useEmailSignInStore.getState().open('link');
