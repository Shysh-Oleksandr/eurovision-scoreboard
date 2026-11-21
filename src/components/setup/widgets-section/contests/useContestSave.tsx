'use client';

import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import dynamic from 'next/dynamic';

import type { SaveContestDialogMode } from './CreateContestModal';
import { useSaveOpenContest } from './hooks/useSaveOpenContest';

import { toast } from '@/helpers/toast';
import { useIsOffline } from '@/state/connectivityStore';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';

const CreateContestModal = dynamic(() => import('./CreateContestModal'), {
  ssr: false,
});

/**
 * Save for the open contest, shared by the contest card and the simulation's
 * ⋯ menu: one tap on a contest the signed-in user already saved, the save
 * dialog otherwise (not saved yet, or someone else's: "Save a copy"), a
 * sign-in toast when signed out. Render `dialogElement` next to the button.
 */
export function useContestSave({
  returnFocusTo,
}: {
  /** Where focus goes after the dialog when its opener is gone (a menu). */
  returnFocusTo?: () => HTMLElement | null | undefined;
} = {}) {
  const t = useTranslations();
  const user = useAuthStore((state) => state.user);
  const activeContest = useGeneralStore((state) => state.activeContest);
  const offline = useIsOffline();
  const { save: saveOpenContest, isSaving } = useSaveOpenContest();
  // Stays set after closing so the dialog can animate out; `key` remounts
  // it per open so its form starts from the current state.
  const [dialog, setDialog] = useState<{
    mode: SaveContestDialogMode;
    key: number;
    open: boolean;
  } | null>(null);

  const ownsOpenContest =
    !!activeContest && !!user && activeContest.userId.toString() === user._id;
  /** Signed in and the open contest is someone else's. */
  const isCopy = !!activeContest && !!user && !ownsOpenContest;

  const openDialog = (mode: SaveContestDialogMode) =>
    setDialog((prev) => ({ mode, key: (prev?.key ?? 0) + 1, open: true }));

  const save = () => {
    if (!user) {
      toast.info(t('widgets.contests.pleaseSignInToSaveContests'));

      return;
    }
    if (ownsOpenContest) {
      void saveOpenContest();

      return;
    }
    openDialog('new');
  };

  const dialogElement = dialog ? (
    <CreateContestModal
      key={dialog.key}
      isOpen={dialog.open}
      onClose={() =>
        setDialog((current) => current && { ...current, open: false })
      }
      mode={dialog.mode}
      contest={
        dialog.mode === 'details' ? activeContest ?? undefined : undefined
      }
      returnFocusTo={returnFocusTo}
    />
  ) : null;

  return {
    save,
    openDialog,
    ownsOpenContest,
    isCopy,
    isSaving,
    offline,
    dialogElement,
  };
}
