import mongoose, { Schema, model, Types } from "mongoose";

const { models } = mongoose;

export const PERMISSIONS = [
  "dashboard.read", "products.read", "products.write", "products.publish", "inventory.read", "inventory.adjust",
  "orders.read", "orders.manage", "payments.read", "refunds.manage", "customers.read", "customers.manage",
  "reviews.moderate", "coupons.manage", "cms.manage", "reports.read", "exports.create", "admins.manage",
  "settings.manage", "audit.read"
] as const;

const RoleSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: String,
  permissions: [{ type: String, enum: PERMISSIONS }],
  isSystem: { type: Boolean, default: false },
}, { timestamps: true });

const AdminSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  roleIds: [{ type: Types.ObjectId, ref: "Role" }],
  status: { type: String, enum: ["active", "suspended"], default: "active", index: true },
  lastLoginAt: Date,
  passwordChangedAt: Date,
  sessionVersion: { type: Number, default: 1 },
}, { timestamps: true });

const AuditLogSchema = new Schema({
  actorId: { type: Types.ObjectId, ref: "Admin", index: true },
  actorEmail: { type: String, required: true },
  action: { type: String, required: true, index: true },
  resourceType: { type: String, required: true, index: true },
  resourceId: { type: String, index: true },
  before: Schema.Types.Mixed,
  after: Schema.Types.Mixed,
  reason: String,
  ip: String,
  userAgent: String,
  requestId: String,
}, { timestamps: { createdAt: true, updatedAt: false } });
AuditLogSchema.index({ createdAt: -1 });

export const Role: any = models.Role || model("Role", RoleSchema);
export const Admin: any = models.Admin || model("Admin", AdminSchema);
export const AuditLog: any = models.AuditLog || model("AuditLog", AuditLogSchema);

