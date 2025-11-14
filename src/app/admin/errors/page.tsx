'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useRouter } from 'next/navigation';

import {
  QueryErrorsParams,
  useDeleteErrorMutation,
  useErrorsQuery,
  type ErrorData,
} from '@/api/errors';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal/Modal';
import { useAuthStore } from '@/state/useAuthStore';

function AdminErrorsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);

  // Admin check - redirect if not admin
  useEffect(() => {
    if (accessToken !== null && (!user || !user.isAdmin)) {
      router.push('/');
    }
  }, [user, accessToken, router]);

  // Filters and pagination state
  const [page, setPage] = useState(1);
  const [messageFilter, setMessageFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true },
  ]);
  const [selectedError, setSelectedError] = useState<ErrorData | null>(null);

  // Build query params
  const queryParams = useMemo(
    () => ({
      page,
      limit: 20,
      message: messageFilter || undefined,
      userId: userIdFilter || undefined,
      dateFrom: dateFromFilter || undefined,
      dateTo: dateToFilter || undefined,
      sortBy: sorting[0]?.id as 'createdAt' | 'message' | undefined,
      sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
    }),
    [page, messageFilter, userIdFilter, dateFromFilter, dateToFilter, sorting],
  );

  // Fetch errors
  const { data, isLoading, error } = useErrorsQuery(
    queryParams as QueryErrorsParams,
    !!accessToken && !!user?.isAdmin,
  );

  // Delete mutation
  const deleteMutation = useDeleteErrorMutation();

  // Table columns
  const columns = useMemo<ColumnDef<ErrorData>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Date',
        cell: (info) => {
          const date = new Date(info.getValue() as string);

          return (
            <span className="text-sm text-white">
              {date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          );
        },
      },
      {
        accessorKey: 'message',
        header: 'Message',
        cell: (info) => {
          const message = info.getValue() as string;

          return (
            <span className="text-sm text-white max-w-md block" title={message}>
              {message}
            </span>
          );
        },
      },
      {
        accessorKey: 'userDetails',
        header: 'User Details',
        enableSorting: false,
        cell: (info) => {
          const userDetails = info.getValue() as
            | Record<string, any>
            | undefined;

          return (
            <span className="text-sm text-white">
              <span className="font-medium">{userDetails?.platform} |</span>{' '}
              <span className="font-medium">{userDetails?.userAgent}</span>{' '}
            </span>
          );
        },
      },

      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: (info) => {
          const error = info.row.original;

          return (
            <Button
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this error?')) {
                  deleteMutation.mutate(error._id);
                }
              }}
              disabled={deleteMutation.isPending}
              className="!px-3 !py-1 text-xs capitalize"
            >
              Delete
            </Button>
          );
        },
      },
    ],
    [deleteMutation],
  );

  // Table instance
  const table = useReactTable({
    data: data?.data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: data?.totalPages || 0,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
  });

  // Show loading or redirect
  if (!accessToken || !user || !user.isAdmin) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 p-6 text-white">
        <div className="text-center">
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 p-6 text-white">
        <div className="text-center">
          <p className="text-lg text-red-400">
            Error loading errors: {String(error)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 p-6 text-white overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Error Dashboard</h1>
          <Button variant="primary" onClick={() => router.push('/')}>
            Back to Scoreboard
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-primary-800/70 backdrop-blur-sm rounded-lg border border-primary-700/70 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-primary-200">
                Message
              </label>
              <input
                type="text"
                value={messageFilter}
                onChange={(e) => {
                  setMessageFilter(e.target.value);
                  setPage(1);
                }}
                placeholder="Search message..."
                className="w-full px-3 py-2 bg-primary-900 border border-primary-700/40 rounded-md text-white placeholder-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-primary-200">
                User ID
              </label>
              <input
                type="text"
                value={userIdFilter}
                onChange={(e) => {
                  setUserIdFilter(e.target.value);
                  setPage(1);
                }}
                placeholder="Filter by user..."
                className="w-full px-3 py-2 bg-primary-900 border border-primary-700/40 rounded-md text-white placeholder-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-primary-200">
                Date From
              </label>
              <input
                type="date"
                value={dateFromFilter}
                onChange={(e) => {
                  setDateFromFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-primary-900 border border-primary-700/40 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-primary-200">
                Date To
              </label>
              <input
                type="date"
                value={dateToFilter}
                onChange={(e) => {
                  setDateToFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-primary-900 border border-primary-700/40 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          {(messageFilter ||
            userIdFilter ||
            dateFromFilter ||
            dateToFilter) && (
            <div className="mt-4">
              <Button
                variant="tertiary"
                onClick={() => {
                  setMessageFilter('');
                  setUserIdFilter('');
                  setDateFromFilter('');
                  setDateToFilter('');
                  setPage(1);
                }}
                className="!px-4 !py-2"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-primary-800/70 backdrop-blur-sm rounded-lg border border-primary-700/70 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <p className="">Loading errors...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-primary-900 border-b border-primary-700/70">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="px-4 py-3 text-left text-sm font-medium text-primary-200"
                          >
                            {header.isPlaceholder ? null : (
                              <div
                                className={`flex items-center gap-2 ${
                                  header.column.getCanSort()
                                    ? 'cursor-pointer select-none hover:text-primary-100'
                                    : ''
                                }`}
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                                {{
                                  asc: ' ↑',
                                  desc: ' ↓',
                                }[header.column.getIsSorted() as string] ??
                                  null}
                              </div>
                            )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="divide-y divide-primary-700/30">
                    {table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-primary-700/30 transition-colors cursor-pointer"
                        onClick={() => setSelectedError(row.original)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data && data.totalPages > 1 && (
                <div className="px-4 py-4 bg-primary-900/40 border-t border-primary-700/70 flex items-center justify-between">
                  <div className="text-sm ">
                    Showing {(page - 1) * 20 + 1} to{' '}
                    {Math.min(page * 20, data.total)} of {data.total} errors
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="tertiary"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="!px-4 !py-2"
                    >
                      Previous
                    </Button>
                    <span className="text-sm ">
                      Page {page} of {data.totalPages}
                    </span>
                    <Button
                      variant="tertiary"
                      onClick={() =>
                        setPage((p) => Math.min(data.totalPages, p + 1))
                      }
                      disabled={page >= data.totalPages}
                      className="!px-4 !py-2"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {data && data.data.length === 0 && (
                <div className="p-8 text-center">
                  <p className="">No errors found</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Error Details Modal */}
        <Modal
          isOpen={!!selectedError}
          onClose={() => setSelectedError(null)}
          containerClassName="!w-[min(100%,900px)]"
          overlayClassName="!z-[1001]"
          topContent={
            selectedError && (
              <div className="bg-primary-900 px-6 py-4 border-b border-primary-700/70">
                <h2 className="text-2xl font-bold text-white">Error Details</h2>
              </div>
            )
          }
          bottomContent={
            selectedError && (
              <div className="bg-primary-900/40 px-6 py-4 border-t border-primary-700/70 flex justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedError(null)}
                >
                  Close
                </Button>
              </div>
            )
          }
        >
          {selectedError && (
            <div className="space-y-6 text-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium  mb-2">ID</h3>
                  <p className="text-sm text-white font-mono bg-primary-900 p-2 rounded">
                    {selectedError._id}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium  mb-2">Timestamp</h3>
                  <p className="text-sm text-white">
                    {new Date(selectedError.createdAt).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium  mb-2">Message</h3>
                <p className="text-sm text-white bg-primary-900 p-3 rounded break-words">
                  {selectedError.message}
                </p>
              </div>

              {selectedError.stack && (
                <div>
                  <h3 className="text-sm font-medium  mb-2">Stack Trace</h3>
                  <pre className="text-xs text-white bg-primary-900 p-3 rounded overflow-x-auto max-h-60 overflow-y-auto whitespace-pre-wrap break-words">
                    {selectedError.stack}
                  </pre>
                </div>
              )}

              {selectedError.userDetails && (
                <div>
                  <h3 className="text-sm font-medium  mb-2">User Details</h3>
                  <pre className="text-xs text-white bg-primary-900 p-3 rounded overflow-x-auto max-h-60 overflow-y-auto">
                    {JSON.stringify(selectedError.userDetails, null, 2)}
                  </pre>
                </div>
              )}

              {selectedError.generalInfo && (
                <div>
                  <h3 className="text-sm font-medium  mb-2">General Info</h3>
                  <pre className="text-xs text-white bg-primary-900 p-3 rounded overflow-x-auto max-h-60 overflow-y-auto">
                    {JSON.stringify(selectedError.generalInfo, null, 2)}
                  </pre>
                </div>
              )}

              {selectedError.countriesInfo && (
                <div>
                  <h3 className="text-sm font-medium  mb-2">Countries Info</h3>
                  <pre className="text-xs text-white bg-primary-900 p-3 rounded overflow-x-auto max-h-60 overflow-y-auto">
                    {JSON.stringify(selectedError.countriesInfo, null, 2)}
                  </pre>
                </div>
              )}

              {selectedError.scoreboardInfo && (
                <div>
                  <h3 className="text-sm font-medium  mb-2">Scoreboard Info</h3>
                  <pre className="text-xs text-white bg-primary-900 p-3 rounded overflow-x-auto max-h-60 overflow-y-auto">
                    {JSON.stringify(selectedError.scoreboardInfo, null, 2)}
                  </pre>
                </div>
              )}
              {selectedError.userId && (
                <div>
                  <h3 className="text-sm font-medium  mb-2">User ID</h3>
                  <p className="text-sm text-white font-mono bg-primary-900 p-2 rounded">
                    {selectedError.userId}
                  </p>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}

export default AdminErrorsPage;
