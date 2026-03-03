import { Request, Response, NextFunction } from "express";
import { config } from "../config/index.js";

export function errorHandler(
  err: Error & { statusCode?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const message = config.NODE_ENV === "production" && statusCode === 500
    ? "Internal server error"
    : err.message;

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({ error: message });
}
