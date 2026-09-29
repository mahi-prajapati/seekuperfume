import type { AdminRequest } from "../types.js";
import { AuditLog } from "../models/admin.js";

export async function audit(req: AdminRequest, input: { action: string; resourceType: string; resourceId?: string; before?: unknown; after?: unknown; reason?: string }) {
  if (!req.admin) return;
  await AuditLog.create({ ...input, actorId: req.admin.id, actorEmail: req.admin.email, ip: req.ip, userAgent: req.get("user-agent"), requestId: req.requestId });
}

