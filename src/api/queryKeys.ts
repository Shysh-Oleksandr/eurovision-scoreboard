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
    themesState: (ids: string[]) => ['user', 'themes-state', { ids: [...ids].sort() }] as const,
    // Add more user-specific queries here in the future:
    // savedEvents: () => ['user', 'saved-events'] as const,
    // preferences: () => ['user', 'preferences'] as const,
  },

  // Public queries
  public: {
    themes: (filters: { page?: number; search?: string; sortBy?: string }) =>
      ['public', 'themes', filters] as const,
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
  queryKeys.legacy.meProfile(),
  queryKeys.legacy.me(),
];
