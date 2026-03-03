import { Router, type Request } from "express";
import { z } from "zod";
import { registerOrLogin, linkWallet } from "../db/users.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { verifyAppleIdToken, verifyGoogleIdToken, issueAuthToken } from "../services/auth.service.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import type { Provider } from "../db/users.js";

export const authRouter = Router();

const socialSchema = z.object({
  provider: z.enum(["apple", "google"]),
  idToken: z.string().min(1),
});

const registerLoginSchema = z.object({
  provider: z.enum(["apple", "google"]),
  providerUserId: z.string().min(1).max(256),
  email: z.string().max(320).optional().nullable(),
});

const linkWalletSchema = z.object({
  userId: z.string().uuid(),
  stellarPublicKey: z.string().length(56).regex(/^G[A-Z2-7]{55}$/),
});

const walletSchema = z.object({
  stellarPublicKey: z.string().length(56).regex(/^G[A-Z2-7]{55}$/),
});

/** POST /auth/social – validate Apple/Google idToken, create or find user, return JWT + isNewUser */
authRouter.post(
  "/social",
  validateBody(socialSchema),
  async (req, res, next) => {
    try {
      const { provider, idToken } = req.body as z.infer<typeof socialSchema>;
      let payload: { providerUserId: string; email: string | null };
      if (provider === "apple") {
        payload = await verifyAppleIdToken(idToken);
      } else if (provider === "google") {
        payload = await verifyGoogleIdToken(idToken);
      } else {
        res.status(400).json({ error: "Invalid provider" });
        return;
      }
      const result = await registerOrLogin(
        provider as Provider,
        payload.providerUserId,
        payload.email
      );
      const authToken = issueAuthToken(result.userId);
      console.log("[auth] social", { provider, isNewUser: result.isNewUser, userId: result.userId });
      res.json({
        isNewUser: result.isNewUser,
        userId: result.userId,
        authToken,
        stellarPublicKey: result.stellarPublicKey ?? undefined,
      });
    } catch (e) {
      next(e);
    }
  }
);

authRouter.post(
  "/register-or-login",
  validateBody(registerLoginSchema),
  async (req, res, next) => {
    try {
      const { provider, providerUserId, email } = req.body as z.infer<typeof registerLoginSchema>;
      const result = await registerOrLogin(provider, providerUserId, email);
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

/** POST /auth/wallet – attach wallet to authenticated user (JWT). Body: { stellarPublicKey } */
authRouter.post(
  "/wallet",
  requireAuth,
  validateBody(walletSchema),
  async (req, res, next) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      const { stellarPublicKey } = req.body as z.infer<typeof walletSchema>;
      await linkWallet(userId, stellarPublicKey);
      const keySuffix = stellarPublicKey.slice(-4);
      console.log("[auth] wallet", { userId, stellarPublicKey: `...${keySuffix}` });
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }
);
