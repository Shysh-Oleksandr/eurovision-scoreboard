import { create } from 'zustand';

interface EmailSignInState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

/**
 * One email sign-in dialog for the whole app (`EmailSignInHost` in
 * Providers): every `SignInButtons` opens it over whatever modal it sits in.
 */
export const useEmailSignInStore = create<EmailSignInState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));

export const openEmailSignIn = () => useEmailSignInStore.getState().open();
