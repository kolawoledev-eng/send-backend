import { Router } from "express";
import { stellarService } from "../services/stellar.service.js";

export const stellarRouter = Router();

stellarRouter.get("/network", (_req, res) => {
  res.json({ network: stellarService.getNetwork() });
});

stellarRouter.get("/ledger", async (_req, res, next) => {
  try {
    const ledger = await stellarService.getLatestLedger();
    res.json(ledger);
  } catch (e) {
    next(e);
  }
});
