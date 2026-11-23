import type {
  BookRecord,
  BorrowRecord,
  DashboardPayload,
  ReturnStatus,
  StudentRecord,
} from './types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const msg =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed with status ${res.status}`;
    throw new Error(msg);
  }

  return data as T;
}

export function fetchDashboard(): Promise<DashboardPayload> {
  return request<DashboardPayload>('/api/dashboard');
}

export function fetchBooks(): Promise<BookRecord[]> {
  return request<BookRecord[]>('/api/books');
}

export function createBook(payload: {
  book_id?: number;
  book_name: string;
  author: string;
}): Promise<{ book_id: number; book_name: string; author: string }> {
  return request('/api/books', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateBook(
  bookId: number,
  payload: { book_name: string; author: string }
): Promise<{ book_id: number; book_name: string; author: string }> {
  return request(`/api/books/${bookId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteBook(bookId: number): Promise<{ deleted: boolean }> {
  return request(`/api/books/${bookId}`, {
    method: 'DELETE',
  });
}

export function fetchStudents(): Promise<StudentRecord[]> {
  return request<StudentRecord[]>('/api/students');
}

export function createStudent(payload: {
  usn?: number;
  name: string;
  dept: string;
}): Promise<{ usn: number; name: string; dept: string }> {
  return request('/api/students', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateStudent(
  usn: number,
  payload: { name: string; dept: string }
): Promise<{ usn: number; name: string; dept: string }> {
  return request(`/api/students/${usn}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteStudent(usn: number): Promise<{ deleted: boolean }> {
  return request(`/api/students/${usn}`, {
    method: 'DELETE',
  });
}

export function fetchBorrows(): Promise<BorrowRecord[]> {
  return request<BorrowRecord[]>('/api/borrows');
}

export function createBorrow(payload: {
  usn: number;
  book_id: number;
  borrow_date?: string;
}): Promise<BorrowRecord> {
  return request('/api/borrows', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateReturnStatus(
  transactionId: number,
  returnStatus: ReturnStatus
): Promise<BorrowRecord> {
  return request(`/api/borrows/${transactionId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ return_status: returnStatus }),
  });
}

export function deleteBorrow(transactionId: number): Promise<{ deleted: boolean }> {
  return request(`/api/borrows/${transactionId}`, {
    method: 'DELETE',
  });
}
