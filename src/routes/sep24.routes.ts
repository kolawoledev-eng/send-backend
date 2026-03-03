import { Router, type Request } from "express";
import { verifyAnchorJWT, type AnchorUser } from "../middleware/anchorAuth.middleware.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { checkKYCStatus } from "../services/kyc.service.js";
import { getTransactionStatus } from "../services/anchorPlatform.service.js";
import { config } from "../config/index.js";

export const sep24Router = Router();

/**
 * Interactive deposit URL — user lands here from the wallet's WebView.
 * Anchor Platform adds ?token=JWT&transaction_id=xxx to the URL.
 * We verify the JWT and serve the NGN deposit UI (or JSON for SPA).
 */
sep24Router.get("/deposit", verifyAnchorJWT, async (req, res) => {
  const anchorUser = (req as Request & { anchorUser: AnchorUser }).anchorUser;
  const { stellarKey, userId, transactionId } = anchorUser;
  const kycStatus = userId ? await checkKYCStatus(userId) : "unknown";

  // Return JSON so a WebView or SPA can render the form; optionally serve HTML.
  const accept = req.headers.accept ?? "";
  if (accept.includes("text/html")) {
    const html = getDepositHtml({ stellarKey, transactionId: transactionId ?? "", kycStatus });
    res.type("html").send(html);
    return;
  }
  res.json({
    transactionId: transactionId ?? null,
    stellarKey,
    userId: userId || null,
    kycStatus,
    message: "Enter NGN amount and complete payment to receive USDC on Stellar.",
  });
});

function getDepositHtml(params: {
  stellarKey: string;
  transactionId: string;
  kycStatus: string;
}): string {
  const { stellarKey, transactionId, kycStatus } = params;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Deposit NGN → USDC</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 400px; margin: 2rem auto; padding: 0 1rem; }
    h1 { font-size: 1.25rem; }
    .meta { font-size: 0.85rem; color: #666; word-break: break-all; margin: 0.5rem 0 1rem; }
    label { display: block; margin-top: 1rem; }
    input { width: 100%; padding: 0.5rem; box-sizing: border-box; margin-top: 0.25rem; }
    button { margin-top: 1rem; padding: 0.75rem 1.5rem; background: #007AFF; color: #fff; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .note { font-size: 0.8rem; color: #666; margin-top: 1rem; }
  </style>
</head>
<body>
  <h1>Buy USDC with Naira</h1>
  <p class="meta">Wallet: ${stellarKey.slice(0, 8)}…${stellarKey.slice(-4)}</p>
  <p class="meta">Transaction: ${transactionId || "—"}</p>
  <p class="meta">KYC: ${kycStatus}</p>
  <form id="depositForm">
    <label>Amount (NGN)</label>
    <input type="number" name="amountNGN" min="1000" placeholder="e.g. 50000" required>
    <button type="submit" id="btn">Continue to payment</button>
  </form>
  <p class="note">You will be redirected to complete bank transfer or card payment. USDC will be sent to your Stellar wallet after confirmation.</p>
  <script>
    document.getElementById('depositForm').onsubmit = function(e) {
      e.preventDefault();
      var amount = document.querySelector('input[name="amountNGN"]').value;
      var btn = document.getElementById('btn');
      btn.disabled = true;
      btn.textContent = 'Redirecting…';
      // In production: call your backend to initiate Paystack/Flutterwave and redirect
      window.location.href = '#amount=' + amount;
    };
  </script>
</body>
</html>`;
}

/**
 * Anchor config for clients — base URL of the Anchor Platform (for SEP-10 and SEP-24).
 * Flutter app can GET this to know where to send the user for deposit.
 */
sep24Router.get("/anchor-config", (_req, res) => {
  const baseUrl = config.ANCHOR_PLATFORM_SERVER ?? null;
  const homeDomain = config.ANCHOR_HOME_DOMAIN ?? null;
  res.json({
    anchorPlatformBaseUrl: baseUrl,
    anchorHomeDomain: homeDomain,
    depositEnabled: !!baseUrl,
  });
});

/**
 * Transaction status — proxy to Anchor Platform so the app can poll with auth.
 * GET /api/sep24/transaction/:id (requires app JWT).
 */
sep24Router.get("/transaction/:id", requireAuth, async (req, res) => {
  const tx = await getTransactionStatus(req.params.id);
  if (!tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  res.json(tx);
});
