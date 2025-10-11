/**
 * Centralized query keys for React Query.
 * Using a consistent pattern makes it easy to clear user-specific data on logout.
 */

export const queryKeys = {
  // User-specific queries (prefixed with 'user')
  user: {
    profile: () => ['user', 'profile'] as const,
    customEntries: () => ['user', 'custom-entries'] as const,
    // Add more user-specific queries here in the future:
    // savedEvents: () => ['user', 'saved-events'] as const,
    // preferences: () => ['user', 'preferences'] as const,
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
  queryKeys.legacy.meProfile(),
  queryKeys.legacy.me(),
];
