import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  BookOpen,
  CheckCircle2,
  LayoutDashboard,
  Library,
  Menu,
  Plus,
  RefreshCw,
  Users,
  X,
} from 'lucide-react';
import {
  createBook,
  createBorrow,
  createStudent,
  deleteBook,
  deleteBorrow,
  deleteStudent,
  fetchBooks,
  fetchBorrows,
  fetchDashboard,
  fetchStudents,
  updateBook,
  updateReturnStatus,
  updateStudent,
} from './api';
import { BooksView } from './components/BooksView';
import { BorrowsView } from './components/BorrowsView';
import {
  BookFormModal,
  ConfirmDeleteModal,
  IssueBookModal,
  StudentFormModal,
} from './components/Modals';
import { OverviewView } from './components/OverviewView';
import { StudentsView } from './components/StudentsView';
import type {
  BookRecord,
  BorrowRecord,
  DashboardPayload,
  ReturnStatus,
  StudentRecord,
} from './types';

type ActiveTab = 'overview' | 'books' | 'students' | 'borrows';

interface ToastMessage {
  id: number;
  text: string;
  tone: 'green' | 'blue';
}

const TAB_LABELS: Record<ActiveTab, string> = {
  overview: 'Dashboard',
  books: 'Books Catalog',
  students: 'Students Directory',
  borrows: 'Borrow Ledger',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [borrows, setBorrows] = useState<BorrowRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updatingTxId, setUpdatingTxId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Modal states
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<BookRecord | null>(null);

  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);

  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issuePreset, setIssuePreset] = useState<{ usn?: number; bookId?: number }>({});

  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'book'; item: BookRecord }
    | { kind: 'student'; item: StudentRecord }
    | { kind: 'borrow'; item: BorrowRecord }
    | null
  >(null);

  const showToast = useCallback((text: string, tone: 'green' | 'blue' = 'green') => {
    const id = Date.now();
    setToast({ id, text, tone });
    window.setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 3500);
  }, []);

  const loadAll = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setLoadError(null);

    try {
      const [dashData, booksData, studentsData, borrowsData] = await Promise.all([
        fetchDashboard(),
        fetchBooks(),
        fetchStudents(),
        fetchBorrows(),
      ]);
      setDashboard(dashData);
      setBooks(booksData);
      setStudents(studentsData);
      setBorrows(borrowsData);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Unable to connect to the PostgreSQL database.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadAll(false);
  }, [loadAll]);

  const handleToggleReturn = async (transactionId: number, nextStatus: ReturnStatus) => {
    setUpdatingTxId(transactionId);
    try {
      await updateReturnStatus(transactionId, nextStatus);
      await loadAll(true);
      showToast(
        nextStatus === 'Returned'
          ? `Transaction #${transactionId} marked as Returned.`
          : `Transaction #${transactionId} reopened as Not Returned.`,
        nextStatus === 'Returned' ? 'green' : 'blue'
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to update return status.',
        'blue'
      );
    } finally {
      setUpdatingTxId(null);
    }
  };

  const handleIssueBook = async (payload: { usn: number; book_id: number; borrow_date: string }) => {
    const created = await createBorrow(payload);
    await loadAll(true);
    showToast(
      `Issued "${created.book_name}" to ${created.student_name} (Tx #${created.transaction_id}).`,
      'blue'
    );
  };

  const handleSaveBook = async (payload: {
    book_id?: number;
    book_name: string;
    author: string;
  }) => {
    if (editingBook) {
      await updateBook(editingBook.book_id, {
        book_name: payload.book_name,
        author: payload.author,
      });
      await loadAll(true);
      showToast(`Updated "${payload.book_name}".`, 'green');
    } else {
      const created = await createBook(payload);
      await loadAll(true);
      showToast(`Added "${created.book_name}" (#${created.book_id}) to catalog.`, 'green');
    }
  };

  const handleSaveStudent = async (payload: { usn?: number; name: string; dept: string }) => {
    if (editingStudent) {
      await updateStudent(editingStudent.usn, { name: payload.name, dept: payload.dept });
      await loadAll(true);
      showToast(`Updated student ${payload.name} (USN ${editingStudent.usn}).`, 'green');
    } else {
      const created = await createStudent(payload);
      await loadAll(true);
      showToast(`Registered ${created.name} (USN ${created.usn}).`, 'green');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'book') {
      await deleteBook(deleteTarget.item.book_id);
      await loadAll(true);
      showToast(`Removed "${deleteTarget.item.book_name}" from catalog.`, 'blue');
    } else if (deleteTarget.kind === 'student') {
      await deleteStudent(deleteTarget.item.usn);
      await loadAll(true);
      showToast(`Removed student ${deleteTarget.item.name}.`, 'blue');
    } else {
      await deleteBorrow(deleteTarget.item.transaction_id);
      await loadAll(true);
      showToast(`Deleted borrow record #${deleteTarget.item.transaction_id}.`, 'blue');
    }
  };

  const availableBooksList = books.filter((b) => !b.is_borrowed);

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    count: number | null;
    icon: typeof LayoutDashboard;
  }> = [
    { id: 'overview', label: 'Dashboard', count: null, icon: LayoutDashboard },
    { id: 'books', label: 'Books Catalog', count: books.length, icon: BookOpen },
    { id: 'students', label: 'Students', count: students.length, icon: Users },
    {
      id: 'borrows',
      label: 'Borrow Ledger',
      count: borrows.filter((b) => b.return_status === 'Not Returned').length,
      icon: ArrowLeftRight,
    },
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F1F6F5] text-[#0B2834] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-[#0B2C38] text-[#E6F1EF] border-r border-[#16414F]">
        <div className="h-16 px-6 flex items-center gap-3 border-b border-[#16414F]">
          <div className="w-8 h-8 rounded-lg bg-[#157A56] text-white flex items-center justify-center shrink-0">
            <Library className="w-4 h-4" aria-hidden="true" />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight text-white whitespace-nowrap">
            Library
          </span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#157A56] text-white'
                    : 'text-[#B5D0CC] hover:text-white hover:bg-[#143D4B]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </span>
                {item.count !== null && (
                  <span
                    className={`font-mono tabular-nums text-xs ${
                      isActive ? 'text-white/90' : 'text-[#8AB0AB]'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#16414F] space-y-3">
          <div className="px-2 space-y-1">
            <p className="text-xs font-medium text-[#E6F1EF]">Collection Snapshot</p>
            <p className="text-xs text-[#9CC0BB] font-mono tabular-nums">
              {dashboard?.stats.availableBooks ?? 0} available ·{' '}
              {dashboard?.stats.borrowedBooks ?? 0} borrowed
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAll(true)}
            disabled={refreshing}
            className="w-full min-h-[40px] inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-[#E6F1EF] border border-[#245666] hover:bg-[#143D4B] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{refreshing ? 'Syncing...' : 'Sync Database'}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <div
            className="fixed inset-0 bg-[#0B2834]/45"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] bg-[#0B2C38] text-[#E6F1EF] border-r border-[#16414F] flex flex-col z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-[#16414F]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#157A56] text-white flex items-center justify-center">
                  <Library className="w-4 h-4" aria-hidden="true" />
                </div>
                <span className="font-display text-xl font-semibold text-white">
                  Library
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 text-[#B5D0CC] hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full min-h-[44px] flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#157A56] text-white'
                        : 'text-[#B5D0CC] hover:text-white hover:bg-[#143D4B]'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </span>
                    {item.count !== null && (
                      <span className="font-mono tabular-nums text-xs">{item.count}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb on Left, Single Primary CTA on Right */}
        <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-xs border-b border-[#D2E2DF] px-4 sm:px-8 flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 text-[#436470] hover:text-[#0B2834] rounded-lg"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="text-[#436470] hidden sm:inline">Library</span>
              <span className="text-[#9AB5B1] hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="font-display text-lg font-semibold text-[#0B2834] truncate">
                {TAB_LABELS[activeTab]}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIssuePreset({});
              setIssueModalOpen(true);
            }}
            className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-[#157A56] hover:bg-[#0F5E42] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Issue Book</span>
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-[1360px] w-full mx-auto space-y-6">
          {loadError && (
            <div
              role="alert"
              className="border border-[#FECDD3] bg-[#FFF1F2] text-[#881337] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4"
            >
              <div className="text-sm">
                <span className="font-semibold">Database connection notice:</span> {loadError}
              </div>
              <button
                type="button"
                onClick={() => void loadAll(false)}
                className="px-3.5 py-1.5 text-xs font-medium bg-white border border-[#FECDD3] hover:bg-[#FFE4E6] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Retry Connection
              </button>
            </div>
          )}

          {activeTab === 'overview' && (
            <OverviewView
              data={dashboard}
              loading={loading}
              onToggleReturn={handleToggleReturn}
              onQuickBorrow={handleIssueBook}
              onNavigate={setActiveTab}
              updatingTxId={updatingTxId}
            />
          )}

          {activeTab === 'books' && (
            <BooksView
              books={books}
              loading={loading}
              onAddBook={() => {
                setEditingBook(null);
                setBookModalOpen(true);
              }}
              onEditBook={(book) => {
                setEditingBook(book);
                setBookModalOpen(true);
              }}
              onDeleteBook={(book) => setDeleteTarget({ kind: 'book', item: book })}
              onIssueBook={(book) => {
                setIssuePreset({ bookId: book.book_id });
                setIssueModalOpen(true);
              }}
              onMarkReturned={(txId) => handleToggleReturn(txId, 'Returned')}
              updatingTxId={updatingTxId}
            />
          )}

          {activeTab === 'students' && (
            <StudentsView
              students={students}
              loading={loading}
              onAddStudent={() => {
                setEditingStudent(null);
                setStudentModalOpen(true);
              }}
              onEditStudent={(student) => {
                setEditingStudent(student);
                setStudentModalOpen(true);
              }}
              onDeleteStudent={(student) => setDeleteTarget({ kind: 'student', item: student })}
              onIssueToStudent={(student) => {
                setIssuePreset({ usn: student.usn });
                setIssueModalOpen(true);
              }}
            />
          )}

          {activeTab === 'borrows' && (
            <BorrowsView
              borrows={borrows}
              loading={loading}
              onIssueBook={() => {
                setIssuePreset({});
                setIssueModalOpen(true);
              }}
              onToggleReturn={handleToggleReturn}
              onDeleteBorrow={(borrow) => setDeleteTarget({ kind: 'borrow', item: borrow })}
              updatingTxId={updatingTxId}
            />
          )}
        </main>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 max-w-sm px-4 py-3 rounded-xl border shadow-md flex items-center gap-3 text-sm bg-white ${
            toast.tone === 'green'
              ? 'border-[#B6DEC9] text-[#157A56]'
              : 'border-[#BBD6DF] text-[#0E5A7A]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="text-[#0B2834]">{toast.text}</span>
        </div>
      )}

      {/* Modals */}
      {bookModalOpen && (
        <BookFormModal
          editingBook={editingBook}
          onClose={() => setBookModalOpen(false)}
          onSave={handleSaveBook}
        />
      )}

      {studentModalOpen && (
        <StudentFormModal
          editingStudent={editingStudent}
          onClose={() => setStudentModalOpen(false)}
          onSave={handleSaveStudent}
        />
      )}

      {issueModalOpen && (
        <IssueBookModal
          students={students}
          availableBooks={availableBooksList}
          initialUsn={issuePreset.usn}
          initialBookId={issuePreset.bookId}
          onClose={() => setIssueModalOpen(false)}
          onIssue={handleIssueBook}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          title={
            deleteTarget.kind === 'book'
              ? `Delete Book #${deleteTarget.item.book_id}`
              : deleteTarget.kind === 'student'
              ? `Delete Student USN ${deleteTarget.item.usn}`
              : `Delete Borrow Record #${deleteTarget.item.transaction_id}`
          }
          message={
            deleteTarget.kind === 'book'
              ? `Remove "${deleteTarget.item.book_name}" by ${deleteTarget.item.author} from the catalog? Books with borrow history cannot be removed until their borrow records are cleared.`
              : deleteTarget.kind === 'student'
              ? `Remove ${deleteTarget.item.name} (${deleteTarget.item.dept}) from the student directory? Students with borrow history cannot be removed until their borrow records are cleared.`
              : `Permanently remove transaction #${deleteTarget.item.transaction_id} (${deleteTarget.item.book_name} borrowed by ${deleteTarget.item.student_name})?`
          }
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
