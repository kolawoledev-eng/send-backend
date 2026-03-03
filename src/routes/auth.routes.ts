import { Router } from "express";
import { z } from "zod";
import { registerOrLogin, linkWallet } from "../db/users.js";
import { validateBody } from "../middleware/validate.middleware.js";

export const authRouter = Router();

const registerLoginSchema = z.object({
  provider: z.enum(["apple", "google"]),
  providerUserId: z.string().min(1).max(256),
});

const linkWalletSchema = z.object({
  userId: z.string().uuid(),
  stellarPublicKey: z.string().length(56).regex(/^G[A-Z2-7]{55}$/),
});

authRouter.post(
  "/register-or-login",
  validateBody(registerLoginSchema),
  async (req, res, next) => {
    try {
      const { provider, providerUserId } = req.body as z.infer<typeof registerLoginSchema>;
      const result = await registerOrLogin(provider, providerUserId);
      console.log("[auth] register-or-login", { provider, isNewUser: result.isNewUser, userId: result.userId });
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

authRouter.post(
  "/link-wallet",
  validateBody(linkWalletSchema),
  async (req, res, next) => {
    try {
      const { userId, stellarPublicKey } = req.body as z.infer<typeof linkWalletSchema>;
      await linkWallet(userId, stellarPublicKey);
      const keySuffix = stellarPublicKey.slice(-4);
      console.log("[auth] link-wallet", { userId, stellarPublicKey: `...${keySuffix}` });
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }
);
