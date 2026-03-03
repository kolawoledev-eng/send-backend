import { getPool } from "../db/client.js";

export type KYCStatus = "approved" | "pending" | "needs_info" | "unknown";

/**
 * KYC service — connect to your licensed KYC provider (BVN, NIN, etc.).
 * This is a stub; replace with your real KYC integration.
 */
export async function checkKYCStatus(userId: string): Promise<KYCStatus> {
  const pool = getPool();
  if (!pool) return "unknown";
  try {
    const row = await pool.query<{ kyc_status?: string }>(
      "SELECT kyc_status FROM users WHERE id = $1",
      [userId]
    );
    const status = row.rows[0]?.kyc_status;
    if (status === "approved" || status === "pending" || status === "needs_info") {
      return status as KYCStatus;
    }
  } catch {
    // Column kyc_status may not exist yet; add with: ALTER TABLE users ADD COLUMN kyc_status VARCHAR(20);
  }
  return "unknown";
}

/**
 * Submit KYC data — call your KYC provider (e.g. BVN verification).
 * Stub: implement with your licensed provider.
 */
export async function submitKYC(
  _userId: string,
  _data: { bvn?: string; nin?: string; [k: string]: unknown }
): Promise<{ success: boolean; status: KYCStatus }> {
  // TODO: YourKYCProvider.verify({ bvn: data.bvn, userId })
  return { success: true, status: "pending" };
}
