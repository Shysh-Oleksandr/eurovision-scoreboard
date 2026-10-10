import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './client';
import { queryKeys } from './queryKeys';
import type { ReportReason, ReportTargetType } from './reports';

/** Admin-only moderation queue (`/moderation/*`). */
export interface ModerationProfile {
  _id: string;
  username: string;
  name?: string;
  avatarUrl?: string;
}

export interface ModerationItem {
  targetType: ReportTargetType;
  targetId: string;
  count: number;
  latestAt: string;
  resolution?: 'dismissed' | 'removed';
  resolvedAt?: string;
  /** Absent when the item was deleted after it was reported. */
  target?: { name: string; isPublic?: boolean; thumbnailUrl?: string };
  owner?: ModerationProfile;
  reasons: Partial<Record<ReportReason, number>>;
  reports: Array<{
    reason: ReportReason;
    details?: string;
    createdAt: string;
    reporter?: ModerationProfile;
  }>;
}

export interface ModerationQueue {
  items: ModerationItem[];
  total: number;
  page: number;
  totalPages: number;
}

export type ModerationTarget = Pick<ModerationItem, 'targetType' | 'targetId'>;

export function useModerationReportsQuery(
  params: { status: 'open' | 'resolved'; page: number },
  enabled: boolean,
) {
  return useQuery<ModerationQueue>({
    queryKey: queryKeys.moderation.reports(params),
    queryFn: async () => {
      const { data } = await api.get('/moderation/reports', { params });

      return data as ModerationQueue;
    },
    enabled,
  });
}

function useModerationMutation<T>(mutationFn: (input: T) => Promise<unknown>) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.moderation.all() }),
  });
}

/** Keep the item, close its reports. */
export const useDismissReportsMutation = () =>
  useModerationMutation((target: ModerationTarget) =>
    api.post('/moderation/reports/dismiss', target),
  );

/** Delete the item (a profile: the whole account), close its reports. */
export const useRemoveContentMutation = () =>
  useModerationMutation((target: ModerationTarget) =>
    api.post('/moderation/content/remove', target),
  );

/** Remove a user from the service: their account and all of their content. */
export const useDeleteUserMutation = () =>
  useModerationMutation((userId: string) =>
    api.delete(`/moderation/users/${userId}`),
  );
