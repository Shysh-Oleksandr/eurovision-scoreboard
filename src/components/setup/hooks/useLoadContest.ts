import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { api } from '@/api/client';
import { toast } from '@/helpers/toast';
import { useGeneralStore } from '@/state/generalStore';
import { Contest } from '@/types/contest';

export const useLoadContest = () => {
  const setContestToLoad = useGeneralStore((state) => state.setContestToLoad);
  const t = useTranslations();

  const handleProfileLoadContest = useCallback(
    async (contest: Contest) => {
      try {
        const { data } = await api.get(`/contests/${contest._id}/snapshot`);

        setContestToLoad({ contest, snapshot: data });
      } catch (e: any) {
        toast.error(
          e?.response?.data?.message ||
            t('widgets.contests.failedToLoadContest'),
        );
      }
    },
    [setContestToLoad, t],
  );

  return handleProfileLoadContest;
};
