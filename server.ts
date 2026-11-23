import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from './server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '256kb' }));

function parsePositiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const num = Number(value.trim());
    return Number.isSafeInteger(num) && num > 0 ? num : null;
  }
  return null;
}

function cleanText(value: unknown, maxLen: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLen) return null;
  return trimmed;
}

function isValidIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function getPgErrorCode(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes('DATABASE_URL')
        ? 'Database connection string is not configured on the server.'
        : 'Unable to reach the PostgreSQL database.';
    res.status(503).json({ ok: false, error: message });
  }
});

app.get('/api/dashboard', async (_req: Request, res: Response) => {
  try {
    const pool = getPool();

    const [statsRes, deptRes, borrowsRes, booksRes, studentsRes] = await Promise.all([
      pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM student1) AS total_students,
          (SELECT COUNT(*)::int FROM book) AS total_books,
          (SELECT COUNT(DISTINCT book_id)::int FROM borrow WHERE return_status = 'Not Returned') AS borrowed_books,
          (SELECT COUNT(*)::int FROM borrow WHERE return_status = 'Returned') AS returned_count,
          (SELECT COUNT(*)::int FROM borrow) AS total_transactions
      `),
      pool.query(`
        SELECT
          COALESCE(NULLIF(TRIM(s.dept), ''), 'Unassigned') AS dept,
          COUNT(DISTINCT s.usn)::int AS student_count,
          COUNT(b.transaction_id) FILTER (WHERE b.return_status = 'Not Returned')::int AS active_borrows
        FROM student1 s
        LEFT JOIN borrow b ON b.usn = s.usn
        GROUP BY COALESCE(NULLIF(TRIM(s.dept), ''), 'Unassigned')
        ORDER BY student_count DESC, dept ASC
      `),
      pool.query(`
        SELECT
          b.transaction_id,
          b.usn,
          s.name AS student_name,
          s.dept AS student_dept,
          b.book_id,
          bk.book_name,
          bk.author,
          TO_CHAR(b.borrow_date, 'YYYY-MM-DD') AS borrow_date,
          b.return_status
        FROM borrow b
        JOIN student1 s ON s.usn = b.usn
        JOIN book bk ON bk.book_id = b.book_id
        ORDER BY
          CASE WHEN b.return_status = 'Not Returned' THEN 0 ELSE 1 END ASC,
          b.borrow_date DESC,
          b.transaction_id DESC
      `),
      pool.query(`
        SELECT
          bk.book_id,
          bk.book_name,
          bk.author,
          EXISTS (
            SELECT 1 FROM borrow br
            WHERE br.book_id = bk.book_id AND br.return_status = 'Not Returned'
          ) AS is_borrowed,
          active.transaction_id AS active_transaction_id,
          active.usn AS borrower_usn,
          active.student_name AS borrower_name,
          active.borrow_date,
          (SELECT COUNT(*)::int FROM borrow br2 WHERE br2.book_id = bk.book_id) AS total_borrows
        FROM book bk
        LEFT JOIN LATERAL (
          SELECT
            br.transaction_id,
            br.usn,
            st.name AS student_name,
            TO_CHAR(br.borrow_date, 'YYYY-MM-DD') AS borrow_date
          FROM borrow br
          JOIN student1 st ON st.usn = br.usn
          WHERE br.book_id = bk.book_id AND br.return_status = 'Not Returned'
          ORDER BY br.borrow_date DESC, br.transaction_id DESC
          LIMIT 1
        ) active ON true
        ORDER BY bk.book_id ASC
      `),
      pool.query(`
        SELECT
          s.usn,
          s.name,
          s.dept,
          COUNT(b.transaction_id) FILTER (WHERE b.return_status = 'Not Returned')::int AS active_borrows,
          COUNT(b.transaction_id)::int AS total_borrows
        FROM student1 s
        LEFT JOIN borrow b ON b.usn = s.usn
        GROUP BY s.usn, s.name, s.dept
        ORDER BY s.usn ASC
      `),
    ]);

    const rawStats = statsRes.rows[0] ?? {
      total_students: 0,
      total_books: 0,
      borrowed_books: 0,
      returned_count: 0,
      total_transactions: 0,
    };

    const totalBooks = Number(rawStats.total_books) || 0;
    const borrowedBooks = Number(rawStats.borrowed_books) || 0;
    const availableBooks = Math.max(0, totalBooks - borrowedBooks);

    res.json({
      stats: {
        totalStudents: Number(rawStats.total_students) || 0,
        totalBooks,
        availableBooks,
        borrowedBooks,
        returnedCount: Number(rawStats.returned_count) || 0,
        totalTransactions: Number(rawStats.total_transactions) || 0,
      },
      departmentStats: deptRes.rows.map((row) => ({
        dept: row.dept,
        studentCount: Number(row.student_count) || 0,
        activeBorrows: Number(row.active_borrows) || 0,
      })),
      recentBorrows: borrowsRes.rows,
      availableBooks: booksRes.rows.filter((b) => !b.is_borrowed),
      students: studentsRes.rows,
    });
  } catch (err) {
    console.error('Error loading dashboard:', err);
    res.status(500).json({ error: 'Failed to load dashboard data from PostgreSQL.' });
  }
});

// ---------------- BOOKS ----------------

app.get('/api/books', async (_req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query(`
      SELECT
        bk.book_id,
        bk.book_name,
        bk.author,
        EXISTS (
          SELECT 1 FROM borrow br
          WHERE br.book_id = bk.book_id AND br.return_status = 'Not Returned'
        ) AS is_borrowed,
        active.transaction_id AS active_transaction_id,
        active.usn AS borrower_usn,
        active.student_name AS borrower_name,
        active.borrow_date,
        (SELECT COUNT(*)::int FROM borrow br2 WHERE br2.book_id = bk.book_id) AS total_borrows
      FROM book bk
      LEFT JOIN LATERAL (
        SELECT
          br.transaction_id,
          br.usn,
          st.name AS student_name,
          TO_CHAR(br.borrow_date, 'YYYY-MM-DD') AS borrow_date
        FROM borrow br
        JOIN student1 st ON st.usn = br.usn
        WHERE br.book_id = bk.book_id AND br.return_status = 'Not Returned'
        ORDER BY br.borrow_date DESC, br.transaction_id DESC
        LIMIT 1
      ) active ON true
      ORDER BY bk.book_id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching books:', err);
    res.status(500).json({ error: 'Failed to fetch books.' });
  }
});

app.post('/api/books', async (req: Request, res: Response) => {
  const bookName = cleanText(req.body?.book_name, 200);
  const author = cleanText(req.body?.author, 150);
  const providedId = req.body?.book_id !== undefined && req.body?.book_id !== ''
    ? parsePositiveInt(req.body.book_id)
    : undefined;

  if (!bookName || !author) {
    res.status(400).json({ error: 'Book title and author are required.' });
    return;
  }
  if (req.body?.book_id !== undefined && req.body?.book_id !== '' && providedId === null) {
    res.status(400).json({ error: 'Book ID must be a positive integer.' });
    return;
  }

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    let nextId = providedId;
    if (nextId === undefined || nextId === null) {
      const maxRes = await client.query('SELECT COALESCE(MAX(book_id), 100)::int + 1 AS next_id FROM book');
      nextId = Number(maxRes.rows[0].next_id);
    }

    const insertRes = await client.query(
      'INSERT INTO book (book_id, book_name, author) VALUES ($1, $2, $3) RETURNING book_id, book_name, author',
      [nextId, bookName, author]
    );
    await client.query('COMMIT');
    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (getPgErrorCode(err) === '23505') {
      res.status(409).json({ error: 'A book with that Book ID already exists.' });
      return;
    }
    console.error('Error adding book:', err);
    res.status(500).json({ error: 'Failed to add book.' });
  } finally {
    client.release();
  }
});

app.put('/api/books/:bookId', async (req: Request, res: Response) => {
  const bookId = parsePositiveInt(req.params.bookId);
  const bookName = cleanText(req.body?.book_name, 200);
  const author = cleanText(req.body?.author, 150);

  if (!bookId) {
    res.status(400).json({ error: 'Invalid Book ID.' });
    return;
  }
  if (!bookName || !author) {
    res.status(400).json({ error: 'Book title and author are required.' });
    return;
  }

  try {
    const result = await getPool().query(
      'UPDATE book SET book_name = $1, author = $2 WHERE book_id = $3 RETURNING book_id, book_name, author',
      [bookName, author, bookId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Book not found.' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating book:', err);
    res.status(500).json({ error: 'Failed to update book.' });
  }
});

app.delete('/api/books/:bookId', async (req: Request, res: Response) => {
  const bookId = parsePositiveInt(req.params.bookId);
  if (!bookId) {
    res.status(400).json({ error: 'Invalid Book ID.' });
    return;
  }

  try {
    const refCheck = await getPool().query(
      'SELECT COUNT(*)::int AS cnt FROM borrow WHERE book_id = $1',
      [bookId]
    );
    if (Number(refCheck.rows[0]?.cnt) > 0) {
      res.status(409).json({
        error: 'This book has existing borrow records. Delete or archive its borrow records first.',
      });
      return;
    }

    const delRes = await getPool().query('DELETE FROM book WHERE book_id = $1 RETURNING book_id', [bookId]);
    if (delRes.rowCount === 0) {
      res.status(404).json({ error: 'Book not found.' });
      return;
    }
    res.json({ deleted: true, book_id: bookId });
  } catch (err) {
    console.error('Error deleting book:', err);
    res.status(500).json({ error: 'Failed to delete book.' });
  }
});

// ---------------- STUDENTS ----------------

app.get('/api/students', async (_req: Request, res: Response) => {
  try {
    const result = await getPool().query(`
      SELECT
        s.usn,
        s.name,
        s.dept,
        COUNT(b.transaction_id) FILTER (WHERE b.return_status = 'Not Returned')::int AS active_borrows,
        COUNT(b.transaction_id)::int AS total_borrows
      FROM student1 s
      LEFT JOIN borrow b ON b.usn = s.usn
      GROUP BY s.usn, s.name, s.dept
      ORDER BY s.usn ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ error: 'Failed to fetch students.' });
  }
});

app.post('/api/students', async (req: Request, res: Response) => {
  const name = cleanText(req.body?.name, 120);
  const dept = cleanText(req.body?.dept, 60);
  const providedUsn = req.body?.usn !== undefined && req.body?.usn !== ''
    ? parsePositiveInt(req.body.usn)
    : undefined;

  if (!name || !dept) {
    res.status(400).json({ error: 'Student name and department are required.' });
    return;
  }
  if (req.body?.usn !== undefined && req.body?.usn !== '' && providedUsn === null) {
    res.status(400).json({ error: 'USN must be a positive integer.' });
    return;
  }

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    let nextUsn = providedUsn;
    if (nextUsn === undefined || nextUsn === null) {
      const maxRes = await client.query('SELECT COALESCE(MAX(usn), 0)::int + 1 AS next_usn FROM student1');
      nextUsn = Number(maxRes.rows[0].next_usn);
    }

    const insertRes = await client.query(
      'INSERT INTO student1 (usn, name, dept) VALUES ($1, $2, $3) RETURNING usn, name, dept',
      [nextUsn, name, dept.toUpperCase()]
    );
    await client.query('COMMIT');
    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (getPgErrorCode(err) === '23505') {
      res.status(409).json({ error: 'A student with that USN already exists.' });
      return;
    }
    console.error('Error adding student:', err);
    res.status(500).json({ error: 'Failed to add student.' });
  } finally {
    client.release();
  }
});

app.put('/api/students/:usn', async (req: Request, res: Response) => {
  const usn = parsePositiveInt(req.params.usn);
  const name = cleanText(req.body?.name, 120);
  const dept = cleanText(req.body?.dept, 60);

  if (!usn) {
    res.status(400).json({ error: 'Invalid USN.' });
    return;
  }
  if (!name || !dept) {
    res.status(400).json({ error: 'Student name and department are required.' });
    return;
  }

  try {
    const result = await getPool().query(
      'UPDATE student1 SET name = $1, dept = $2 WHERE usn = $3 RETURNING usn, name, dept',
      [name, dept.toUpperCase(), usn]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating student:', err);
    res.status(500).json({ error: 'Failed to update student.' });
  }
});

app.delete('/api/students/:usn', async (req: Request, res: Response) => {
  const usn = parsePositiveInt(req.params.usn);
  if (!usn) {
    res.status(400).json({ error: 'Invalid USN.' });
    return;
  }

  try {
    const refCheck = await getPool().query(
      'SELECT COUNT(*)::int AS cnt FROM borrow WHERE usn = $1',
      [usn]
    );
    if (Number(refCheck.rows[0]?.cnt) > 0) {
      res.status(409).json({
        error: 'This student has existing borrow records. Clear their borrow history first.',
      });
      return;
    }

    const delRes = await getPool().query('DELETE FROM student1 WHERE usn = $1 RETURNING usn', [usn]);
    if (delRes.rowCount === 0) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }
    res.json({ deleted: true, usn });
  } catch (err) {
    console.error('Error deleting student:', err);
    res.status(500).json({ error: 'Failed to delete student.' });
  }
});

// ---------------- BORROW TRANSACTIONS ----------------

app.get('/api/borrows', async (_req: Request, res: Response) => {
  try {
    const result = await getPool().query(`
      SELECT
        b.transaction_id,
        b.usn,
        s.name AS student_name,
        s.dept AS student_dept,
        b.book_id,
        bk.book_name,
        bk.author,
        TO_CHAR(b.borrow_date, 'YYYY-MM-DD') AS borrow_date,
        b.return_status
      FROM borrow b
      JOIN student1 s ON s.usn = b.usn
      JOIN book bk ON bk.book_id = b.book_id
      ORDER BY
        CASE WHEN b.return_status = 'Not Returned' THEN 0 ELSE 1 END ASC,
        b.borrow_date DESC,
        b.transaction_id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching borrow records:', err);
    res.status(500).json({ error: 'Failed to fetch borrow records.' });
  }
});

app.post('/api/borrows', async (req: Request, res: Response) => {
  const usn = parsePositiveInt(req.body?.usn);
  const bookId = parsePositiveInt(req.body?.book_id);
  const rawDate = req.body?.borrow_date;

  if (!usn || !bookId) {
    res.status(400).json({ error: 'Valid student USN and Book ID are required.' });
    return;
  }

  let borrowDate = new Date().toISOString().slice(0, 10);
  if (rawDate !== undefined && rawDate !== '') {
    if (!isValidIsoDate(rawDate)) {
      res.status(400).json({ error: 'Borrow date must be in YYYY-MM-DD format.' });
      return;
    }
    borrowDate = rawDate.trim();
  }

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    const studentCheck = await client.query('SELECT usn FROM student1 WHERE usn = $1', [usn]);
    if (studentCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Selected student was not found.' });
      return;
    }

    const bookCheck = await client.query('SELECT book_id FROM book WHERE book_id = $1', [bookId]);
    if (bookCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Selected book was not found.' });
      return;
    }

    const activeCheck = await client.query(
      "SELECT transaction_id FROM borrow WHERE book_id = $1 AND return_status = 'Not Returned'",
      [bookId]
    );
    if ((activeCheck.rowCount ?? 0) > 0) {
      await client.query('ROLLBACK');
      res.status(409).json({ error: 'This book is currently borrowed and has not been returned yet.' });
      return;
    }

    const maxRes = await client.query(
      'SELECT COALESCE(MAX(transaction_id), 0)::int + 1 AS next_id FROM borrow'
    );
    const nextTxId = Number(maxRes.rows[0].next_id);

    await client.query(
      "INSERT INTO borrow (transaction_id, usn, book_id, borrow_date, return_status) VALUES ($1, $2, $3, $4::date, 'Not Returned')",
      [nextTxId, usn, bookId, borrowDate]
    );

    const joined = await client.query(
      `
      SELECT
        b.transaction_id,
        b.usn,
        s.name AS student_name,
        s.dept AS student_dept,
        b.book_id,
        bk.book_name,
        bk.author,
        TO_CHAR(b.borrow_date, 'YYYY-MM-DD') AS borrow_date,
        b.return_status
      FROM borrow b
      JOIN student1 s ON s.usn = b.usn
      JOIN book bk ON bk.book_id = b.book_id
      WHERE b.transaction_id = $1
      `,
      [nextTxId]
    );

    await client.query('COMMIT');
    res.status(201).json(joined.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating borrow transaction:', err);
    res.status(500).json({ error: 'Failed to issue book.' });
  } finally {
    client.release();
  }
});

app.patch('/api/borrows/:transactionId/status', async (req: Request, res: Response) => {
  const transactionId = parsePositiveInt(req.params.transactionId);
  const returnStatus = req.body?.return_status;

  if (!transactionId) {
    res.status(400).json({ error: 'Invalid transaction ID.' });
    return;
  }
  if (returnStatus !== 'Returned' && returnStatus !== 'Not Returned') {
    res.status(400).json({ error: "Return status must be either 'Returned' or 'Not Returned'." });
    return;
  }

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    const currentRes = await client.query(
      'SELECT transaction_id, book_id, return_status FROM borrow WHERE transaction_id = $1',
      [transactionId]
    );
    if (currentRes.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Borrow transaction not found.' });
      return;
    }

    const current = currentRes.rows[0];
    if (returnStatus === 'Not Returned' && current.return_status === 'Returned') {
      const conflictRes = await client.query(
        "SELECT transaction_id FROM borrow WHERE book_id = $1 AND return_status = 'Not Returned' AND transaction_id <> $2",
        [current.book_id, transactionId]
      );
      if ((conflictRes.rowCount ?? 0) > 0) {
        await client.query('ROLLBACK');
        res.status(409).json({
          error: 'Cannot reopen this borrow because the book is currently checked out in another active transaction.',
        });
        return;
      }
    }

    await client.query(
      'UPDATE borrow SET return_status = $1 WHERE transaction_id = $2',
      [returnStatus, transactionId]
    );

    const updatedRes = await client.query(
      `
      SELECT
        b.transaction_id,
        b.usn,
        s.name AS student_name,
        s.dept AS student_dept,
        b.book_id,
        bk.book_name,
        bk.author,
        TO_CHAR(b.borrow_date, 'YYYY-MM-DD') AS borrow_date,
        b.return_status
      FROM borrow b
      JOIN student1 s ON s.usn = b.usn
      JOIN book bk ON bk.book_id = b.book_id
      WHERE b.transaction_id = $1
      `,
      [transactionId]
    );

    await client.query('COMMIT');
    res.json(updatedRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating return status:', err);
    res.status(500).json({ error: 'Failed to update return status.' });
  } finally {
    client.release();
  }
});

app.delete('/api/borrows/:transactionId', async (req: Request, res: Response) => {
  const transactionId = parsePositiveInt(req.params.transactionId);
  if (!transactionId) {
    res.status(400).json({ error: 'Invalid transaction ID.' });
    return;
  }

  try {
    const result = await getPool().query(
      'DELETE FROM borrow WHERE transaction_id = $1 RETURNING transaction_id',
      [transactionId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Borrow record not found.' });
      return;
    }
    res.json({ deleted: true, transaction_id: transactionId });
  } catch (err) {
    console.error('Error deleting borrow record:', err);
    res.status(500).json({ error: 'Failed to delete borrow record.' });
  }
});

app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

async function startServer(): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT) || 3000;

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Athenaeum Library server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
