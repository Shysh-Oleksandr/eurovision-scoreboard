import { create } from 'zustand';
import { useConfirmationStore } from '@/state/confirmationStore';

export interface ConfirmationOptions {
  key: string;
  title: string;
  description?: string;
  type?: 'alert' | 'info' | 'danger';
  onConfirm: () => Promise<void> | void;
}

interface ConfirmationState {
  currentConfirmation: ConfirmationOptions | null;
  setCurrentConfirmation: (confirmation: ConfirmationOptions | null) => void;
  confirm: (options: ConfirmationOptions) => boolean;
  closeModal: () => void;
  handleConfirm: (dontShowAgainChecked: boolean) => void;
  handleCancel: () => void;
}

const useConfirmationStoreInternal = create<ConfirmationState>((set, get) => ({
  currentConfirmation: null,

  setCurrentConfirmation: (confirmation) => {
    set({ currentConfirmation: confirmation });
  },

  confirm: (options: ConfirmationOptions) => {
    const { shouldShowConfirmation } = useConfirmationStore.getState();

    if (shouldShowConfirmation(options.key)) {
      get().setCurrentConfirmation(options);
      return false; // Modal will be shown
    } else {
      // Directly execute action if "don't show again" was selected
      options.onConfirm();
      return true; // Action was executed immediately
    }
  },

  closeModal: () => {
    get().setCurrentConfirmation(null);
  },

  handleConfirm: (dontShowAgainChecked: boolean) => {
    const { currentConfirmation } = get();
    const { setDontShowAgain } = useConfirmationStore.getState();

    if (currentConfirmation) {
      const { key } = currentConfirmation;

      // Update the preference if "don't show again" was checked
      if (dontShowAgainChecked) {
        setDontShowAgain(key, true);
      }

      // Execute the action
      currentConfirmation.onConfirm();

      get().closeModal();
    }
  },

  handleCancel: () => {
    get().closeModal();
  },
}));

export const useConfirmation = () => {
  const {
    currentConfirmation,
    confirm,
    closeModal,
    handleConfirm,
    handleCancel,
  } = useConfirmationStoreInternal();

  return {
    currentConfirmation,
    confirm,
    closeModal,
    handleConfirm,
    handleCancel,
  };
};
