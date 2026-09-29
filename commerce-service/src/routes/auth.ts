import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Admin } from "../models/admin.js";
import { asyncHandler, ApiError, ok } from "../utils/http.js";
import { env } from "../config/env.js";
import { newCsrfToken } from "../middleware/csrf.js";
import { requireAdmin, signAdminToken } from "../middleware/auth.js";
import type { AdminRequest } from "../types.js";

const router = Router();
const loginSchema = z.object({ email: z.email(), password: z.string().min(8) });
router.post("/login", asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const admin = await Admin.findOne({ email: input.email.toLowerCase() }).select("+passwordHash");
  if (!admin || admin.status !== "active" || !(await bcrypt.compare(input.password, admin.passwordHash))) throw new ApiError(401, "Email or password is incorrect.", "INVALID_CREDENTIALS");
  admin.lastLoginAt = new Date(); await admin.save();
  const csrf = newCsrfToken();
  res.cookie("seek_admin", signAdminToken({ id: admin.id, email: admin.email, sessionVersion: admin.sessionVersion }), { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "strict", maxAge: 8 * 60 * 60 * 1000 });
  res.cookie("seek_csrf", csrf, { httpOnly: false, secure: env.NODE_ENV === "production", sameSite: "strict", maxAge: 8 * 60 * 60 * 1000 });
  return ok(res, { admin: { id: admin.id, name: admin.name, email: admin.email }, csrf });
}));
router.post("/logout", (_req, res) => { res.clearCookie("seek_admin"); res.clearCookie("seek_csrf"); return ok(res, { loggedOut: true }); });
router.get("/me", requireAdmin, (req: AdminRequest, res) => ok(res, req.admin));
export default router;

