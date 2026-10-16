// The backend's HTTP API. Every handler authenticates from the session cookie
// and checks permissions with the same table the app uses (src/shared/rbac).

import type { IncomingMessage, ServerResponse } from "node:http";
import { assignableRoles, can, type Permission } from "../src/shared/rbac.ts";
import {
  ESTIMATES,
  PRIORITIES,
  ROLES,
  STATUSES,
  TASK_TYPES,
  type Activity,
  type Project,
  type Role,
  type Sprint,
  type SprintStats,
  type Task,
} from "../src/shared/types.ts";
import {
  createSession,
  endSession,
  endSessionsFor,
  hashPassword,
  publicUser,
  readCookie,
  SESSION_COOKIE,
  sessionCookie,
  temporaryPassword,
  userForToken,
  verifyPassword,
} from "./auth.ts";
import { addDays, now, parseDate, today, workingDays } from "./clock.ts";
import { getDb, saveDb, type StoredProject, type StoredSprint, type StoredUser } from "./db.ts";

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface Ctx {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
  query: URLSearchParams;
  body: Record<string, unknown>;
  user: StoredUser | null;
  token: string | undefined;
}

type Handler = (ctx: Ctx) => unknown;

interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: Handler;
}

const routes: Route[] = [];

function route(method: string, path: string, handler: Handler) {
  const keys: string[] = [];
  const pattern = new RegExp(
    "^" +
      path.replace(/:(\w+)/g, (_, key: string) => {
        keys.push(key);
        return "([^/]+)";
      }) +
      "$",
  );
  routes.push({ method, pattern, keys, handler });
}

// ---------------------------------------------------------------- helpers

function requireUser(ctx: Ctx): StoredUser {
  if (!ctx.user) throw new HttpError(401, "Please sign in.");
  return ctx.user;
}

function requirePermission(ctx: Ctx, permission: Permission): StoredUser {
  const user = requireUser(ctx);
  if (!can(user.role, permission)) throw new HttpError(403, "Your role doesn’t allow this.");
  return user;
}

function str(body: Record<string, unknown>, key: string, { required = false, max = 200, label = key } = {}) {
  const value = body[key];
  if (value === undefined || value === null || value === "") {
    if (required) throw new HttpError(400, `${label} is required.`);
    return undefined;
  }
  if (typeof value !== "string") throw new HttpError(400, `${label} must be text.`);
  const trimmed = value.trim();
  if (required && !trimmed) throw new HttpError(400, `${label} is required.`);
  if (trimmed.length > max) throw new HttpError(400, `${label} is too long.`);
  return trimmed;
}

function oneOf<T extends string | number>(value: unknown, allowed: readonly T[], label: string): T | undefined {
  if (value === undefined) return undefined;
  if (!allowed.includes(value as T)) throw new HttpError(400, `${label} is not valid.`);
  return value as T;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function email(body: Record<string, unknown>): string {
  const value = str(body, "email", { required: true, max: 120, label: "Email" })!.toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(value)) throw new HttpError(400, "Enter a valid email address.");
  return value;
}

function password(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || value.length < 8) throw new HttpError(400, "Passwords need at least 8 characters.");
  if (value.length > 200) throw new HttpError(400, "That password is too long.");
  return value;
}

const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function findProject(slug: string): StoredProject {
  const project = getDb().projects.find((p) => p.slug === slug);
  if (!project) throw new HttpError(404, "Project not found.");
  return project;
}

function findTask(id: string): Task {
  const task = getDb().tasks.find((t) => t.id === id);
  if (!task) throw new HttpError(404, "Task not found.");
  return task;
}

function findSprint(id: string): StoredSprint {
  const sprint = getDb().sprints.find((s) => s.id === id);
  if (!sprint) throw new HttpError(404, "Sprint not found.");
  return sprint;
}

function activeUser(id: unknown): StoredUser {
  const user = getDb().users.find((u) => u.id === id && u.status === "active");
  if (!user) throw new HttpError(400, "Pick someone who is active in the workspace.");
  return user;
}

function log(actor: StoredUser, projectId: string, text: string, detail: string, taskId?: string) {
  const entry: Activity = { id: nextId("a"), projectId, taskId, actorId: actor.id, text, detail, createdAt: now().toISOString() };
  getDb().activity.push(entry);
}

/** Weeks in "2 weeks" → the sprint's last working day: the day before the same weekday N weeks on, pulled back off a weekend. */
function sprintEnd(start: string, length: string): string {
  const weeks = Number.parseInt(length, 10) || 2;
  const end = addDays(start, weeks * 7 - 1);
  const day = parseDate(end).getDay();
  return day === 6 ? addDays(end, -1) : day === 0 ? addDays(end, -2) : end;
}

/** The Monday on or after a date. */
function mondayFrom(iso: string): string {
  return addDays(iso, (8 - parseDate(iso).getDay()) % 7);
}

// ---------------------------------------------------------------- views

function projectView(p: StoredProject): Project {
  const live = getDb().tasks.filter((t) => t.projectId === p.id);
  return { ...p, tasksDone: live.filter((t) => t.status === "Done").length, tasksTotal: live.length };
}

function statsFor(list: Task[]): SprintStats {
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, { tasks: 0, points: 0 }])) as SprintStats["byStatus"];
  for (const t of list) {
    byStatus[t.status].tasks += 1;
    byStatus[t.status].points += t.points;
  }
  return {
    tasks: list.length,
    points: list.reduce((n, t) => n + t.points, 0),
    doneTasks: byStatus.Done.tasks,
    donePoints: byStatus.Done.points,
    byStatus,
  };
}

function sprintView(s: StoredSprint): Sprint {
  const days = workingDays(s.start, s.end);
  let stats = statsFor(getDb().tasks.filter((t) => t.sprintId === s.id));
  if (s.archive) {
    stats = {
      ...stats,
      tasks: s.archive.tasksTotal,
      points: s.archive.committed,
      doneTasks: s.archive.tasksDone,
      donePoints: s.archive.delivered,
    };
  }
  return {
    id: s.id,
    projectId: s.projectId,
    name: s.name,
    status: s.status,
    goal: s.goal,
    start: s.start,
    end: s.end,
    capacity: s.capacity,
    stats,
    workingDays: days,
    daysLeft: s.status === "active" ? days.filter((d) => d > today()).length : 0,
  };
}

/** Record today's remaining points for an active sprint, so the burndown has history. */
function snapshot(sprintId: string | null) {
  if (!sprintId) return;
  const sprint = getDb().sprints.find((s) => s.id === sprintId);
  if (!sprint || sprint.status !== "active") return;
  const stats = statsFor(getDb().tasks.filter((t) => t.sprintId === sprint.id));
  const remaining = stats.points - stats.donePoints;
  const day = today();
  const existing = sprint.burndown.find((p) => p.date === day);
  if (existing) existing.remaining = remaining;
  else sprint.burndown.push({ date: day, remaining });
}

function session(user: StoredUser) {
  const { workspace } = getDb();
  if (!workspace) throw new HttpError(409, "This workspace hasn’t been set up yet.");
  return { user: publicUser(user), workspace: { ...workspace, today: today(), now: now().toISOString() } };
}

// ---------------------------------------------------------------- setup & auth

route("GET", "/auth/status", () => ({ setupRequired: getDb().users.length === 0 }));

/** First run only: creates the workspace and its first account, who becomes the owner. */
route("POST", "/auth/setup", ({ body, res }) => {
  const db = getDb();
  if (db.users.length > 0) throw new HttpError(409, "This workspace is already set up. Sign in instead.");
  const workspaceName = str(body, "workspaceName", { required: true, max: 60, label: "Workspace name" })!;
  const owner: StoredUser = {
    id: nextId("u"),
    name: str(body, "name", { required: true, max: 80, label: "Your name" })!,
    email: email(body),
    role: "owner",
    focus: str(body, "focus", { max: 60 }) ?? "Workspace owner",
    status: "active",
    mustChangePassword: false,
    ...hashPassword(password(body, "password")),
  };
  db.workspace = {
    name: workspaceName,
    timeZone: str(body, "timeZone", { max: 60 }) ?? "UTC",
    weekStart: "Monday",
  };
  db.users.push(owner);
  saveDb();
  res.setHeader("Set-Cookie", sessionCookie(createSession(owner.id)));
  return session(owner);
});

route("POST", "/auth/login", ({ body, res }) => {
  const address = str(body, "email", { required: true, label: "Email" })!.toLowerCase();
  const attempt = typeof body.password === "string" ? body.password : "";
  const user = getDb().users.find((u) => u.email.toLowerCase() === address);
  if (!user || !verifyPassword(user, attempt)) {
    throw new HttpError(401, "That email and password don’t match an account.");
  }
  if (user.status !== "active") throw new HttpError(403, "This account has been deactivated. Ask an admin.");
  res.setHeader("Set-Cookie", sessionCookie(createSession(user.id)));
  return session(user);
});

route("POST", "/auth/logout", ({ token, res }) => {
  if (token) endSession(token);
  res.setHeader("Set-Cookie", sessionCookie("", 0));
  return { ok: true };
});

route("GET", "/auth/session", (ctx) => session(requireUser(ctx)));

route("POST", "/auth/password", (ctx) => {
  const user = requireUser(ctx);
  const current = typeof ctx.body.currentPassword === "string" ? ctx.body.currentPassword : "";
  if (!verifyPassword(user, current)) throw new HttpError(400, "Your current password isn’t right.");
  const next = password(ctx.body, "newPassword");
  if (next === current) throw new HttpError(400, "Choose a password you haven’t just used.");
  Object.assign(user, hashPassword(next), { mustChangePassword: false });
  endSessionsFor(user.id, ctx.token); // sign out other devices
  saveDb();
  return session(user);
});

// ---------------------------------------------------------------- workspace & people

route("PATCH", "/workspace", (ctx) => {
  requirePermission(ctx, "workspace:manage");
  const workspace = getDb().workspace!;
  const name = str(ctx.body, "name", { max: 60 });
  if (ctx.body.name !== undefined && !name) throw new HttpError(400, "Give the workspace a name.");
  if (name) workspace.name = name;
  const timeZone = str(ctx.body, "timeZone", { max: 60 });
  if (timeZone) workspace.timeZone = timeZone;
  const weekStart = oneOf(ctx.body.weekStart, ["Monday", "Sunday", "Saturday"], "weekStart");
  if (weekStart) workspace.weekStart = weekStart;
  saveDb();
  return session(ctx.user!).workspace;
});

route("GET", "/users", (ctx) => {
  requireUser(ctx);
  return getDb().users.map(publicUser);
});

/** Admins add people directly and hand over a one-time password; there is no email in this product. */
route("POST", "/users", (ctx) => {
  const actor = requirePermission(ctx, "members:invite");
  const db = getDb();
  const address = email(ctx.body);
  if (db.users.some((u) => u.email.toLowerCase() === address)) throw new HttpError(409, "Someone with that email is already in the workspace.");
  const role = oneOf<Role>(ctx.body.role, ROLES, "role") ?? "member";
  if (role === "owner" || (role === "admin" && actor.role !== "owner")) {
    throw new HttpError(403, `Your role can’t add someone as ${role}.`);
  }
  const temp = temporaryPassword();
  const user: StoredUser = {
    id: nextId("u"),
    name: str(ctx.body, "name", { required: true, max: 80, label: "Name" })!,
    email: address,
    role,
    focus: str(ctx.body, "focus", { max: 60 }) ?? "",
    status: "active",
    mustChangePassword: true,
    ...hashPassword(temp),
  };
  db.users.push(user);
  saveDb();
  return { user: publicUser(user), temporaryPassword: temp };
});

/** Who `actor` may manage: never themselves, never the owner, and admins can't manage other admins. */
function manageable(actor: StoredUser, target: StoredUser) {
  if (target.id === actor.id) throw new HttpError(403, "You can’t change your own account here.");
  if (target.role === "owner") throw new HttpError(403, "Nobody can change the workspace owner.");
  if (target.role === "admin" && actor.role !== "owner") throw new HttpError(403, "Only the owner can change an admin.");
}

route("PATCH", "/users/:id", (ctx) => {
  const actor = requirePermission(ctx, "members:manage");
  const target = getDb().users.find((u) => u.id === ctx.params.id);
  if (!target) throw new HttpError(404, "Member not found.");
  manageable(actor, target);
  const role = oneOf<Role>(ctx.body.role, ROLES, "role");
  if (role) {
    if (!assignableRoles(actor.role, target.role).includes(role)) throw new HttpError(403, "Your role can’t make that change.");
    target.role = role;
  }
  const status = oneOf(ctx.body.status, ["active", "deactivated"] as const, "status");
  if (status) {
    target.status = status;
    if (status === "deactivated") endSessionsFor(target.id);
  }
  saveDb();
  return publicUser(target);
});

route("POST", "/users/:id/reset-password", (ctx) => {
  const actor = requirePermission(ctx, "members:manage");
  const target = getDb().users.find((u) => u.id === ctx.params.id);
  if (!target) throw new HttpError(404, "Member not found.");
  manageable(actor, target);
  const temp = temporaryPassword();
  Object.assign(target, hashPassword(temp), { mustChangePassword: true });
  endSessionsFor(target.id);
  saveDb();
  return { user: publicUser(target), temporaryPassword: temp };
});

// ---------------------------------------------------------------- projects

route("GET", "/projects", (ctx) => {
  requireUser(ctx);
  return getDb().projects.map(projectView);
});

function projectKey(value: string | undefined, selfId?: string): string {
  const key = (value ?? "").toUpperCase();
  if (!/^[A-Z]{2,4}$/.test(key)) throw new HttpError(400, "The task prefix is 2–4 letters.");
  if (getDb().projects.some((p) => p.key === key && p.id !== selfId)) throw new HttpError(409, "Another project already uses that prefix.");
  return key;
}

route("POST", "/projects", (ctx) => {
  const actor = requirePermission(ctx, "project:create");
  const db = getDb();
  const name = str(ctx.body, "name", { required: true, max: 60, label: "Project name" })!;
  const key = projectKey(str(ctx.body, "key", { required: true, max: 4, label: "Task prefix" }));
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || key.toLowerCase();
  if (db.projects.some((p) => p.slug === slug)) throw new HttpError(409, "A project with that name already exists.");
  const owner = ctx.body.ownerId ? activeUser(ctx.body.ownerId) : actor;
  const milestoneDate = ctx.body.milestoneDate;
  if (milestoneDate !== undefined && !isIsoDate(milestoneDate)) throw new HttpError(400, "Pick a milestone date.");
  const project: StoredProject = {
    id: nextId("p"),
    slug,
    key,
    name,
    description: str(ctx.body, "description", { max: 140 }) ?? "",
    status: "Planning",
    ownerId: owner.id,
    milestone: str(ctx.body, "milestone", { max: 80 }) ?? "Kick-off",
    milestoneDate: (milestoneDate as string | undefined) ?? addDays(today(), 14),
    sprintLength: "2 weeks",
  };
  db.projects.push(project);
  log(actor, project.id, `created ${project.name}`, project.description || "New project");
  saveDb();
  return projectView(project);
});

route("GET", "/projects/:slug", (ctx) => {
  requireUser(ctx);
  return projectView(findProject(ctx.params.slug));
});

route("PATCH", "/projects/:slug", (ctx) => {
  requirePermission(ctx, "project:manage");
  const project = findProject(ctx.params.slug);
  const { body } = ctx;
  const name = str(body, "name", { max: 60 });
  if (body.name !== undefined && !name) throw new HttpError(400, "Give the project a name.");
  if (name) project.name = name;
  if (body.key !== undefined) project.key = projectKey(str(body, "key", { max: 4 }), project.id);
  if (body.description !== undefined) project.description = str(body, "description", { max: 140 }) ?? "";
  if (body.ownerId) project.ownerId = activeUser(body.ownerId).id;
  const sprintLength = oneOf(body.sprintLength, ["1 week", "2 weeks", "3 weeks", "4 weeks"], "sprintLength");
  if (sprintLength) project.sprintLength = sprintLength;
  const milestone = str(body, "milestone", { max: 80 });
  if (milestone) project.milestone = milestone;
  if (body.milestoneDate !== undefined) {
    if (!isIsoDate(body.milestoneDate)) throw new HttpError(400, "Pick a milestone date.");
    project.milestoneDate = body.milestoneDate;
  }
  saveDb();
  return projectView(project);
});

// ---------------------------------------------------------------- sprints

route("GET", "/sprints", (ctx) => {
  requireUser(ctx);
  return getDb().sprints.map(sprintView);
});

route("GET", "/projects/:slug/sprints", (ctx) => {
  requireUser(ctx);
  const project = findProject(ctx.params.slug);
  return getDb()
    .sprints.filter((s) => s.projectId === project.id)
    .map(sprintView);
});

route("POST", "/projects/:slug/sprints", (ctx) => {
  const actor = requirePermission(ctx, "sprint:manage");
  const db = getDb();
  const project = findProject(ctx.params.slug);
  const own = db.sprints.filter((s) => s.projectId === project.id);
  if (own.some((s) => s.status === "planned")) throw new HttpError(409, "Finish planning the upcoming sprint first.");
  const last = own.at(-1);
  // The first sprint can start now; later ones start the Monday after the last one ends.
  const start = last ? mondayFrom(addDays(last.end, 1)) : [0, 6].includes(now().getDay()) ? mondayFrom(today()) : today();
  const sprint: StoredSprint = {
    id: nextId("s"),
    projectId: project.id,
    name: `Sprint ${String(own.length + 1).padStart(2, "0")}`,
    status: "planned",
    goal: str(ctx.body, "goal", { max: 200 }) ?? "",
    start,
    end: sprintEnd(start, project.sprintLength),
    capacity: last?.capacity ?? 20,
    burndown: [],
  };
  db.sprints.push(sprint);
  log(actor, project.id, `created ${sprint.name}`, project.name);
  saveDb();
  return sprintView(sprint);
});

route("PATCH", "/sprints/:id", (ctx) => {
  const actor = requirePermission(ctx, "sprint:manage");
  const sprint = findSprint(ctx.params.id);
  if (sprint.status === "completed") throw new HttpError(409, "Completed sprints can’t be changed.");
  const goal = str(ctx.body, "goal", { max: 200 });
  if (goal !== undefined) sprint.goal = goal;
  const { start, end } = ctx.body;
  if (start !== undefined || end !== undefined) {
    if (!isIsoDate(start) || !isIsoDate(end) || start > end) throw new HttpError(400, "Pick a start and an end date.");
    sprint.start = start;
    sprint.end = end;
  }
  const capacity = ctx.body.capacity;
  if (capacity !== undefined) {
    if (typeof capacity !== "number" || capacity < 1 || capacity > 500) throw new HttpError(400, "Capacity is 1–500 points.");
    sprint.capacity = capacity;
  }
  log(actor, sprint.projectId, `updated ${sprint.name}`, goal !== undefined ? "Goal changed" : "Plan changed");
  saveDb();
  return sprintView(sprint);
});

route("POST", "/sprints/:id/start", (ctx) => {
  const actor = requirePermission(ctx, "sprint:manage");
  const db = getDb();
  const sprint = findSprint(ctx.params.id);
  if (sprint.status !== "planned") throw new HttpError(409, "Only a planned sprint can start.");
  if (db.sprints.some((s) => s.projectId === sprint.projectId && s.status === "active")) {
    throw new HttpError(409, "Complete the running sprint first.");
  }
  const project = db.projects.find((p) => p.id === sprint.projectId)!;
  sprint.status = "active";
  if (sprint.start > today() || sprint.end < today()) {
    sprint.start = today();
    sprint.end = sprintEnd(today(), project.sprintLength);
  }
  project.status = "Active";
  snapshot(sprint.id);
  log(actor, project.id, `started ${sprint.name}`, sprint.goal || project.name);
  saveDb();
  return sprintView(sprint);
});

route("POST", "/sprints/:id/complete", (ctx) => {
  const actor = requirePermission(ctx, "sprint:manage");
  const db = getDb();
  const sprint = findSprint(ctx.params.id);
  if (sprint.status !== "active") throw new HttpError(409, "Only the running sprint can be completed.");
  const tasks = db.tasks.filter((t) => t.sprintId === sprint.id);
  const stats = statsFor(tasks);
  snapshot(sprint.id);
  sprint.archive = { committed: stats.points, delivered: stats.donePoints, tasksDone: stats.doneTasks, tasksTotal: stats.tasks };
  sprint.status = "completed";
  if (sprint.end > today()) sprint.end = today();
  // Unfinished work rolls into the next planned sprint, or back to the backlog.
  const next = db.sprints.find((s) => s.projectId === sprint.projectId && s.status === "planned");
  const unfinished = tasks.filter((t) => t.status !== "Done");
  for (const t of unfinished) t.sprintId = next?.id ?? null;
  log(
    actor,
    sprint.projectId,
    `completed ${sprint.name}`,
    `${stats.donePoints} of ${stats.points} points delivered` +
      (unfinished.length ? ` · ${unfinished.length} moved to ${next?.name ?? "the backlog"}` : ""),
  );
  saveDb();
  return sprintView(sprint);
});

route("GET", "/projects/:slug/report", (ctx) => {
  requireUser(ctx);
  const project = findProject(ctx.params.slug);
  const own = getDb().sprints.filter((s) => s.projectId === project.id);
  const chosen =
    own.find((s) => s.id === ctx.query.get("sprint")) ??
    own.find((s) => s.status === "active") ??
    own.filter((s) => s.status === "completed").at(-1);
  if (!chosen) throw new HttpError(404, "This project hasn’t run a sprint yet.");
  const view = sprintView(chosen);
  let burndown = chosen.burndown.filter((p) => p.date >= chosen.start);
  if (chosen.status === "active") {
    burndown = [
      ...burndown.filter((p) => p.date !== today()),
      { date: today(), remaining: view.stats.points - view.stats.donePoints },
    ];
  }
  const history = own
    .filter((s) => s.status === "completed" && s.archive)
    .slice(-3)
    .map((s) => ({ name: s.name, delivered: s.archive!.delivered, committed: s.archive!.committed }));
  return { sprint: view, burndown, history };
});

// ---------------------------------------------------------------- tasks

route("GET", "/projects/:slug/tasks", (ctx) => {
  requireUser(ctx);
  const project = findProject(ctx.params.slug);
  return getDb().tasks.filter((t) => t.projectId === project.id);
});

/** Tasks assigned to me, plus anything in review on a project I own. */
route("GET", "/me/tasks", (ctx) => {
  const me = requireUser(ctx);
  const db = getDb();
  const owned = new Set(db.projects.filter((p) => p.ownerId === me.id).map((p) => p.id));
  return db.tasks.filter((t) => t.assigneeId === me.id || (t.status === "In review" && owned.has(t.projectId)));
});

function openSprint(projectId: string, sprintId: unknown): string | null {
  if (sprintId === undefined || sprintId === null || sprintId === "") return null;
  const sprint = getDb().sprints.find((s) => s.id === sprintId && s.projectId === projectId);
  if (!sprint) throw new HttpError(400, "That sprint isn’t part of this project.");
  if (sprint.status === "completed") throw new HttpError(409, "Work can’t be added to a completed sprint.");
  return sprint.id;
}

route("POST", "/projects/:slug/tasks", (ctx) => {
  const actor = requirePermission(ctx, "task:create");
  const db = getDb();
  const project = findProject(ctx.params.slug);
  const numbers = db.tasks.filter((t) => t.projectId === project.id).map((t) => Number(t.id.split("-").at(-1)) || 0);
  const sprintId = openSprint(project.id, ctx.body.sprintId);
  const due = ctx.body.due;
  if (due !== undefined && due !== null && !isIsoDate(due)) throw new HttpError(400, "due must be a date.");
  const task: Task = {
    id: `${project.key}-${Math.max(0, ...numbers) + 1}`,
    projectId: project.id,
    title: str(ctx.body, "title", { required: true, max: 120, label: "Title" })!,
    type: oneOf(ctx.body.type, TASK_TYPES, "type") ?? "Task",
    priority: oneOf(ctx.body.priority, PRIORITIES, "priority") ?? "Medium",
    points: oneOf(ctx.body.points, ESTIMATES, "points") ?? 2,
    assigneeId: ctx.body.assigneeId ? activeUser(ctx.body.assigneeId).id : actor.id,
    sprintId,
    status: "To do",
    due: (due as string | null | undefined) ?? null,
    description: str(ctx.body, "description", { max: 2000 }) ?? "",
    checklist: [],
    createdBy: actor.id,
    createdAt: now().toISOString(),
  };
  db.tasks.push(task);
  snapshot(task.sprintId);
  log(actor, project.id, `created ${task.id}`, task.title, task.id);
  saveDb();
  return task;
});

route("GET", "/tasks/:id", (ctx) => {
  requireUser(ctx);
  return findTask(ctx.params.id);
});

route("PATCH", "/tasks/:id", (ctx) => {
  const actor = requirePermission(ctx, "task:edit");
  const task = findTask(ctx.params.id);
  const { body } = ctx;
  const before = { status: task.status, sprintId: task.sprintId };

  const status = oneOf(body.status, STATUSES, "status");
  if (status) task.status = status;
  const priority = oneOf(body.priority, PRIORITIES, "priority");
  if (priority) task.priority = priority;
  const points = oneOf(body.points, ESTIMATES, "points");
  if (points) task.points = points;
  const type = oneOf(body.type, TASK_TYPES, "type");
  if (type) task.type = type;
  const title = str(body, "title", { max: 120 });
  if (title) task.title = title;
  if (body.description !== undefined) task.description = str(body, "description", { max: 2000 }) ?? "";
  if (body.assigneeId !== undefined) task.assigneeId = activeUser(body.assigneeId).id;
  if (body.sprintId !== undefined) {
    if (!can(actor.role, "sprint:manage")) throw new HttpError(403, "Only admins move work between sprints.");
    task.sprintId = openSprint(task.projectId, body.sprintId);
  }
  if (body.due !== undefined) {
    if (body.due !== null && !isIsoDate(body.due)) throw new HttpError(400, "due must be a date.");
    task.due = body.due as string | null;
  }
  if (body.checklist !== undefined) {
    if (!Array.isArray(body.checklist)) throw new HttpError(400, "checklist must be a list.");
    for (const change of body.checklist as { id?: string; label?: string; done?: boolean; remove?: boolean }[]) {
      const item = change.id ? task.checklist.find((c) => c.id === change.id) : undefined;
      if (item && change.remove) task.checklist = task.checklist.filter((c) => c !== item);
      else if (item) item.done = Boolean(change.done);
      else if (!change.id && typeof change.label === "string" && change.label.trim()) {
        task.checklist.push({ id: nextId("c"), label: change.label.trim().slice(0, 160), done: false });
      }
    }
  }
  if (status && status !== before.status) {
    log(actor, task.projectId, `moved ${task.id} to ${status}`, `${task.title} · was ${before.status}`, task.id);
  }
  snapshot(before.sprintId);
  snapshot(task.sprintId);
  saveDb();
  return task;
});

route("POST", "/tasks/move", (ctx) => {
  const actor = requirePermission(ctx, "sprint:manage");
  const db = getDb();
  const ids = ctx.body.ids;
  if (!Array.isArray(ids) || ids.length === 0) throw new HttpError(400, "Choose at least one task.");
  const sprint = findSprint(String(ctx.body.sprintId));
  if (sprint.status === "completed") throw new HttpError(409, "Work can’t be added to a completed sprint.");
  const moved = db.tasks.filter((t) => ids.includes(t.id) && t.projectId === sprint.projectId);
  const from = new Set(moved.map((t) => t.sprintId));
  for (const task of moved) task.sprintId = sprint.id;
  from.forEach((id) => snapshot(id));
  snapshot(sprint.id);
  log(actor, sprint.projectId, `moved ${moved.length} ${moved.length === 1 ? "task" : "tasks"} into ${sprint.name}`, moved.map((t) => t.id).join(", "));
  saveDb();
  return moved;
});

route("GET", "/tasks/:id/comments", (ctx) => {
  requireUser(ctx);
  findTask(ctx.params.id);
  return getDb().comments.filter((c) => c.taskId === ctx.params.id);
});

route("POST", "/tasks/:id/comments", (ctx) => {
  const actor = requirePermission(ctx, "task:comment");
  const task = findTask(ctx.params.id);
  const comment = {
    id: nextId("cm"),
    taskId: task.id,
    authorId: actor.id,
    body: str(ctx.body, "body", { required: true, max: 2000, label: "Comment" })!,
    createdAt: now().toISOString(),
  };
  getDb().comments.push(comment);
  log(actor, task.projectId, `commented on ${task.id}`, task.title, task.id);
  saveDb();
  return comment;
});

route("GET", "/activity", (ctx) => {
  requireUser(ctx);
  const taskId = ctx.query.get("task");
  const limit = Math.min(Number(ctx.query.get("limit")) || 20, 100);
  return getDb()
    .activity.filter((a) => !taskId || a.taskId === taskId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
});

// ---------------------------------------------------------------- dispatch

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (req.method === "GET" || req.method === "HEAD") return {};
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 1_000_000) throw new HttpError(413, "That request is too large.");
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) return {};
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    throw new HttpError(400, "The request body isn’t valid JSON.");
  }
}

export async function handleApi(req: IncomingMessage, res: ServerResponse, path: string) {
  const send = (status: number, payload: unknown) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(payload));
  };
  try {
    const url = new URL(path, "http://localhost");
    const match = routes
      .map((r) => ({ r, m: r.method === req.method ? r.pattern.exec(url.pathname) : null }))
      .find((x) => x.m);
    if (!match) {
      const exists = routes.some((r) => r.pattern.test(url.pathname));
      throw new HttpError(exists ? 405 : 404, exists ? "Method not allowed." : "No such endpoint.");
    }
    const params = Object.fromEntries(match.r.keys.map((k, i) => [k, decodeURIComponent(match.m![i + 1])]));
    const body = await readBody(req);
    const token = readCookie(req.headers.cookie, SESSION_COOKIE);
    const user = userForToken(token);
    const result = await match.r.handler({ req, res, params, query: url.searchParams, body, user, token });
    send(200, result);
  } catch (error) {
    if (error instanceof HttpError) send(error.status, { error: error.message });
    else {
      console.error("[backend]", error);
      send(500, { error: "Something went wrong on the server." });
    }
  }
}
