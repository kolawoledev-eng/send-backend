import { Router } from "express";
import { stellarService } from "../services/stellar.service.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

healthRouter.get("/live", (_req, res) => {
  res.json({ status: "ok" });
});

healthRouter.get("/ready", async (_req, res) => {
  try {
    const stellarHealth = await stellarService.getHealth();
    const ok = stellarHealth.status === "healthy";
    res.status(ok ? 200 : 503).json({
      status: ok ? "ready" : "not ready",
      stellar: stellarHealth,
    });
  } catch (e) {
    res.status(503).json({ status: "not ready", error: String(e) });
  }
});
