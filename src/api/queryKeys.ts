/**
 * Centralized query keys for React Query.
 * Using a consistent pattern makes it easy to clear user-specific data on logout.
 */

export const queryKeys = {
  // User-specific queries (prefixed with 'user')
  user: {
    profile: () => ['user', 'profile'] as const,
    customEntries: () => ['user', 'custom-entries'] as const,
    themes: () => ['user', 'themes'] as const,
    themeById: (id: string) => ['user', 'theme', id] as const,
    savedThemes: () => ['user', 'saved-themes'] as const,
    themesState: (ids: string[]) =>
      ['user', 'themes-state', { ids: [...ids].sort() }] as const,
    contests: () => ['user', 'contests'] as const,
    contestById: (id: string) => ['user', 'contest', id] as const,
    savedContests: () => ['user', 'saved-contests'] as const,
    contestsState: (ids: string[]) =>
      ['user', 'contests-state', { ids: [...ids].sort() }] as const,
    quickSelectContests: () => ['user', 'quick-select-contests'] as const,
    quickSelectThemes: () => ['user', 'quick-select-themes'] as const,
    quickSelectState: (ids: string[]) =>
      ['user', 'quick-select-state', { ids: [...ids].sort() }] as const,
    // Add more user-specific queries here in the future:
    // savedEvents: () => ['user', 'saved-events'] as const,
    // preferences: () => ['user', 'preferences'] as const,
  },

  // Public queries
  public: {
    themes: (filters: {
      page?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: string;
      startDate?: string;
      endDate?: string;
    }) => ['public', 'themes', filters] as const,
    contests: (filters: {
      page?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: string;
      startDate?: string;
      endDate?: string;
    }) => ['public', 'contests', filters] as const,
    userContent: (userId: string, filters: {
      page?: number;
      type?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: string;
      startDate?: string;
      endDate?: string;
    }) => ['public', 'user-content', userId, filters] as const,
  },

  // Errors queries (admin only)
  errors: {
    all: () => ['errors'] as const,
    list: (params: {
      page?: number;
      limit?: number;
      message?: string;
      userId?: string;
      dateFrom?: string;
      dateTo?: string;
      sortBy?: string;
      sortOrder?: string;
    }) => ['errors', 'list', params] as const,
    detail: (id: string) => ['errors', 'detail', id] as const,
  },

  // Legacy keys (for backward compatibility)
  legacy: {
    meProfile: () => ['me-profile'] as const,
    me: () => ['me'] as const,
  },
} as const;

/**
 * Get all user-specific query key prefixes.
 * These will be cleared on logout.
 */
export const getUserQueryKeyPrefixes = () => [
  queryKeys.user.profile(),
  queryKeys.user.customEntries(),
  queryKeys.user.themes(),
  queryKeys.user.contests(),
  queryKeys.legacy.meProfile(),
  queryKeys.legacy.me(),
];
