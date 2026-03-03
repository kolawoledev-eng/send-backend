import { config } from "../config/index.js";
import { getNGNtoUSDCRate, calculateUSDC } from "./fx.service.js";

/**
 * Notify the Anchor Platform that NGN was received so it sends USDC to the user's Stellar wallet.
 * Platform PATCH /transactions/:id with status pending_anchor and amounts.
 */
export async function notifyFundsReceived(params: {
  transactionId: string;
  amountNGN: number;
}): Promise<{ ok: boolean; error?: string }> {
  const baseUrl = config.ANCHOR_PLATFORM_SERVER;
  if (!baseUrl) {
    return { ok: false, error: "Anchor Platform not configured" };
  }
  try {
    const { rate, feePercent } = await getNGNtoUSDCRate();
    const { amountOut, feeAmount } = calculateUSDC(params.amountNGN, rate, feePercent);
    const issuer = config.USDC_ISSUER ?? "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/transactions/${params.transactionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "pending_anchor",
        amount_in: params.amountNGN.toString(),
        amount_in_asset: "iso4217:NGN",
        amount_out: amountOut,
        amount_out_asset: `stellar:USDC:${issuer}`,
        amount_fee: feeAmount,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: text || res.statusText };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

/**
 * Poll transaction status from Anchor Platform (GET /transactions/:id).
 */
export async function getTransactionStatus(
  transactionId: string,
  _authToken?: string
): Promise<{ status: string; [k: string]: unknown } | null> {
  const baseUrl = config.ANCHOR_PLATFORM_SERVER;
  if (!baseUrl) return null;
  try {
    const res = await fetch(
      `${baseUrl.replace(/\/$/, "")}/transactions/${transactionId}`
    );
    if (!res.ok) return null;
    return (await res.json()) as { status: string; [k: string]: unknown };
  } catch {
    return null;
  }
}
