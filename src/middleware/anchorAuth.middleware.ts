import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";

export interface AnchorUser {
  stellarKey: string;
  userId: string;
  transactionId?: string;
}

/**
 * Verifies the JWT token added by the Anchor Platform to the interactive URL.
 * The Platform signs this token with SECRET_SEP24_INTERACTIVE_JWT_SECRET.
 * decoded.sub is typically "STELLAR_PUBLIC_KEY" or "STELLAR_PUBLIC_KEY:userId".
 */
export function verifyAnchorJWT(req: Request, res: Response, next: NextFunction): void {
  const secret = config.SECRET_SEP24_INTERACTIVE_JWT_SECRET;
  if (!secret) {
    res.status(503).json({ error: "Anchor interactive auth not configured" });
    return;
  }
  const token =
    (req.query.token as string) ?? (req.headers.authorization?.replace(/^Bearer\s+/i, "") as string);
  if (!token) {
    res.status(401).json({ error: "Missing or invalid token" });
    return;
  }
  try {
    const decoded = jwt.verify(token, secret) as { sub?: string; [k: string]: unknown };
    const sub = decoded.sub ?? "";
    const [stellarKey, userId] = sub.includes(":") ? sub.split(":") : [sub, ""];
    (req as Request & { anchorUser: AnchorUser }).anchorUser = {
      stellarKey,
      userId,
      transactionId: (req.query.transaction_id as string) ?? undefined,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
