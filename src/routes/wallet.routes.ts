import { Router } from "express";
import { z } from "zod";
import { stellarService } from "../services/stellar.service.js";
import { validateQuery } from "../middleware/validate.middleware.js";

export const walletRouter = Router();

const publicKeyQuerySchema = z.object({
  publicKey: z.string().min(56).max(56).regex(/^G[A-Z2-7]{55}$/, "Invalid Stellar public key"),
});

walletRouter.get(
  "/balances",
  validateQuery(publicKeyQuerySchema),
  async (req, res, next) => {
    try {
      const { publicKey } = req.query as z.infer<typeof publicKeyQuerySchema>;
      const balances = await stellarService.getAccountBalances(publicKey);
      res.json({ publicKey, balances });
    } catch (e) {
      next(e);
    }
  }
);

walletRouter.get(
  "/exists",
  validateQuery(publicKeyQuerySchema),
  async (req, res, next) => {
    try {
      const { publicKey } = req.query as z.infer<typeof publicKeyQuerySchema>;
      const exists = await stellarService.getAccountExists(publicKey);
      res.json({ publicKey, exists });
    } catch (e) {
      next(e);
    }
  }
);

/** Fund a new account on testnet via Friendbot (only when STELLAR_NETWORK=testnet). */
walletRouter.get(
  "/fund",
  validateQuery(publicKeyQuerySchema),
  async (req, res, next) => {
    try {
      const { publicKey } = req.query as z.infer<typeof publicKeyQuerySchema>;
      const ok = await stellarService.fundTestnetAccount(publicKey);
      if (!ok) {
        return res.status(400).json({
          error: "Funding only available on testnet, or invalid public key",
        });
      }
      res.json({ publicKey, funded: true });
    } catch (e) {
      next(e);
    }
  }
);
