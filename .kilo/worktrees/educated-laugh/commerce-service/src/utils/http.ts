import type { NextFunction, Request, Response } from "express";
import crypto from "node:crypto";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(public status: number, message: string, public code = "REQUEST_FAILED", public details?: unknown) { super(message); }
}

export const asyncHandler = (fn: (req: any, res: Response, next: NextFunction) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);
export const ok = (res: Response, data: unknown, meta?: unknown) => res.json({ success: true, data, ...(meta ? { meta } : {}) });
export const requestContext = (req: any, res: Response, next: NextFunction) => { req.requestId = req.get("x-request-id") || crypto.randomUUID(); res.setHeader("x-request-id", req.requestId); next(); };
export const errorHandler = (error: unknown, req: any, res: Response, _next: NextFunction) => {
  const known = error instanceof ApiError;
  const validation = error instanceof ZodError;
  const status = known ? error.status : validation ? 422 : 500;
  const code = known ? error.code : validation ? "VALIDATION_FAILED" : "INTERNAL_ERROR";
  const message = known ? error.message : validation ? "The submitted data is invalid." : "Something went wrong.";
  if (status === 500) console.error(JSON.stringify({ level: "error", requestId: req.requestId, error }));
  res.status(status).json({ success: false, error: { code, message, details: known ? error.details : validation ? error.flatten() : undefined, requestId: req.requestId } });
};

