import { Router } from "express";
import { healthRouter } from "./health.routes.js";
import { walletRouter } from "./wallet.routes.js";
import { stellarRouter } from "./stellar.routes.js";

export const apiRouter = Router();

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
