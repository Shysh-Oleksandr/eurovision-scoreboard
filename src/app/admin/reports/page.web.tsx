'use client';

import { ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import { useRouter } from 'next/navigation';

import {
  type ModerationItem,
  useDeleteUserMutation,
  useDismissReportsMutation,
  useModerationReportsQuery,
  useRemoveContentMutation,
} from '@/api/moderation';
import type { ReportTargetType } from '@/api/reports';
import Button from '@/components/common/Button';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useAuthStore } from '@/state/useAuthStore';

const TYPE_LABELS: Record<ReportTargetType, string> = {
  theme: 'Theme',
  contest: 'Contest',
  design: 'Design',
  font: 'Font',
  profile: 'User',
};

/** Share-link query key per type; fonts have no page of their own. */
const LINK_PARAM: Partial<Record<ReportTargetType, string>> = {
  theme: 'theme',
  contest: 'contest',
  design: 'design',
  profile: 'profile',
};

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString() : '';

const userLabel = (user?: { username: string; name?: string }) =>
  user ? `${user.name || user.username} (@${user.username})` : 'deleted user';

/**
 * The report queue (App Store guideline 1.2 expects reported content to be
 * dealt with within 24 hours): dismiss, remove the item, or delete the
 * account of the user who posted it.
 */
function AdminReportsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const { confirm } = useConfirmation();

  useEffect(() => {
    if (accessToken !== null && (!user || !user.isAdmin)) {
      router.push('/');
    }
  }, [user, accessToken, router]);

  const [status, setStatus] = useState<'open' | 'resolved'>('open');
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useModerationReportsQuery(
    { status, page },
    !!accessToken && !!user?.isAdmin,
  );

  const dismiss = useDismissReportsMutation();
  const remove = useRemoveContentMutation();
  const deleteUser = useDeleteUserMutation();
  const isActing =
    dismiss.isPending || remove.isPending || deleteUser.isPending;

  const run = async (action: Promise<unknown>, done: string) => {
    try {
      await action;
      toast.success(done);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Action failed');
    }
  };

  const onRemove = (item: ModerationItem) =>
    confirm({
      key: 'moderation-remove',
      type: 'danger',
      title:
        item.targetType === 'profile'
          ? `Delete the account ${userLabel(item.owner)}?`
          : `Remove ${TYPE_LABELS[item.targetType].toLowerCase()} “${
              item.target?.name ?? item.targetId
            }”?`,
      description:
        item.targetType === 'profile'
          ? 'Deletes the account and everything it owns. This cannot be undone.'
          : 'Deletes the item and its uploads, and closes its reports.',
      onConfirm: () => run(remove.mutateAsync(item), 'Removed'),
    });

  const onDeleteOwner = (item: ModerationItem) => {
    const { owner } = item;

    if (!owner) return;

    confirm({
      key: 'moderation-delete-user',
      type: 'danger',
      title: `Delete the account ${userLabel(owner)}?`,
      description:
        'Removes the user from the service with all of their content. This cannot be undone.',
      onConfirm: () =>
        run(deleteUser.mutateAsync(owner._id), 'Account deleted'),
    });
  };

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-primary-950 text-white p-8">
        Checking access…
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-primary-950 text-white safe-area-padding">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Reports</h1>
            <p className="text-white/60 text-sm mt-1">
              {data
                ? `${data.total} reported item${data.total === 1 ? '' : 's'}`
                : ' '}
            </p>
          </div>
          <div className="flex gap-2">
            {(['open', 'resolved'] as const).map((value) => (
              <Button
                key={value}
                variant={status === value ? 'cta' : 'tertiary'}
                size="md"
                onClick={() => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                {value === 'open' ? 'Open' : 'Resolved'}
              </Button>
            ))}
          </div>
        </header>

        {isLoading ? (
          <p className="text-white/60">Loading…</p>
        ) : error ? (
          <p className="text-red-300">Couldn&apos;t load the reports.</p>
        ) : !data?.items.length ? (
          <p className="text-white/60">Nothing here.</p>
        ) : (
          <ul className="space-y-4">
            {data.items.map((item) => {
              const param = LINK_PARAM[item.targetType];
              const link =
                param && item.target ? `/?${param}=${item.targetId}` : null;

              return (
                <li
                  key={`${item.targetType}:${item.targetId}`}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="rounded-full bg-white/10 px-2 py-0.5 font-semibold">
                          {TYPE_LABELS[item.targetType]}
                        </span>
                        <span className="text-white/60">
                          {item.count} report{item.count === 1 ? '' : 's'} ·
                          latest {formatDate(item.latestAt)}
                        </span>
                        {item.resolution && (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/70">
                            {item.resolution} {formatDate(item.resolvedAt)}
                          </span>
                        )}
                      </div>
                      <div className="text-lg font-semibold break-words">
                        {item.target?.name ?? (
                          <span className="text-white/50">
                            (deleted) {item.targetId}
                          </span>
                        )}
                        {item.target?.isPublic === false && (
                          <span className="text-white/50 text-sm font-normal">
                            {' '}
                            · private
                          </span>
                        )}
                      </div>
                      {item.targetType !== 'profile' && (
                        <div className="text-sm text-white/70">
                          By {userLabel(item.owner)}
                        </div>
                      )}
                      <div className="text-sm text-white/70">
                        {Object.entries(item.reasons)
                          .map(([reason, n]) => `${reason} ×${n}`)
                          .join(', ')}
                      </div>
                    </div>
                    {item.target?.thumbnailUrl && (
                      <img
                        src={item.target.thumbnailUrl}
                        alt=""
                        className="h-20 rounded-lg object-contain bg-black/30"
                      />
                    )}
                  </div>

                  <ul className="space-y-1.5 text-sm">
                    {item.reports.map((report) => (
                      <li
                        key={`${report.createdAt}:${report.reporter?._id}`}
                        className="text-white/80"
                      >
                        <span className="text-white/50">
                          {formatDate(report.createdAt)} ·{' '}
                          {userLabel(report.reporter)} · {report.reason}
                        </span>
                        {report.details && (
                          <div className="pl-3 border-l border-white/15 mt-0.5 whitespace-pre-wrap break-words">
                            {report.details}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-wrap gap-2">
                    {link && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-[13px] font-extrabold uppercase"
                      >
                        <ExternalLink className="size-4" />
                        Open
                      </a>
                    )}
                    {status === 'open' && (
                      <>
                        <Button
                          variant="tertiary"
                          size="md"
                          disabled={isActing}
                          onClick={() =>
                            run(dismiss.mutateAsync(item), 'Dismissed')
                          }
                        >
                          Dismiss
                        </Button>
                        <Button
                          variant="destructive"
                          size="md"
                          disabled={isActing}
                          onClick={() => onRemove(item)}
                        >
                          {item.targetType === 'profile'
                            ? 'Delete account'
                            : 'Remove content'}
                        </Button>
                        {item.targetType !== 'profile' && item.owner && (
                          <Button
                            variant="destructive"
                            size="md"
                            disabled={isActing}
                            onClick={() => onDeleteOwner(item)}
                          >
                            Delete creator&apos;s account
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center gap-3">
            <Button
              variant="tertiary"
              size="md"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-white/60 text-sm">
              Page {data.page} of {data.totalPages}
            </span>
            <Button
              variant="tertiary"
              size="md"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminReportsPage;
