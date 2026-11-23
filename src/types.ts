export type ReturnStatus = 'Returned' | 'Not Returned';

export interface DashboardStats {
  totalStudents: number;
  totalBooks: number;
  availableBooks: number;
  borrowedBooks: number;
  returnedCount: number;
  totalTransactions: number;
}

export interface DepartmentStat {
  dept: string;
  studentCount: number;
  activeBorrows: number;
}

export interface BookRecord {
  book_id: number;
  book_name: string;
  author: string;
  is_borrowed: boolean;
  active_transaction_id: number | null;
  borrower_usn: number | null;
  borrower_name: string | null;
  borrow_date: string | null;
  total_borrows: number;
}

export interface StudentRecord {
  usn: number;
  name: string;
  dept: string;
  active_borrows: number;
  total_borrows: number;
}

export interface BorrowRecord {
  transaction_id: number;
  usn: number;
  student_name: string;
  student_dept: string;
  book_id: number;
  book_name: string;
  author: string;
  borrow_date: string;
  return_status: ReturnStatus;
}

export interface DashboardPayload {
  stats: DashboardStats;
  departmentStats: DepartmentStat[];
  recentBorrows: BorrowRecord[];
  availableBooks: BookRecord[];
  students: StudentRecord[];
}
