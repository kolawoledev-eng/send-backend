import { getPool } from "./client.js";

export type DepositStatus =
  | "pending"
  | "awaiting_payment"
  | "payment_confirmed"
  | "sending_usdc"
  | "completed"
  | "failed";

export interface DepositRow {
  id: string;
  user_id: string;
  stellar_public_key: string;
  amount_ngn: number | null;
  amount_usdc: number | null;
  fee_ngn: number | null;
  flw_tx_ref: string | null;
  flw_tx_id: string | null;
  stellar_tx_hash: string | null;
  method: string;
  status: DepositStatus;
  created_at: Date;
  updated_at: Date;
}

export async function createDeposit(params: {
  userId: string;
  stellarPublicKey: string;
  amountNGN: number;
  method: "bank_transfer" | "card";
  flwTxRef: string;
}): Promise<string> {
  const pool = getPool();
  if (!pool) throw new Error("DB not available");
  const row = await pool.query<{ id: string }>(
    `INSERT INTO deposit_transactions (user_id, stellar_public_key, amount_ngn, method, flw_tx_ref, status)
     VALUES ($1, $2, $3, $4, $5, 'awaiting_payment')
     RETURNING id`,
    [params.userId, params.stellarPublicKey, params.amountNGN, params.method, params.flwTxRef]
  );
  return row.rows[0].id;
}

export async function getDepositById(id: string): Promise<DepositRow | null> {
  const pool = getPool();
  if (!pool) return null;
  const row = await pool.query<DepositRow>(
    "SELECT * FROM deposit_transactions WHERE id = $1",
    [id]
  );
  return row.rows[0] ?? null;
}

export async function getDepositByFlwRef(flwTxRef: string): Promise<DepositRow | null> {
  const pool = getPool();
  if (!pool) return null;
  const row = await pool.query<DepositRow>(
    "SELECT * FROM deposit_transactions WHERE flw_tx_ref = $1",
    [flwTxRef]
  );
  return row.rows[0] ?? null;
}

export async function updateDepositStatus(
  id: string,
  status: DepositStatus,
  extra?: {
    amountNGN?: number;
    amountUSDC?: number;
    feeNGN?: number;
    flwTxId?: string;
    stellarTxHash?: string;
  }
): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const sets: string[] = ["status = $2", "updated_at = NOW()"];
  const vals: unknown[] = [id, status];
  let idx = 3;
  if (extra?.amountNGN !== undefined) {
    sets.push(`amount_ngn = $${idx++}`);
    vals.push(extra.amountNGN);
  }
  if (extra?.amountUSDC !== undefined) {
    sets.push(`amount_usdc = $${idx++}`);
    vals.push(extra.amountUSDC);
  }
  if (extra?.feeNGN !== undefined) {
    sets.push(`fee_ngn = $${idx++}`);
    vals.push(extra.feeNGN);
  }
  if (extra?.flwTxId !== undefined) {
    sets.push(`flw_tx_id = $${idx++}`);
    vals.push(extra.flwTxId);
  }
  if (extra?.stellarTxHash !== undefined) {
    sets.push(`stellar_tx_hash = $${idx++}`);
    vals.push(extra.stellarTxHash);
  }
  await pool.query(
    `UPDATE deposit_transactions SET ${sets.join(", ")} WHERE id = $1`,
    vals
  );
}
