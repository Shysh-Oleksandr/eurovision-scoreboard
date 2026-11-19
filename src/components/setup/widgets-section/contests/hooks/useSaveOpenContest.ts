import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import { getContestThemePayload, parseContestYear } from '../saveContest';

import { useUpdateContestMutation } from '@/api/contests';
import { computeCurrentSetupFingerprint } from '@/helpers/contestFingerprint';
import { buildContestSnapshotFromStores } from '@/helpers/contestSnapshot';
import { toastAxiosError } from '@/helpers/parseAxiosError';
import { useGeneralStore } from '@/state/generalStore';

/**
 * Save on the contest card when the signed-in user owns the loaded contest:
 * no dialog, it stores the setup, results, theme and the general info as they
 * are now (Edit details and Save as a new contest live in the card's ⋯ menu).
 */
export function useSaveOpenContest() {
  const t = useTranslations();
  const { mutateAsync: updateContest } = useUpdateContestMutation();
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  const save = useCallback(async () => {
    const { activeContest, settings } = useGeneralStore.getState();

    if (!activeContest || savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);

    try {
      // Taken before the request: edits made while it runs stay unsaved.
      const snapshot = buildContestSnapshotFromStores();
      const fingerprint = computeCurrentSetupFingerprint();
      const year = parseContestYear(settings.contestYear);

      const contest = await updateContest({
        id: activeContest._id,
        name: settings.contestName.trim() || activeContest.name,
        description: settings.contestDescription.trim(),
        ...(year ? { year } : {}),
        ...(settings.hostingCountryCode
          ? { hostingCountryCode: settings.hostingCountryCode }
          : {}),
        ...getContestThemePayload(),
        snapshot,
      });

      // Still the same contest (nothing else was loaded meanwhile).
      if (useGeneralStore.getState().activeContest?._id === contest._id) {
        useGeneralStore.setState({
          activeContest: contest,
          loadedContestFingerprint: fingerprint,
        });
      }

      toast.success(
        t('widgets.contests.saveDialog.savedToast', {
          name: [contest.name, contest.year].filter(Boolean).join(' '),
        }),
      );
    } catch (error) {
      toastAxiosError(error, t('widgets.contests.failedToSaveContest'));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [t, updateContest]);

  return { save, isSaving };
}
