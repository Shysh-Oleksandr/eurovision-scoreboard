import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './client';
import { queryKeys } from './queryKeys';

/**
 * Content reports (`POST /reports`, `GET /reports/me/state`). One report per
 * user and target; a repeat returns `alreadyReported`.
 */
export type ReportTargetType = 'design' | 'theme' | 'contest';
export type ReportReason = 'spam' | 'offensive' | 'copyright' | 'other';
export const REPORT_REASONS: ReportReason[] = [
  'spam',
  'offensive',
  'copyright',
  'other',
];

export interface ReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}

export function useReportsStateQuery(
  targetType: ReportTargetType,
  ids: string[],
  enabled = true,
) {
  return useQuery<{ reportedIds: string[] }>({
    queryKey: queryKeys.user.reportsState(targetType, ids),
    queryFn: async () => {
      const params = new URLSearchParams({ targetType, ids: ids.join(',') });
      const { data } = await api.get(`/reports/me/state?${params}`);

      return data as { reportedIds: string[] };
    },
    enabled: enabled && ids.length > 0,
    staleTime: 60_000,
  });
}

export function useReportMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReportInput) => {
      const { data } = await api.post('/reports', input);

      return data as { ok: boolean; alreadyReported?: boolean };
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.user.reportsStateAll() }),
  });
}
