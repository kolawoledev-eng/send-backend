import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authRouter } from "./auth.routes.js";
import { healthRouter } from "./health.routes.js";
import { walletRouter } from "./wallet.routes.js";
import { stellarRouter } from "./stellar.routes.js";

export const apiRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: { error: "Too many auth attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

apiRouter.use("/auth", authLimiter, authRouter);
apiRouter.use("/health", healthRouter);
apiRouter.use("/wallet", walletRouter);
apiRouter.use("/stellar", stellarRouter);

apiRouter.get("/", (_req, res) => {
  res.json({
    name: "Stellar Wallet API",
    version: "1.0.0",
    docs: "/api/health | /api/wallet | /api/stellar",
  });
});
