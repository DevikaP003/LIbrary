import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { BookRecord } from '../types';
import { AvailabilityLabel } from './StatusText';

interface BooksViewProps {
  books: BookRecord[];
  loading: boolean;
  onAddBook: () => void;
  onEditBook: (book: BookRecord) => void;
  onDeleteBook: (book: BookRecord) => void;
  onIssueBook: (book: BookRecord) => void;
  onMarkReturned: (transactionId: number) => Promise<void>;
  updatingTxId: number | null;
}

export function BooksView({
  books,
  loading,
  onAddBook,
  onEditBook,
  onDeleteBook,
  onIssueBook,
  onMarkReturned,
  updatingTxId,
}: BooksViewProps) {
  const [search, setSearch] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'borrowed'>(
    'all'
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return books.filter((book) => {
      if (availabilityFilter === 'available' && book.is_borrowed) return false;
      if (availabilityFilter === 'borrowed' && !book.is_borrowed) return false;
      if (!q) return true;
      return (
        String(book.book_id).includes(q) ||
        book.book_name.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        (book.borrower_name && book.borrower_name.toLowerCase().includes(q))
      );
    });
  }, [books, search, availabilityFilter]);

  const availableCount = books.filter((b) => !b.is_borrowed).length;
  const borrowedCount = books.length - availableCount;

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
            placeholder="Search by Book ID, title, author, or borrower..."
            className="w-full min-h-[40px] pl-10 pr-4 py-2 text-sm bg-[#F6FAF9] border border-[#C2D8D5] rounded-lg text-[#0B2834] placeholder:text-[#66848E] focus:bg-white focus:border-[#0E5A7A]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#E7F1EF] rounded-lg">
            <button
              type="button"
              onClick={() => setAvailabilityFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                availabilityFilter === 'all'
                  ? 'bg-white text-[#0B2834] shadow-xs'
                  : 'text-[#436470] hover:text-[#0B2834]'
              }`}
            >
              All ({books.length})
            </button>
            <button
              type="button"
              onClick={() => setAvailabilityFilter('available')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                availabilityFilter === 'available'
                  ? 'bg-white text-[#157A56] shadow-xs'
                  : 'text-[#436470] hover:text-[#0B2834]'
              }`}
            >
              Available ({availableCount})
            </button>
            <button
              type="button"
              onClick={() => setAvailabilityFilter('borrowed')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                availabilityFilter === 'borrowed'
                  ? 'bg-white text-[#0E5A7A] shadow-xs'
                  : 'text-[#436470] hover:text-[#0B2834]'
              }`}
            >
              Borrowed ({borrowedCount})
            </button>
          </div>

          <button
            type="button"
            onClick={onAddBook}
            className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-[#0E5A7A] hover:bg-[#0A455E] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Add Book</span>
          </button>
        </div>
      </div>

      <div className="border border-[#D2E2DF] bg-white rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(11,40,52,0.03)]">
        {loading && books.length === 0 ? (
          <div className="p-6 space-y-3 animate-pulse">
            {[0, 1, 2, 3, 4].map((idx) => (
              <div key={idx} className="h-12 bg-[#F1F6F5] rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="font-display text-lg font-semibold text-[#0B2834]">
              No matching books found
            </h3>
            <p className="mt-1 text-sm text-[#436470]">
              Adjust your search terms or add a new book to the library catalog.
            </p>
            <button
              type="button"
              onClick={onAddBook}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0E5A7A] hover:bg-[#0A455E] rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Add Book</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#D2E2DF] bg-[#F6FAF9] text-xs font-medium text-[#436470]">
                  <th className="py-3.5 px-5 whitespace-nowrap">Book ID</th>
                  <th className="py-3.5 px-4">Title</th>
                  <th className="py-3.5 px-4">Author</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Availability</th>
                  <th className="py-3.5 px-4">Current Holder</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Loans</th>
                  <th className="py-3.5 px-5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4EFED] text-sm">
                {filtered.map((book) => {
                  const isUpdating =
                    book.active_transaction_id !== null &&
                    updatingTxId === book.active_transaction_id;

                  return (
                    <tr key={book.book_id} className="hover:bg-[#F6FAF9] transition-colors">
                      <td className="py-3.5 px-5 font-mono tabular-nums text-xs text-[#436470]">
                        #{book.book_id}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#0B2834]">{book.book_name}</td>
                      <td className="py-3.5 px-4 text-[#436470]">{book.author}</td>
                      <td className="py-3.5 px-4">
                        <AvailabilityLabel isBorrowed={book.is_borrowed} />
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#436470]">
                        {book.is_borrowed && book.borrower_name ? (
                          <span>
                            {book.borrower_name}{' '}
                            <span className="font-mono tabular-nums">
                              · USN {book.borrower_usn} · {book.borrow_date}
                            </span>
                          </span>
                        ) : (
                          <span>On shelf</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-[#436470]">
                        {book.total_borrows}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          {book.is_borrowed && book.active_transaction_id !== null ? (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => onMarkReturned(book.active_transaction_id!)}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-[#157A56] hover:bg-[#0F5E42] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                            >
                              {isUpdating ? 'Updating...' : 'Mark Returned'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onIssueBook(book)}
                              className="px-3 py-1.5 text-xs font-medium text-[#0E5A7A] border border-[#C2D8D5] hover:bg-[#E7F1EF] rounded-lg transition-colors whitespace-nowrap shrink-0"
                            >
                              Issue
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onEditBook(book)}
                            aria-label={`Edit ${book.book_name}`}
                            className="p-2 text-[#436470] hover:text-[#0B2834] hover:bg-[#E7F1EF] rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteBook(book)}
                            aria-label={`Delete ${book.book_name}`}
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
