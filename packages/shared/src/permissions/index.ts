import { z } from "zod";

/**
 * Permission keys from the spec's permission matrix.
 * Single source of truth: derive the type and the Zod enum from this array.
 */
export const PERMISSIONS = [
  "course:manage",
  "content:upload",
  "content:view",
  "submission:create",
  "submission:grade",
  "grade:publish",
  "grade:view",
  "exam:manage",
  "exam:take",
  "attendance:mark",
  "attendance:view",
  "fee:manage",
  "fee:view",
  "ai:tutor",
  "user:invite",
  "audit:read",
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];

export const PermissionKeySchema = z.enum(PERMISSIONS);

/**
 * Seeded system roles. Custom roles will also exist, so `RoleKey` covers the
 * system roles only. The platform super admin is handled separately (it is not
 * a tenant role) and is intentionally not in this list.
 */
export const SYSTEM_ROLES = [
  "owner",
  "admin",
  "teacher",
  "teaching_assistant",
  "student",
  "parent",
  "accountant",
] as const;

export type RoleKey = (typeof SYSTEM_ROLES)[number];
