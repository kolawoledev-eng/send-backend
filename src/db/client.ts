import pg from "pg";
import { config } from "../config/index.js";

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool | null {
  if (!config.DATABASE_URL) return null;
  if (!pool) {
    pool = new pg.Pool({
      connectionString: config.DATABASE_URL,
      ssl: config.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
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
      email VARCHAR(320),
      stellar_public_key VARCHAR(56),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(provider, provider_user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_users_provider_uid ON users(provider, provider_user_id);
  `);
  await p.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(320);
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS deposit_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      stellar_public_key VARCHAR(56) NOT NULL,
      amount_ngn NUMERIC(18,2),
      amount_usdc NUMERIC(18,2),
      fee_ngn NUMERIC(18,2) DEFAULT 0,
      flw_tx_ref VARCHAR(128),
      flw_tx_id VARCHAR(64),
      stellar_tx_hash VARCHAR(64),
      method VARCHAR(32) NOT NULL DEFAULT 'virtual_account',
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_deposit_tx_user ON deposit_transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_deposit_tx_ref ON deposit_transactions(flw_tx_ref);
    CREATE INDEX IF NOT EXISTS idx_deposit_tx_status ON deposit_transactions(status);
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS virtual_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) UNIQUE,
      account_number VARCHAR(20) NOT NULL,
      bank_name VARCHAR(100) NOT NULL,
      account_name VARCHAR(200),
      flw_ref VARCHAR(64),
      order_ref VARCHAR(128),
      bvn_hash VARCHAR(64),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_va_user ON virtual_accounts(user_id);
  `);
  console.log("Database initialized");
}
