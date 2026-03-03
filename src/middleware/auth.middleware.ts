import type { Request, Response, NextFunction } from "express";
import { verifyAuthToken } from "../services/auth.service.js";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    console.warn("[auth] rejected:", req.method, req.path, "- no auth header");
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const { userId } = verifyAuthToken(token);
    (req as Request & { userId: string }).userId = userId;
    next();
  } catch {
    console.warn("[auth] rejected:", req.method, req.path, "- invalid/expired token");
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
