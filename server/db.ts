import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

function buildConnectionConfig(rawUri: string): pg.PoolConfig {
  const parsed = new URL(rawUri);
  const sslMode = parsed.searchParams.get('sslmode');
  parsed.searchParams.delete('sslmode');

  return {
    connectionString: parsed.toString(),
    ssl:
      sslMode === 'disable'
        ? false
        : {
            rejectUnauthorized: false,
          },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}

export function getPool(): pg.Pool {
  if (pool) {
    return pool;
  }

  const uri = process.env.DATABASE_URL?.trim();
  if (!uri) {
    throw new Error('DATABASE_URL environment variable is not configured.');
  }

  pool = new Pool(buildConnectionConfig(uri));
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
