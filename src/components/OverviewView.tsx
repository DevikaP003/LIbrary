import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, BookPlus, RotateCcw } from 'lucide-react';
import type { DashboardPayload, ReturnStatus } from '../types';
import { ReturnStatusLabel } from './StatusText';

interface OverviewViewProps {
  data: DashboardPayload | null;
  loading: boolean;
  onToggleReturn: (transactionId: number, nextStatus: ReturnStatus) => Promise<void>;
  onQuickBorrow: (payload: { usn: number; book_id: number; borrow_date: string }) => Promise<void>;
  onNavigate: (tab: 'overview' | 'books' | 'students' | 'borrows') => void;
  updatingTxId: number | null;
}

export function OverviewView({
  data,
  loading,
  onToggleReturn,
  onQuickBorrow,
  onNavigate,
  updatingTxId,
}: OverviewViewProps) {
  const [filterStatus, setFilterStatus] = useState<'all' | 'Not Returned' | 'Returned'>('all');
  const [selectedUsn, setSelectedUsn] = useState<string>('');
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [borrowDate, setBorrowDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [submittingQuick, setSubmittingQuick] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  if (loading && !data) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
        <div className="grid grid-cols-2 lg:grid-cols-4 border border-[#D5E4E7] bg-white rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-[#D5E4E7]">
          {[0, 1, 2, 3].map((idx) => (
            <div key={idx} className="p-6 space-y-3 animate-pulse">
              <div className="h-4 w-24 bg-[#E6EFF1] rounded" />
              <div className="h-9 w-16 bg-[#D5E4E7] rounded" />
              <div className="h-3 w-32 bg-[#EDF4F6] rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 h-96 bg-white border border-[#D5E4E7] rounded-xl animate-pulse" />
          <div className="xl:col-span-4 h-96 bg-white border border-[#D5E4E7] rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  const stats = data?.stats ?? {
    totalStudents: 0,
    totalBooks: 0,
    availableBooks: 0,
    borrowedBooks: 0,
    returnedCount: 0,
    totalTransactions: 0,
  };

  const availablePct =
    stats.totalBooks > 0 ? Math.round((stats.availableBooks / stats.totalBooks) * 100) : 0;
  const borrowedPct = stats.totalBooks > 0 ? 100 - availablePct : 0;

  const filteredBorrows = (data?.recentBorrows ?? []).filter((row) =>
    filterStatus === 'all' ? true : row.return_status === filterStatus
  );

  const handleQuickSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setQuickError(null);
    const usn = Number(selectedUsn);
    const bookId = Number(selectedBookId);
    if (!usn || !bookId) {
      setQuickError('Please select both a student and an available book.');
      return;
    }
    setSubmittingQuick(true);
    try {
      await onQuickBorrow({ usn, book_id: bookId, borrow_date: borrowDate });
      setSelectedBookId('');
      setSelectedUsn('');
    } catch (err) {
      setQuickError(err instanceof Error ? err.message : 'Unable to issue book.');
    } finally {
      setSubmittingQuick(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Primary KPI Strip */}
      <section aria-label="Library overview metrics">
        <div className="grid grid-cols-2 lg:grid-cols-4 border border-[#D2E2DF] bg-white rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-[#D2E2DF] shadow-[0_1px_2px_rgba(11,40,52,0.03)]">
          <button
            type="button"
            onClick={() => onNavigate('students')}
            className="text-left p-6 hover:bg-[#F6FAF9] transition-colors rounded-tl-xl lg:rounded-l-xl focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
          >
            <p className="text-sm text-[#436470]">Total Students</p>
            <p className="mt-2 font-display tabular-nums text-3xl font-semibold text-[#0B2834]">
              {stats.totalStudents}
            </p>
            <p className="mt-2 text-xs italic text-[#436470]">
              Enrolled across {data?.departmentStats.length ?? 0} departments
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('books')}
            className="text-left p-6 hover:bg-[#F6FAF9] transition-colors rounded-tr-xl lg:rounded-none focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
          >
            <p className="text-sm text-[#436470]">Total Catalog Books</p>
            <p className="mt-2 font-display tabular-nums text-3xl font-semibold text-[#0B2834]">
              {stats.totalBooks}
            </p>
            <p className="mt-2 text-xs italic text-[#436470]">Registered library volumes</p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('books')}
            className="text-left p-6 hover:bg-[#F6FAF9] transition-colors rounded-bl-xl lg:rounded-none focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
          >
            <p className="text-sm text-[#157A56] font-medium">Available Books</p>
            <p className="mt-2 font-display tabular-nums text-3xl font-semibold text-[#157A56]">
              {stats.availableBooks}
            </p>
            <p className="mt-2 text-xs text-[#436470] font-mono tabular-nums">
              {availablePct}% of catalog on shelf
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('borrows')}
            className="text-left p-6 hover:bg-[#F6FAF9] transition-colors rounded-br-xl lg:rounded-r-xl focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
          >
            <p className="text-sm text-[#0E5A7A] font-medium">Borrowed Books</p>
            <p className="mt-2 font-display tabular-nums text-3xl font-semibold text-[#0E5A7A]">
              {stats.borrowedBooks}
            </p>
            <p className="mt-2 text-xs text-[#436470] font-mono tabular-nums">
              {borrowedPct}% currently checked out
            </p>
          </button>
        </div>
      </section>

      {/* Proportional Availability Bar */}
      <section className="border border-[#D2E2DF] bg-white rounded-xl p-6 shadow-[0_1px_2px_rgba(11,40,52,0.03)]">
        <div className="flex flex-wrap items-baseline justify-between gap-4 mb-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#0B2834]">
              Collection Circulation Balance
            </h2>
            <p className="text-sm italic text-[#436470]">
              Live shelf availability versus active student checkouts
            </p>
          </div>
          <div className="flex items-center gap-5 text-xs font-mono tabular-nums text-[#436470]">
            <span className="text-[#157A56] font-medium">
              Available: {stats.availableBooks} ({availablePct}%)
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-[#0E5A7A] font-medium">
              Borrowed: {stats.borrowedBooks} ({borrowedPct}%)
            </span>
            <span aria-hidden="true">·</span>
            <span>Returned History: {stats.returnedCount}</span>
          </div>
        </div>
        <div
          className="h-2.5 w-full rounded-full bg-[#E3EEEC] overflow-hidden flex"
          role="img"
          aria-label={`${availablePct}% available, ${borrowedPct}% borrowed`}
        >
          <div
            className="h-full bg-[#157A56] transition-all duration-200"
            style={{ width: `${availablePct}%` }}
          />
          <div
            className="h-full bg-[#0E5A7A] transition-all duration-200"
            style={{ width: `${borrowedPct}%` }}
          />
        </div>
      </section>

      {/* Main Two-Column Operational Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Borrow Transactions & One-Click Return Status */}
        <section className="xl:col-span-8 border border-[#D2E2DF] bg-white rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(11,40,52,0.03)]">
          <div className="p-6 border-b border-[#D2E2DF] flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#0B2834]">
                Borrow Details & Return Queue
              </h2>
              <p className="text-sm italic text-[#436470] mt-0.5">
                Update return status directly as students bring books back
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#E7F1EF] rounded-lg">
              {(['all', 'Not Returned', 'Returned'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterStatus(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    filterStatus === tab
                      ? 'bg-white text-[#0B2834] shadow-xs'
                      : 'text-[#436470] hover:text-[#0B2834]'
                  }`}
                >
                  {tab === 'all' ? 'All' : tab}
                </button>
              ))}
            </div>
          </div>

          {filteredBorrows.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-display text-lg text-[#0B2834]">No borrow records match this filter</p>
              <p className="mt-1 text-sm text-[#436470]">
                Switch filter tabs or issue a new book using the Quick Circulation panel.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#D2E2DF] bg-[#F6FAF9] text-xs font-medium text-[#436470]">
                    <th className="py-3 px-5 whitespace-nowrap">Tx</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Book</th>
                    <th className="py-3 px-4 whitespace-nowrap">Borrow Date</th>
                    <th className="py-3 px-4 whitespace-nowrap">Return Status</th>
                    <th className="py-3 px-5 text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4EFED] text-sm">
                  {filteredBorrows.slice(0, 8).map((row) => {
                    const isPending = row.return_status === 'Not Returned';
                    const isBusy = updatingTxId === row.transaction_id;
                    return (
                      <tr
                        key={row.transaction_id}
                        className="hover:bg-[#F6FAF9] transition-colors"
                      >
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
                              <span>{isBusy ? 'Updating...' : 'Reopen'}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-6 py-3.5 border-t border-[#D2E2DF] bg-[#F6FAF9] flex items-center justify-between">
            <span className="text-xs text-[#436470] font-mono tabular-nums">
              Showing {Math.min(filteredBorrows.length, 8)} of {filteredBorrows.length} records
            </span>
            <button
              type="button"
              onClick={() => onNavigate('borrows')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0E5A7A] hover:text-[#0A455E] transition-colors whitespace-nowrap shrink-0"
            >
              <span>Open Full Borrow Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </section>

        {/* Right: Quick Issue Book + Department Breakdown */}
        <div className="xl:col-span-4 space-y-6">
          <section className="border border-[#D2E2DF] bg-white rounded-xl p-6 shadow-[0_1px_2px_rgba(11,40,52,0.03)]">
            <div className="flex items-center gap-2.5 mb-1">
              <BookPlus className="w-4 h-4 text-[#0E5A7A]" aria-hidden="true" />
              <h2 className="font-display text-lg font-semibold text-[#0B2834]">
                Quick Issue Book
              </h2>
            </div>
            <p className="text-sm italic text-[#436470] mb-5">
              Assign an available book directly to an enrolled student.
            </p>

            <form onSubmit={handleQuickSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="quick-student"
                  className="block text-xs font-medium text-[#0C2536] mb-1.5"
                >
                  Student
                </label>
                <select
                  id="quick-student"
                  value={selectedUsn}
                  onChange={(e) => setSelectedUsn(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 text-sm bg-white border border-[#C2D8D5] rounded-lg text-[#0B2834] focus:border-[#0E5A7A]"
                >
                  <option value="">Select student...</option>
                  {(data?.students ?? []).map((student) => (
                    <option key={student.usn} value={student.usn}>
                      USN {student.usn} — {student.name} ({student.dept})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="quick-book"
                  className="block text-xs font-medium text-[#0C2536] mb-1.5"
                >
                  Available Book
                </label>
                <select
                  id="quick-book"
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 text-sm bg-white border border-[#C2D8D5] rounded-lg text-[#0B2834] focus:border-[#0E5A7A]"
                >
                  <option value="">
                    {(data?.availableBooks.length ?? 0) === 0
                      ? 'No available books on shelf'
                      : 'Select available book...'}
                  </option>
                  {(data?.availableBooks ?? []).map((book) => (
                    <option key={book.book_id} value={book.book_id}>
                      #{book.book_id} — {book.book_name} ({book.author})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="quick-date"
                  className="block text-xs font-medium text-[#0C2536] mb-1.5"
                >
                  Borrow Date
                </label>
                <input
                  id="quick-date"
                  type="date"
                  value={borrowDate}
                  onChange={(e) => setBorrowDate(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 text-sm font-mono tabular-nums bg-white border border-[#C6DCE1] rounded-lg text-[#0C2536] focus:border-[#0F5A78]"
                />
              </div>

              {quickError && (
                <p className="text-xs text-[#9F1239] bg-[#FFF1F2] border border-[#FECDD3] rounded-lg px-3 py-2">
                  {quickError}
                </p>
              )}

              <button
                type="submit"
                disabled={submittingQuick || (data?.availableBooks.length ?? 0) === 0}
                className="w-full min-h-[42px] px-4 py-2 text-sm font-medium text-white bg-[#0E5A7A] hover:bg-[#0A455E] disabled:opacity-50 rounded-lg transition-colors"
              >
                {submittingQuick ? 'Issuing Book...' : 'Issue Book'}
              </button>
            </form>
          </section>

          <section className="border border-[#D2E2DF] bg-white rounded-xl p-6 shadow-[0_1px_2px_rgba(11,40,52,0.03)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-[#0B2834]">
                Students by Department
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('students')}
                className="text-xs font-medium text-[#0E5A7A] hover:text-[#0A455E] whitespace-nowrap shrink-0"
              >
                View Directory
              </button>
            </div>

            {(data?.departmentStats.length ?? 0) === 0 ? (
              <p className="text-sm text-[#436470]">No student records available yet.</p>
            ) : (
              <ul className="divide-y divide-[#E4EFED]">
                {(data?.departmentStats ?? []).map((item) => (
                  <li
                    key={item.dept}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#0B2834]">{item.dept}</p>
                      <p className="text-xs text-[#436470] font-mono tabular-nums">
                        {item.activeBorrows} active{' '}
                        {item.activeBorrows === 1 ? 'borrow' : 'borrows'}
                      </p>
                    </div>
                    <span className="font-mono tabular-nums text-sm font-medium text-[#157A56]">
                      {item.studentCount}{' '}
                      <span className="text-xs font-normal text-[#436470]">
                        {item.studentCount === 1 ? 'student' : 'students'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
