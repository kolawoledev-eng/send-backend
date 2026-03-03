import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (result.success) {
      req.body = result.data;
      next();
      return;
    }
    const err = result.error as ZodError;
    res.status(400).json({
      error: "Validation failed",
      details: err.flatten().fieldErrors,
    });
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (result.success) {
      req.query = result.data as Request["query"];
      next();
      return;
    }
    const err = result.error as ZodError;
    res.status(400).json({
      error: "Validation failed",
      details: err.flatten().fieldErrors,
    });
  };
}
