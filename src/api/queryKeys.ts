/**
 * Centralized query keys for React Query.
 * Using a consistent pattern makes it easy to clear user-specific data on logout.
 */

export const queryKeys = {
  // User-specific queries (prefixed with 'user')
  user: {
    profile: () => ['user', 'profile'] as const,
    customEntries: () => ['user', 'custom-entries'] as const,
    customEntryGroups: () => ['user', 'custom-entry-groups'] as const,
    /** Prefix for invalidating all current-user theme list queries */
    themes: () => ['user', 'themes'] as const,
    themeGroups: () => ['user', 'theme-groups'] as const,
    themesMeList: (filters: {
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: string;
      startDate?: string;
      endDate?: string;
      hasCustomAudio?: boolean;
      groupId?: string;
    }) => ['user', 'themes', 'me', filters] as const,
    themeById: (id: string) => ['user', 'theme', id] as const,
    /** Prefix for invalidating all saved-theme list queries */
    savedThemes: () => ['user', 'saved-themes'] as const,
    savedThemesList: (filters: {
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: string;
      startDate?: string;
      endDate?: string;
      hasCustomAudio?: boolean;
    }) => ['user', 'saved-themes', filters] as const,
    themesState: (ids: string[]) =>
      ['user', 'themes-state', { ids: [...ids].sort() }] as const,
    /** Prefix for invalidating all current-user contest list queries */
    contests: () => ['user', 'contests'] as const,
    contestGroups: () => ['user', 'contest-groups'] as const,
    contestsMeList: (filters: {
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: string;
      startDate?: string;
      endDate?: string;
      year?: number;
      groupId?: string;
    }) => ['user', 'contests', 'me', filters] as const,
    contestById: (id: string) => ['user', 'contest', id] as const,
    /** Prefix for invalidating all saved-contest list queries */
    savedContests: () => ['user', 'saved-contests'] as const,
    savedContestsList: (filters: {
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: string;
      startDate?: string;
      endDate?: string;
      year?: number;
    }) => ['user', 'saved-contests', filters] as const,
    contestsState: (ids: string[]) =>
      ['user', 'contests-state', { ids: [...ids].sort() }] as const,
    entryStats: (entryCode: string) =>
      ['user', 'entry-stats', entryCode] as const,
    quickSelectContests: () => ['user', 'quick-select-contests'] as const,
    quickSelectThemes: () => ['user', 'quick-select-themes'] as const,
    quickSelectState: (ids: string[]) =>
      ['user', 'quick-select-state', { ids: [...ids].sort() }] as const,
    // Add more user-specific queries here in the future:
    // savedEvents: () => ['user', 'saved-events'] as const,
    // preferences: () => ['user', 'preferences'] as const,
  },

  // Follows
  follows: {
    status: (userId: string) => ['follows', 'status', userId] as const,
    followers: (
      userId: string,
      filters: { page?: number; search?: string },
    ) => ['follows', 'followers', userId, filters] as const,
    followingFeed: (filters: {
      page?: number;
      type?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: string;
      startDate?: string;
      endDate?: string;
    }) => ['follows', 'following-feed', filters] as const,
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
      hasCustomAudio?: boolean;
    }) => ['public', 'themes', filters] as const,
    contests: (filters: {
      page?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: string;
      startDate?: string;
      endDate?: string;
    }) => ['public', 'contests', filters] as const,
    leaderboard: (year: number | 'global') =>
      ['public', 'leaderboard', year] as const,
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
  queryKeys.user.customEntryGroups(),
  queryKeys.user.themes(),
  queryKeys.user.savedThemes(),
  queryKeys.user.themeGroups(),
  queryKeys.user.contests(),
  queryKeys.user.savedContests(),
  queryKeys.user.contestGroups(),
  ['user', 'entry-stats'] as const,
  queryKeys.follows.followingFeed({}),
  queryKeys.legacy.meProfile(),
  queryKeys.legacy.me(),
];
