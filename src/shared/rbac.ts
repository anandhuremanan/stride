// Role-based access control. The backend enforces these rules on every request;
// the app uses the same table to hide or disable what a user cannot do.

import type { Role } from "./types.ts";

export type Permission =
  | "workspace:manage" // rename the workspace, change its defaults
  | "members:invite"
  | "members:manage" // change someone's role
  | "project:create"
  | "project:manage" // project settings
  | "sprint:manage" // create sprints, edit goals and dates, move work between sprints
  | "task:create"
  | "task:edit"
  | "task:comment";

const GRANTS: Record<Role, readonly Permission[]> = {
  owner: [
    "workspace:manage",
    "members:invite",
    "members:manage",
    "project:create",
    "project:manage",
    "sprint:manage",
    "task:create",
    "task:edit",
    "task:comment",
  ],
  admin: [
    "workspace:manage",
    "members:invite",
    "members:manage",
    "project:create",
    "project:manage",
    "sprint:manage",
    "task:create",
    "task:edit",
    "task:comment",
  ],
  member: ["task:create", "task:edit", "task:comment"],
  viewer: [],
};

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Workspace owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  owner: "Everything, including other admins",
  admin: "Manages people, projects and sprints",
  member: "Creates and updates tasks, comments",
  viewer: "Read-only access to every project",
};

export function can(role: Role | undefined, permission: Permission): boolean {
  return role ? GRANTS[role].includes(permission) : false;
}

/**
 * Which roles `actor` may hand out to someone who currently holds `target`.
 * Nobody can change the owner; admins cannot promote to or demote from admin.
 */
export function assignableRoles(actor: Role, target: Role): Role[] {
  if (!can(actor, "members:manage") || target === "owner") return [];
  if (actor === "owner") return ["admin", "member", "viewer"];
  return target === "admin" ? [] : ["member", "viewer"];
}
