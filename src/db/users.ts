import { getPool } from "./client.js";

export type Provider = "apple" | "google";

export interface UserRow {
  id: string;
  provider: string;
  provider_user_id: string;
  email: string | null;
  stellar_public_key: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function registerOrLogin(
  provider: Provider,
  providerUserId: string,
  email?: string | null
): Promise<{ isNewUser: boolean; userId: string; stellarPublicKey: string | null }> {
  const pool = getPool();
  if (!pool) {
    return { isNewUser: true, userId: "", stellarPublicKey: null };
  }
  const existing = await pool.query<UserRow>(
    "SELECT id, stellar_public_key, created_at FROM users WHERE provider = $1 AND provider_user_id = $2",
    [provider, providerUserId]
  );
  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    if (email != null && email.trim() !== "" && email.includes("@")) {
      await pool.query(
        "UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2",
        [email.trim(), row.id]
      );
    }
    return {
      isNewUser: false,
      userId: row.id,
      stellarPublicKey: row.stellar_public_key ?? null,
    };
  }
  const insert = await pool.query<UserRow>(
    `INSERT INTO users (provider, provider_user_id, email) VALUES ($1, $2, $3)
     RETURNING id`,
    [provider, providerUserId, email?.trim() && email.includes("@") ? email.trim() : null]
  );
  return {
    isNewUser: true,
    userId: insert.rows[0].id,
    stellarPublicKey: null,
  };
}

export async function linkWallet(userId: string, stellarPublicKey: string): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  await pool.query(
    "UPDATE users SET stellar_public_key = $1, updated_at = NOW() WHERE id = $2",
    [stellarPublicKey, userId]
  );
}

export async function getUserByProvider(
  provider: Provider,
  providerUserId: string
): Promise<UserRow | null> {
  const pool = getPool();
  if (!pool) return null;
  const r = await pool.query<UserRow>(
    "SELECT * FROM users WHERE provider = $1 AND provider_user_id = $2",
    [provider, providerUserId]
  );
  return r.rows[0] ?? null;
}
