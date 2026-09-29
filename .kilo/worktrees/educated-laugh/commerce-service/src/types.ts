import type { Request } from "express";

export interface AdminIdentity { id: string; email: string; permissions: string[]; sessionVersion: number }
export interface AdminRequest extends Request { admin?: AdminIdentity; requestId?: string }

