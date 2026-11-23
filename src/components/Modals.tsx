import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { X } from 'lucide-react';
import type { BookRecord, StudentRecord } from '../types';

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0C2536]/35 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-white border border-[#D5E4E7] rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-[#D5E4E7] flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-title" className="font-display text-xl font-semibold text-[#0C2536]">
              {title}
            </h2>
            {subtitle && <p className="mt-1 text-sm text-[#456273]">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-[#456273] hover:text-[#0C2536] hover:bg-[#EDF4F6] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function BookFormModal({
  editingBook,
  onClose,
  onSave,
}: {
  editingBook: BookRecord | null;
  onClose: () => void;
  onSave: (payload: { book_id?: number; book_name: string; author: string }) => Promise<void>;
}) {
  const [bookId, setBookId] = useState(editingBook ? String(editingBook.book_id) : '');
  const [bookName, setBookName] = useState(editingBook?.book_name ?? '');
  const [author, setAuthor] = useState(editingBook?.author ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!bookName.trim() || !author.trim()) {
      setError('Please provide both the book title and author name.');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        book_id: !editingBook && bookId.trim() ? Number(bookId.trim()) : undefined,
        book_name: bookName.trim(),
        author: author.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save book.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      title={editingBook ? `Edit Book #${editingBook.book_id}` : 'Add Catalog Book'}
      subtitle={
        editingBook
          ? 'Update title or author details in the PostgreSQL catalog.'
          : 'Leave Book ID blank to automatically assign the next catalog number.'
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!editingBook && (
          <div>
            <label htmlFor="book-id-input" className="block text-xs font-medium text-[#0C2536] mb-1.5">
              Book ID (Optional)
            </label>
            <input
              id="book-id-input"
              type="number"
              min={1}
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              placeholder="Auto-assigned (e.g. 106)"
              className="w-full min-h-[40px] px-3 py-2 text-sm font-mono tabular-nums bg-white border border-[#C6DCE1] rounded-lg text-[#0C2536] focus:border-[#0E5A7A]"
            />
          </div>
        )}

        <div>
          <label htmlFor="book-name-input" className="block text-xs font-medium text-[#0C2536] mb-1.5">
            Book Title
          </label>
          <input
            id="book-name-input"
            type="text"
            required
            value={bookName}
            onChange={(e) => setBookName(e.target.value)}
            placeholder="e.g. Data Structures & Algorithms"
            className="w-full min-h-[40px] px-3 py-2 text-sm bg-white border border-[#C6DCE1] rounded-lg text-[#0C2536] focus:border-[#0E5A7A]"
          />
        </div>

        <div>
          <label htmlFor="book-author-input" className="block text-xs font-medium text-[#0C2536] mb-1.5">
            Author
          </label>
          <input
            id="book-author-input"
            type="text"
            required
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="e.g. Thomas H. Cormen"
            className="w-full min-h-[40px] px-3 py-2 text-sm bg-white border border-[#C6DCE1] rounded-lg text-[#0C2536] focus:border-[#0E5A7A]"
          />
        </div>

        {error && (
          <p className="text-xs text-[#9F1239] bg-[#FFF1F2] border border-[#FECDD3] rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 py-2 text-sm font-medium text-[#456273] hover:text-[#0C2536] hover:bg-[#EDF4F6] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-[#0E5A7A] hover:bg-[#0B465E] disabled:opacity-50 rounded-lg transition-colors"
          >
            {submitting ? 'Saving...' : editingBook ? 'Save Changes' : 'Add Book'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function StudentFormModal({
  editingStudent,
  onClose,
  onSave,
}: {
  editingStudent: StudentRecord | null;
  onClose: () => void;
  onSave: (payload: { usn?: number; name: string; dept: string }) => Promise<void>;
}) {
  const [usn, setUsn] = useState(editingStudent ? String(editingStudent.usn) : '');
  const [name, setName] = useState(editingStudent?.name ?? '');
  const [dept, setDept] = useState(editingStudent?.dept ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !dept.trim()) {
      setError('Please enter both student name and department.');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        usn: !editingStudent && usn.trim() ? Number(usn.trim()) : undefined,
        name: name.trim(),
        dept: dept.trim().toUpperCase(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save student.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      title={editingStudent ? `Edit Student (USN ${editingStudent.usn})` : 'Register Student'}
      subtitle={
        editingStudent
          ? 'Update student name or department.'
          : 'Leave USN blank to automatically assign the next student number.'
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!editingStudent && (
          <div>
            <label htmlFor="student-usn-input" className="block text-xs font-medium text-[#0C2536] mb-1.5">
              USN (Optional)
            </label>
            <input
              id="student-usn-input"
              type="number"
              min={1}
              value={usn}
              onChange={(e) => setUsn(e.target.value)}
              placeholder="Auto-assigned (e.g. 6)"
              className="w-full min-h-[40px] px-3 py-2 text-sm font-mono tabular-nums bg-white border border-[#C6DCE1] rounded-lg text-[#0C2536] focus:border-[#0E5A7A]"
            />
          </div>
        )}

        <div>
          <label htmlFor="student-name-input" className="block text-xs font-medium text-[#0C2536] mb-1.5">
            Student Name
          </label>
          <input
            id="student-name-input"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Meera"
            className="w-full min-h-[40px] px-3 py-2 text-sm bg-white border border-[#C6DCE1] rounded-lg text-[#0C2536] focus:border-[#0E5A7A]"
          />
        </div>

        <div>
          <label htmlFor="student-dept-input" className="block text-xs font-medium text-[#0C2536] mb-1.5">
            Department
          </label>
          <input
            id="student-dept-input"
            type="text"
            required
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            placeholder="e.g. CSE, ISE, AIML, ECE"
            className="w-full min-h-[40px] px-3 py-2 text-sm bg-white border border-[#C6DCE1] rounded-lg text-[#0C2536] focus:border-[#0E5A7A]"
          />
        </div>

        {error && (
          <p className="text-xs text-[#9F1239] bg-[#FFF1F2] border border-[#FECDD3] rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 py-2 text-sm font-medium text-[#456273] hover:text-[#0C2536] hover:bg-[#EDF4F6] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-[#0E5A7A] hover:bg-[#0B465E] disabled:opacity-50 rounded-lg transition-colors"
          >
            {submitting ? 'Saving...' : editingStudent ? 'Save Changes' : 'Add Student'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function IssueBookModal({
  students,
  availableBooks,
  initialUsn,
  initialBookId,
  onClose,
  onIssue,
}: {
  students: StudentRecord[];
  availableBooks: BookRecord[];
  initialUsn?: number;
  initialBookId?: number;
  onClose: () => void;
  onIssue: (payload: { usn: number; book_id: number; borrow_date: string }) => Promise<void>;
}) {
  const [usn, setUsn] = useState(initialUsn ? String(initialUsn) : '');
  const [bookId, setBookId] = useState(initialBookId ? String(initialBookId) : '');
  const [borrowDate, setBorrowDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!usn || !bookId) {
      setError('Please select both a student and an available book.');
      return;
    }

    setSubmitting(true);
    try {
      await onIssue({
        usn: Number(usn),
        book_id: Number(bookId),
        borrow_date: borrowDate,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to issue book.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      title="Issue Book to Student"
      subtitle="Creates a new borrow record marked as Not Returned."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="issue-student" className="block text-xs font-medium text-[#0C2536] mb-1.5">
            Student
          </label>
          <select
            id="issue-student"
            value={usn}
            onChange={(e) => setUsn(e.target.value)}
            required
            className="w-full min-h-[40px] px-3 py-2 text-sm bg-white border border-[#C6DCE1] rounded-lg text-[#0C2536] focus:border-[#0E5A7A]"
          >
            <option value="">Select student...</option>
            {students.map((s) => (
              <option key={s.usn} value={s.usn}>
                USN {s.usn} — {s.name} ({s.dept})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="issue-book" className="block text-xs font-medium text-[#0C2536] mb-1.5">
            Available Book
          </label>
          <select
            id="issue-book"
            value={bookId}
            onChange={(e) => setBookId(e.target.value)}
            required
            className="w-full min-h-[40px] px-3 py-2 text-sm bg-white border border-[#C6DCE1] rounded-lg text-[#0C2536] focus:border-[#0E5A7A]"
          >
            <option value="">
              {availableBooks.length === 0 ? 'No books currently available' : 'Select book...'}
            </option>
            {availableBooks.map((b) => (
              <option key={b.book_id} value={b.book_id}>
                #{b.book_id} — {b.book_name} ({b.author})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="issue-date" className="block text-xs font-medium text-[#0C2536] mb-1.5">
            Borrow Date
          </label>
          <input
            id="issue-date"
            type="date"
            required
            value={borrowDate}
            onChange={(e) => setBorrowDate(e.target.value)}
            className="w-full min-h-[40px] px-3 py-2 text-sm font-mono tabular-nums bg-white border border-[#C6DCE1] rounded-lg text-[#0C2536] focus:border-[#0E5A7A]"
          />
        </div>

        {error && (
          <p className="text-xs text-[#9F1239] bg-[#FFF1F2] border border-[#FECDD3] rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 py-2 text-sm font-medium text-[#456273] hover:text-[#0C2536] hover:bg-[#EDF4F6] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || availableBooks.length === 0}
            className="min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-[#0E5A7A] hover:bg-[#0B465E] disabled:opacity-50 rounded-lg transition-colors"
          >
            {submitting ? 'Issuing...' : 'Confirm Issue'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function ConfirmDeleteModal({
  title,
  message,
  onClose,
  onConfirm,
}: {
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    setDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete record.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-[#456273]">{message}</p>

        {error && (
          <p className="text-xs text-[#9F1239] bg-[#FFF1F2] border border-[#FECDD3] rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 py-2 text-sm font-medium text-[#456273] hover:text-[#0C2536] hover:bg-[#EDF4F6] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-[#9F1239] hover:bg-[#881337] disabled:opacity-50 rounded-lg transition-colors"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
