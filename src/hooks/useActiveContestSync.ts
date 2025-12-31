import { useEffect } from 'react';
import { useAuthStore } from '@/state/useAuthStore';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { useContestByIdQuery } from '@/api/contests';

/**
 * Syncs the user's active contest from their profile
 * Fetches and applies the contest when user logs in
 */
export function useActiveContestSync() {
  // const user = useAuthStore((state) => state.user);
  // const activeContest = useGeneralStore((state) => state.activeContest);
  // const setActiveContest = useGeneralStore((state) => state.setActiveContest);
  // const suppressActiveContestOnce = useGeneralStore(
  //   (state) => state.suppressActiveContestOnce,
  // );
  // const setSuppressActiveContestOnce = useGeneralStore(
  //   (state) => state.setSuppressActiveContestOnce,
  // );
  // const blockedActiveContestId = useGeneralStore(
  //   (state) => state.blockedActiveContestId,
  // );
  // const setBlockedActiveContestId = useGeneralStore(
  //   (state) => state.setBlockedActiveContestId,
  // );

  // // Only fetch if user has an activeContestId
  // const shouldFetch = !!user?.activeContestId;

  // const { data: activeContestData } = useContestByIdQuery(
  //   user?.activeContestId || '',
  //   shouldFetch,
  // );

  // TODO: decide if it's needed. Seems like not needed.
  // useEffect(() => {
  //   console.log('suppressActiveContestOnce', suppressActiveContestOnce);
  //   if (suppressActiveContestOnce) {
  //     // We just switched to a static contest locally; skip one profile apply
  //     setSuppressActiveContestOnce(false);
  //     return;
  //   }
  //   console.log('user', user);
  //   console.log('blockedActiveContestId', blockedActiveContestId);
  //   // If the user no longer has an active contest remotely, clear the block
  //   if (user && !user.activeContestId && blockedActiveContestId) {
  //     setBlockedActiveContestId(null);
  //   }

  //   console.log('activeContest', activeContest);
  //   console.log('activeContestData', activeContestData);
  //   console.log('shouldFetch', shouldFetch);
  //   if (activeContestData && shouldFetch) {
  //     // Do not overwrite a locally present active contest that differs from profile
  //     if (activeContest && activeContest._id !== activeContestData._id) {
  //       return;
  //     }
  //     if (
  //       blockedActiveContestId &&
  //       activeContestData._id === blockedActiveContestId
  //     ) {
  //       // Ignore outdated remote contest
  //       return;
  //     }
  //     // Apply the contest from the user's profile
  //     setActiveContest(activeContestData);
  //   }
  // }, [
  //   activeContestData,
  //   user,
  //   shouldFetch,
  //   suppressActiveContestOnce,
  //   setSuppressActiveContestOnce,
  //   blockedActiveContestId,
  //   setBlockedActiveContestId,
  //   activeContest,
  //   setActiveContest,
  // ]);
}
