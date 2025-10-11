import { QueryClient } from '@tanstack/react-query';

import { getUserQueryKeyPrefixes } from './queryKeys';

/**
 * Clears all user-specific data from React Query cache.
 * This should be called on logout to ensure no user data persists.
 *
 * @param queryClient - The React Query client instance
 */
export const clearUserData = (queryClient: QueryClient) => {
  const queryKeyPrefixes = getUserQueryKeyPrefixes();

  // Remove all queries matching user-specific prefixes
  queryKeyPrefixes.forEach((prefix) => {
    queryClient.removeQueries({ queryKey: prefix });
  });

  // Optionally, you can also invalidate them to trigger a refetch
  // when the user logs back in (uncomment if needed)
  // queryKeyPrefixes.forEach((prefix) => {
  //   queryClient.invalidateQueries({ queryKey: prefix });
  // });

  console.log('Cleared user-specific data from React Query cache');
};
