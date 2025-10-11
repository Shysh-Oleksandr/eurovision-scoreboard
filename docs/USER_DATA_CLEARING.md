# User Data Clearing System

This document explains how user-specific data is managed and cleared on logout.

## Architecture Overview

The system uses a centralized approach to manage user-specific data:

1. **React Query** - Source of truth for server data
2. **Zustand Stores** - Derived/cached data for synchronous access
3. **Centralized Clearing** - All user data cleared from one place on logout

## Key Files

- `src/api/queryKeys.ts` - Centralized query key definitions
- `src/api/clearUserData.ts` - Utility to clear user-specific React Query data
- `src/api/queryClient.ts` - Shared QueryClient instance
- `src/state/useAuthStore.ts` - Auth store with logout logic
- `src/components/setup/SyncCustomEntries.tsx` - Syncs React Query → Zustand

## How It Works

### On Login
1. User authenticates
2. `SyncCustomEntries` component fetches data via React Query
3. Data automatically syncs to Zustand stores
4. Components access data from either React Query or Zustand

### On Logout
1. User clicks logout in `ProfileModal`
2. `useAuthStore.logout()` is called
3. Logout function:
   - Calls backend `/auth/logout` endpoint
   - **Clears React Query cache** using `clearUserData(queryClient)`
   - **Clears auth state** (user, accessToken)
   - **Clears Zustand stores** (customCountries, etc.)
4. `SyncCustomEntries` automatically updates Zustand when React Query is cleared
5. UI updates to show logged-out state

## Adding New User-Specific Data

When you add new user-owned data in the future, follow these steps:

### 1. Add Query Key

Edit `src/api/queryKeys.ts`:

```typescript
export const queryKeys = {
  user: {
    profile: () => ['user', 'profile'] as const,
    customEntries: () => ['user', 'custom-entries'] as const,
    
    // Add your new query key here:
    savedEvents: () => ['user', 'saved-events'] as const,
  },
  // ...
};

export const getUserQueryKeyPrefixes = () => [
  queryKeys.user.profile(),
  queryKeys.user.customEntries(),
  queryKeys.user.savedEvents(), // Don't forget to add it here!
  // ...
];
```

### 2. Create API Hooks

Create a new file like `src/api/savedEvents.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { queryKeys } from './queryKeys';

export function useMySavedEventsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.user.savedEvents(),
    queryFn: async () => {
      const { data } = await api.get('/saved-events/me');
      return data;
    },
    enabled,
  });
}

export function useCreateSavedEventMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input) => {
      const { data } = await api.post('/saved-events', input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.savedEvents() });
    },
  });
}
```

### 3. Create Sync Component (if using Zustand)

If you need synchronous access via Zustand:

```typescript
// src/components/setup/SyncSavedEvents.tsx
export const SyncSavedEvents: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const { data: savedEvents } = useMySavedEventsQuery(!!user);

  useEffect(() => {
    if (savedEvents) {
      useSavedEventsStore.setState({ savedEvents });
    } else {
      useSavedEventsStore.setState({ savedEvents: [] });
    }
  }, [savedEvents, user]);

  return null;
};
```

Add it to `EventSetupModal` or root component.

### 4. Add Zustand Store Cleanup

Edit `src/state/useAuthStore.ts` logout function:

```typescript
logout: async () => {
  // ... existing code
  
  // Clear user-specific data from Zustand stores
  useCountriesStore.setState({ customCountries: [] });
  useSavedEventsStore.setState({ savedEvents: [] }); // Add this
  
  // ... rest of code
}
```

## Benefits

✅ **Single Source of Truth** - React Query manages server data  
✅ **Automatic Syncing** - Changes propagate automatically  
✅ **Centralized Clearing** - One place to clear all user data  
✅ **Scalable** - Easy to add new user-specific data  
✅ **Type-Safe** - Query keys are strongly typed  
✅ **Testable** - Clear separation of concerns  

## Testing

To verify the system works:

1. Log in and create custom entries
2. Verify they appear in the UI
3. Log out
4. Check React Query DevTools - user queries should be removed
5. Verify custom entries no longer appear
6. Log back in - data should be refetched automatically
