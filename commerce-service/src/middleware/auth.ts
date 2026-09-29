import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { Admin, Role } from "../models/admin.js";
import { env } from "../config/env.js";
import { ApiError, asyncHandler } from "../utils/http.js";
import type { AdminRequest } from "../types.js";

type TokenPayload = { sub: string; email: string; sv: number };
export const signAdminToken = (admin: { id: string; email: string; sessionVersion: number }) => jwt.sign({ sub: admin.id, email: admin.email, sv: admin.sessionVersion }, env.JWT_SECRET, { expiresIn: "8h", audience: "seek-admin", issuer: "seekuperfumes" });

export const requireAdmin = asyncHandler(async (req: AdminRequest, _res: Response, next: NextFunction) => {
  const raw = req.cookies?.seek_admin || req.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!raw) throw new ApiError(401, "Admin authentication required.", "AUTH_REQUIRED");
  let payload: TokenPayload;
  try { payload = jwt.verify(raw, env.JWT_SECRET, { audience: "seek-admin", issuer: "seekuperfumes" }) as TokenPayload; }
  catch { throw new ApiError(401, "Your admin session has expired.", "SESSION_EXPIRED"); }
  const admin = await Admin.findById(payload.sub).lean();
  if (!admin || admin.status !== "active" || admin.sessionVersion !== payload.sv) throw new ApiError(401, "This session is no longer active.", "SESSION_REVOKED");
  const roles = await Role.find({ _id: { $in: admin.roleIds } }, { permissions: 1 }).lean();
  const permissions = [...new Set<string>(roles.flatMap((r: any) => r.permissions as string[]))];
  req.admin = { id: String(admin._id), email: admin.email, sessionVersion: admin.sessionVersion, permissions };
  next();
});

export const requirePermission = (permission: string) => (req: AdminRequest, _res: Response, next: NextFunction) => {
  if (!req.admin?.permissions.includes(permission)) return next(new ApiError(403, "You do not have permission for this action.", "FORBIDDEN"));
  next();
};

