import pg from "pg";
import { config } from "../config/index.js";

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool | null {
  if (!config.DATABASE_URL) return null;
  if (!pool) {
    pool = new pg.Pool({
      connectionString: config.DATABASE_URL,
      ssl: config.NODE_ENV === "production" ? { rejectUnauthorized: true } : undefined,
    });
  }
  return pool;
}

export async function initDb(): Promise<void> {
  const p = getPool();
  if (!p) {
    console.warn("DATABASE_URL not set – user persistence disabled");
    return;
  }
  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider VARCHAR(20) NOT NULL,
      provider_user_id VARCHAR(256) NOT NULL,
      stellar_public_key VARCHAR(56),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(provider, provider_user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_users_provider_uid ON users(provider, provider_user_id);
  `);
  console.log("Database initialized");
}
