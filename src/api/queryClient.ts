import { QueryClient } from '@tanstack/react-query';

/**
 * Shared QueryClient instance.
 * This allows us to access the query client from outside React components,
 * such as in Zustand stores or other utilities.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 minute
      gcTime: 5 * 60_000, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
      retry: (failureCount, error: any) => {
        const status = error?.response?.status;

        if (status === 401 || status === 403) return false;

        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
    },
    mutations: {
      retry: 0,
    },
  },
});
