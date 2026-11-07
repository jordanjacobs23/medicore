export const PERMISSIONS = {
  PRACTITIONER: [
    "patient:*",
    "encounter:*",
    "encounter:read",
    "prescription:*",
    "observation:*",
    "vital:*",
    "claim:*",
    "appointment:*",
  ],
  PRACTICE_MANAGER: [
    "patient:read",
    "patient:create",
    "patient:update",
    "encounter:read",
    "appointment:*",
    "invoice:*",
    "invoice:read",
    "claim:*",
    "report:read",
    "staff:*",
  ],
  RECEPTIONIST: [
    "patient:read",
    "patient:create",
    "appointment:*",
    "communication:create",
  ],
  BILLING_CLERK: [
    "patient:read",
    "invoice:*",
    "invoice:read",
    "claim:*",
    "payment:*",
    "report:read",
  ],
  NURSE: [
    "patient:read",
    "encounter:read",
    "vital:create",
    "vital:read",
    "observation:create",
    "observation:read",
    "appointment:read",
  ],
  ASSISTANT: ["patient:read", "appointment:*"],
  VIEWER: ["patient:read", "report:read"],
  PATIENT: [
    "self:read",
    "self:appointment",
    "self:invoice",
    "self:document",
  ],
} as const;

export type StaffRole = Exclude<keyof typeof PERMISSIONS, "PATIENT">;
export type Permission =
  | "encounter:create"
  | "encounter:update"
  | "prescription:read"
  | "observation:read"
  | (typeof PERMISSIONS)[keyof typeof PERMISSIONS][number];

export function hasPermission(
  role: keyof typeof PERMISSIONS,
  permission: Permission,
) {
  return PERMISSIONS[role].some((value) => {
    const [resource] = permission.split(":");
    return value === permission || value === `${resource}:*`;
  });
}