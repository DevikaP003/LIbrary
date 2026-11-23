import { useMemo, useState } from 'react';
import { Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import type { BorrowRecord, ReturnStatus } from '../types';
import { ReturnStatusLabel } from './StatusText';

interface BorrowsViewProps {
  borrows: BorrowRecord[];
  loading: boolean;
  onIssueBook: () => void;
  onToggleReturn: (transactionId: number, nextStatus: ReturnStatus) => Promise<void>;
  onDeleteBorrow: (borrow: BorrowRecord) => void;
  updatingTxId: number | null;
}

export function BorrowsView({
  borrows,
  loading,
  onIssueBook,
  onToggleReturn,
  onDeleteBorrow,
  updatingTxId,
}: BorrowsViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Not Returned' | 'Returned'>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return borrows.filter((row) => {
      if (statusFilter !== 'all' && row.return_status !== statusFilter) return false;
      if (!q) return true;
      return (
        String(row.transaction_id).includes(q) ||
        String(row.usn).includes(q) ||
        String(row.book_id).includes(q) ||
        row.student_name.toLowerCase().includes(q) ||
        row.student_dept.toLowerCase().includes(q) ||
        row.book_name.toLowerCase().includes(q) ||
        row.author.toLowerCase().includes(q) ||
        row.borrow_date.includes(q)
      );
    });
  }, [borrows, search, statusFilter]);

  const pendingCount = borrows.filter((b) => b.return_status === 'Not Returned').length;
  const returnedCount = borrows.length - pendingCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#D2E2DF] bg-white rounded-xl p-5 shadow-[0_1px_2px_rgba(11,40,52,0.03)]">
        <div className="relative flex-1 max-w-md">
          <Search
            className="w-4 h-4 text-[#436470] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Tx ID, student, book, or borrow date..."
            className="w-full min-h-[40px] pl-10 pr-4 py-2 text-sm bg-[#F6FAF9] border border-[#C2D8D5] rounded-lg text-[#0B2834] placeholder:text-[#66848E] focus:bg-white focus:border-[#0E5A7A]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#E7F1EF] rounded-lg">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-white text-[#0B2834] shadow-xs'
                  : 'text-[#436470] hover:text-[#0B2834]'
              }`}
            >
              All ({borrows.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Not Returned')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === 'Not Returned'
                  ? 'bg-white text-[#0E5A7A] shadow-xs'
                  : 'text-[#436470] hover:text-[#0B2834]'
              }`}
            >
              Not Returned ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Returned')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === 'Returned'
                  ? 'bg-white text-[#157A56] shadow-xs'
                  : 'text-[#436470] hover:text-[#0B2834]'
              }`}
            >
              Returned ({returnedCount})
            </button>
          </div>

          <button
            type="button"
            onClick={onIssueBook}
            className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-[#0E5A7A] hover:bg-[#0A455E] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Issue Book</span>
          </button>
        </div>
      </div>

      <div className="border border-[#D2E2DF] bg-white rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(11,40,52,0.03)]">
        {loading && borrows.length === 0 ? (
          <div className="p-6 space-y-3 animate-pulse">
            {[0, 1, 2, 3, 4].map((idx) => (
              <div key={idx} className="h-12 bg-[#F1F6F5] rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="font-display text-lg font-semibold text-[#0B2834]">
              No borrow transactions found
            </h3>
            <p className="mt-1 text-sm text-[#436470]">
              Issue a book to a student or clear your current search filter.
            </p>
            <button
              type="button"
              onClick={onIssueBook}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0E5A7A] hover:bg-[#0A455E] rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Issue Book</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#D2E2DF] bg-[#F6FAF9] text-xs font-medium text-[#436470]">
                  <th className="py-3.5 px-5 whitespace-nowrap">Transaction ID</th>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Book</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Borrow Date</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Return Status</th>
                  <th className="py-3.5 px-5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4EFED] text-sm">
                {filtered.map((row) => {
                  const isPending = row.return_status === 'Not Returned';
                  const isBusy = updatingTxId === row.transaction_id;

                  return (
                    <tr key={row.transaction_id} className="hover:bg-[#F6FAF9] transition-colors">
                      <td className="py-3.5 px-5 font-mono tabular-nums text-xs text-[#436470]">
                        #{row.transaction_id}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[#0B2834]">{row.student_name}</div>
                        <div className="text-xs text-[#436470] font-mono tabular-nums">
                          USN {row.usn} · {row.student_dept}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[#0B2834]">{row.book_name}</div>
                        <div className="text-xs text-[#436470]">
                          ID <span className="font-mono tabular-nums">{row.book_id}</span> ·{' '}
                          {row.author}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-[#436470] whitespace-nowrap">
                        {row.borrow_date}
                      </td>
                      <td className="py-3.5 px-4">
                        <ReturnStatusLabel status={row.return_status} />
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          {isPending ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => onToggleReturn(row.transaction_id, 'Returned')}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-[#157A56] hover:bg-[#0F5E42] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                            >
                              {isBusy ? 'Updating...' : 'Mark Returned'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => onToggleReturn(row.transaction_id, 'Not Returned')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#0E5A7A] border border-[#C2D8D5] hover:bg-[#E7F1EF] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                            >
                              <RotateCcw className="w-3 h-3" aria-hidden="true" />
                              <span>{isBusy ? 'Updating...' : 'Mark Not Returned'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onDeleteBorrow(row)}
                            aria-label={`Delete transaction ${row.transaction_id}`}
                            className="p-2 text-[#436470] hover:text-[#9F1239] hover:bg-[#FFF1F2] rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
