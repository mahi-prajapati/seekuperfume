import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/http.js";

export const newCsrfToken = () => crypto.randomBytes(32).toString("base64url");
export function requireCsrf(req: Request, _res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const cookie = req.cookies?.seek_csrf;
  const header = req.get("x-csrf-token");
  if (!cookie || !header || cookie.length !== header.length || !crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(header))) return next(new ApiError(403, "Security token mismatch. Refresh and try again.", "CSRF_FAILED"));
  next();
}

