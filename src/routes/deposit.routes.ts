import { Router, type Request } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { config } from "../config/index.js";
import {
  createBankTransferCharge,
  createPaymentLink,
  createPermanentVirtualAccount,
  verifyTransaction,
} from "../services/flutterwave.service.js";
import crypto from "crypto";
import { getNGNtoUSDCRate, calculateUSDC } from "../services/fx.service.js";
import { sendUSDC } from "../services/stellarSend.service.js";
import {
  createDeposit,
  getDepositById,
  getDepositByFlwRef,
  updateDepositStatus,
} from "../db/deposits.js";
import { getPool } from "../db/client.js";

export const depositRouter = Router();

const startSchema = z.object({
  amountNGN: z.number().min(1000).max(50_000_000),
  method: z.enum(["bank_transfer", "card"]),
  email: z.string().email().optional(),
});

/**
 * POST /api/deposit/start
 * Auth required. Creates a Flutterwave charge and returns payment details.
 * method=bank_transfer → returns virtual account number
 * method=card → returns Flutterwave checkout URL
 */
depositRouter.post(
  "/start",
  requireAuth,
  validateBody(startSchema),
  async (req, res) => {
    const userId = (req as Request & { userId: string }).userId;
    const { amountNGN, method, email } = req.body as z.infer<typeof startSchema>;

    if (!config.FLW_SECRET_KEY) {
      res.status(503).json({ error: "Payment provider not configured" });
      return;
    }

    const pool = getPool();
    if (!pool) {
      res.status(503).json({ error: "Database not available" });
      return;
    }

    const userRow = await pool.query<{
      stellar_public_key: string | null;
      email: string | null;
    }>("SELECT stellar_public_key, email FROM users WHERE id = $1", [userId]);
    const user = userRow.rows[0];
    if (!user?.stellar_public_key) {
      res.status(400).json({ error: "No Stellar wallet linked" });
      return;
    }

    const userEmail = email ?? user.email ?? `${userId}@wallet.app`;
    const txRef = `dep_${Date.now()}_${userId.slice(0, 8)}`;

    try {
      const depositId = await createDeposit({
        userId,
        stellarPublicKey: user.stellar_public_key,
        amountNGN,
        method,
        flwTxRef: txRef,
      });

      if (method === "bank_transfer") {
        const va = await createBankTransferCharge({
          txRef,
          amountNGN,
          email: userEmail,
          stellarPublicKey: user.stellar_public_key,
        });
        const { rate, feePercent } = await getNGNtoUSDCRate();
        const { amountOut } = calculateUSDC(amountNGN, rate, feePercent);
        res.json({
          depositId,
          method: "bank_transfer",
          accountNumber: va.accountNumber,
          bankName: va.bankName,
          accountName: va.accountName,
          amountNGN: va.amount,
          estimatedUSDC: amountOut,
          expiresAt: va.expiresAt,
          txRef,
        });
      } else {
        const redirectUrl = `${req.protocol}://${req.get("host")}/api/deposit/callback`;
        const link = await createPaymentLink({
          txRef,
          amountNGN,
          email: userEmail,
          stellarPublicKey: user.stellar_public_key,
          redirectUrl,
        });
        const { rate, feePercent } = await getNGNtoUSDCRate();
        const { amountOut } = calculateUSDC(amountNGN, rate, feePercent);
        res.json({
          depositId,
          method: "card",
          paymentUrl: link,
          amountNGN,
          estimatedUSDC: amountOut,
          txRef,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment initiation failed";
      console.error("[deposit] start error:", msg);
      res.status(500).json({ error: msg });
    }
  }
);

/**
 * GET /api/deposit/status/:id
 * Auth required. Returns current deposit status for polling.
 */
depositRouter.get("/status/:id", requireAuth, async (req, res) => {
  const deposit = await getDepositById(req.params.id);
  if (!deposit) {
    res.status(404).json({ error: "Deposit not found" });
    return;
  }
  res.json({
    id: deposit.id,
    status: deposit.status,
    amountNGN: deposit.amount_ngn,
    amountUSDC: deposit.amount_usdc,
    stellarTxHash: deposit.stellar_tx_hash,
    method: deposit.method,
    createdAt: deposit.created_at,
  });
});

/**
 * GET /api/deposit/callback
 * Flutterwave redirects here after card payment. Show a simple "done" page.
 */
depositRouter.get("/callback", (_req, res) => {
  res.type("html").send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Payment</title>
<style>body{font-family:system-ui;text-align:center;padding:4rem 1rem;}h1{font-size:1.5rem;}</style>
</head><body><h1>Payment received</h1><p>You can close this window. USDC will arrive in your wallet shortly.</p></body></html>`);
});

/**
 * POST /api/deposit/webhook
 * Flutterwave webhook — called when payment is confirmed.
 * Verifies signature, confirms payment, calculates USDC, sends to user.
 */
depositRouter.post("/webhook", async (req, res) => {
  const hash = req.headers["verif-hash"] as string;
  if (config.FLW_WEBHOOK_HASH && hash !== config.FLW_WEBHOOK_HASH) {
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  const event = req.body as {
    event?: string;
    data?: {
      id?: number;
      tx_ref?: string;
      amount?: number;
      currency?: string;
      status?: string;
    };
  };

  if (event.event !== "charge.completed" || event.data?.status !== "successful") {
    res.status(200).json({ received: true });
    return;
  }

  const txRef = event.data.tx_ref;
  const flwTxId = String(event.data.id);
  if (!txRef) {
    res.status(200).json({ received: true });
    return;
  }

  try {
    const verified = await verifyTransaction(flwTxId);
    if (verified.status !== "successful") {
      console.warn("[deposit] webhook verification failed for", txRef);
      res.status(200).json({ received: true });
      return;
    }

    const deposit = await getDepositByFlwRef(txRef);
    if (!deposit) {
      console.warn("[deposit] no deposit found for txRef", txRef);
      res.status(200).json({ received: true });
      return;
    }
    if (deposit.status === "completed" || deposit.status === "sending_usdc") {
      res.status(200).json({ received: true, already: deposit.status });
      return;
    }

    const amountNGN = verified.amount;
    const { rate, feePercent } = await getNGNtoUSDCRate();
    const { amountOut, feeAmount } = calculateUSDC(amountNGN, rate, feePercent);

    await updateDepositStatus(deposit.id, "sending_usdc", {
      amountNGN,
      amountUSDC: parseFloat(amountOut),
      feeNGN: parseFloat(feeAmount) * rate,
      flwTxId,
    });

    const stellarTxHash = await sendUSDC({
      destinationPublicKey: deposit.stellar_public_key,
      amountUSDC: amountOut,
    });

    await updateDepositStatus(deposit.id, "completed", { stellarTxHash });
    console.log("[deposit] completed:", {
      depositId: deposit.id,
      amountNGN,
      amountUSDC: amountOut,
      stellarTxHash: stellarTxHash.slice(0, 8) + "...",
    });
    res.status(200).json({ received: true, completed: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[deposit] webhook processing error:", msg);
    const deposit = await getDepositByFlwRef(txRef);
    if (deposit) {
      await updateDepositStatus(deposit.id, "failed");
    }
    res.status(200).json({ received: true, error: msg });
  }
});

// ─── Virtual Account (Permanent) ──────────────────────────────────────

const virtualAccountSchema = z.object({
  bvn: z.string().length(11, "BVN must be 11 digits"),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
});

/**
 * GET /api/deposit/virtual-account
 * Auth required. Returns the user's existing permanent virtual account, or null.
 */
depositRouter.get("/virtual-account", requireAuth, async (req, res, next) => {
  const userId = (req as Request & { userId: string }).userId;
  console.log("[deposit] GET virtual-account for user", userId);
  const pool = getPool();
  if (!pool) {
    res.status(503).json({ error: "Database not available" });
    return;
  }
  try {
    const row = await pool.query(
      "SELECT * FROM virtual_accounts WHERE user_id = $1",
      [userId]
    );
    if (row.rows.length === 0) {
      console.log("[deposit] no VA found for user", userId);
      res.json({ exists: false });
      return;
    }
    const va = row.rows[0];
    console.log("[deposit] VA found:", va.account_number);
    res.json({
      exists: true,
      accountNumber: va.account_number,
      bankName: va.bank_name,
      accountName: va.account_name,
    });
  } catch (err) {
    console.error("[deposit] GET VA error:", err);
    next(err);
  }
});

/**
 * POST /api/deposit/virtual-account
 * Auth required. Creates a permanent Flutterwave virtual account (requires BVN).
 */
depositRouter.post(
  "/virtual-account",
  requireAuth,
  validateBody(virtualAccountSchema),
  async (req, res) => {
    const userId = (req as Request & { userId: string }).userId;
    console.log("[deposit] POST virtual-account for user", userId);
    const { bvn, firstName, lastName, phoneNumber, email } =
      req.body as z.infer<typeof virtualAccountSchema>;

    if (!config.FLW_SECRET_KEY) {
      console.warn("[deposit] FLW_SECRET_KEY not set");
      res.status(503).json({ error: "Payment provider not configured" });
      return;
    }

    const pool = getPool();
    if (!pool) {
      res.status(503).json({ error: "Database not available" });
      return;
    }

    const existing = await pool.query(
      "SELECT * FROM virtual_accounts WHERE user_id = $1",
      [userId]
    );
    if (existing.rows.length > 0) {
      const va = existing.rows[0];
      res.json({
        exists: true,
        accountNumber: va.account_number,
        bankName: va.bank_name,
        accountName: va.account_name,
      });
      return;
    }

    const userRow = await pool.query<{ email: string | null }>(
      "SELECT email FROM users WHERE id = $1",
      [userId]
    );
    const userEmail = email ?? userRow.rows[0]?.email ?? `${userId}@wallet.app`;
    const txRef = `va_${Date.now()}_${userId.slice(0, 8)}`;

    try {
      const va = await createPermanentVirtualAccount({
        email: userEmail,
        bvn,
        txRef,
        firstName,
        lastName,
        phoneNumber,
      });

      const bvnHash = crypto.createHash("sha256").update(bvn).digest("hex");

      await pool.query(
        `INSERT INTO virtual_accounts
          (user_id, account_number, bank_name, account_name, flw_ref, order_ref, bvn_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, va.accountNumber, va.bankName, va.note, va.flwRef, va.orderRef, bvnHash]
      );

      res.json({
        exists: true,
        accountNumber: va.accountNumber,
        bankName: va.bankName,
        accountName: va.note,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Virtual account creation failed";
      console.error("[deposit] virtual-account error:", msg);
      res.status(500).json({ error: msg });
    }
  }
);
