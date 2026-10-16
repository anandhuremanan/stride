// Typed reads and writes for every endpoint the app uses. Mutations invalidate
// the cache keys they affect, so every screen showing that data refreshes.

import type {
  Activity,
  Comment,
  Project,
  Role,
  Session,
  Sprint,
  SprintReport,
  Task,
  User,
  Workspace,
} from "../shared/types";
import { invalidate, prime, useQuery } from "./cache";
import { api } from "./client";

// ---------------------------------------------------------------- reads

export const useUsers = () => useQuery("users", () => api<User[]>("/users"));
export const useProjects = () => useQuery("projects", () => api<Project[]>("/projects"));
export const useMyTasks = () => useQuery("tasks:mine", () => api<Task[]>("/me/tasks"));

export const useAllSprints = () => useQuery("sprints:all", () => api<Sprint[]>("/sprints"));

export const useProject = (slug: string | undefined) =>
  useQuery(slug ? `projects:${slug}` : null, () => api<Project>(`/projects/${slug}`));

export const useSprints = (slug: string | undefined) =>
  useQuery(slug ? `sprints:${slug}` : null, () => api<Sprint[]>(`/projects/${slug}/sprints`));

export const useProjectTasks = (slug: string | undefined) =>
  useQuery(slug ? `tasks:project:${slug}` : null, () => api<Task[]>(`/projects/${slug}/tasks`));

export const useTask = (id: string | undefined) =>
  useQuery(id ? `tasks:one:${id}` : null, () => api<Task>(`/tasks/${id}`));

export const useComments = (taskId: string | undefined) =>
  useQuery(taskId ? `comments:${taskId}` : null, () => api<Comment[]>(`/tasks/${taskId}/comments`));

export const useActivity = (opts: { task?: string; limit?: number } = {}) => {
  const qs = new URLSearchParams();
  if (opts.task) qs.set("task", opts.task);
  if (opts.limit) qs.set("limit", String(opts.limit));
  return useQuery(`activity:${qs}`, () => api<Activity[]>(`/activity?${qs}`));
};

export const useReport = (slug: string | undefined, sprintId: string | null) =>
  useQuery(slug ? `report:${slug}:${sprintId ?? "current"}` : null, () =>
    api<SprintReport>(`/projects/${slug}/report${sprintId ? `?sprint=${sprintId}` : ""}`),
  );

// ---------------------------------------------------------------- writes

/** Anything that changes task data can move counts on every screen. */
const TASK_KEYS = ["tasks:", "sprints:", "report:", "projects", "activity:"];

type ChecklistChange = { id: string; done: boolean } | { id: string; remove: true } | { label: string };

export async function updateTask(id: string, patch: Partial<Omit<Task, "checklist">> | { checklist: ChecklistChange[] }) {
  const task = await api<Task>(`/tasks/${id}`, { method: "PATCH", body: patch });
  invalidate(...TASK_KEYS);
  return task;
}

export async function createTask(slug: string, input: Partial<Task>) {
  const task = await api<Task>(`/projects/${slug}/tasks`, { method: "POST", body: input });
  invalidate(...TASK_KEYS);
  return task;
}

export async function moveTasks(ids: string[], sprintId: string) {
  const moved = await api<Task[]>("/tasks/move", { method: "POST", body: { ids, sprintId } });
  invalidate(...TASK_KEYS);
  return moved;
}

export async function addComment(taskId: string, body: string) {
  const comment = await api<Comment>(`/tasks/${taskId}/comments`, { method: "POST", body: { body } });
  invalidate(`comments:${taskId}`, "activity:");
  return comment;
}

export async function createSprint(slug: string) {
  const sprint = await api<Sprint>(`/projects/${slug}/sprints`, { method: "POST" });
  invalidate("sprints:", "activity:");
  return sprint;
}

export async function updateSprint(id: string, patch: Partial<Pick<Sprint, "goal" | "start" | "end" | "capacity">>) {
  const sprint = await api<Sprint>(`/sprints/${id}`, { method: "PATCH", body: patch });
  invalidate("sprints:", "report:", "activity:");
  return sprint;
}

export async function createProject(input: {
  name: string;
  key: string;
  description?: string;
  ownerId?: string;
  milestone?: string;
  milestoneDate?: string;
}) {
  const project = await api<Project>("/projects", { method: "POST", body: input });
  invalidate("projects", "activity:");
  return project;
}

export async function updateProject(slug: string, patch: Partial<Project>) {
  const project = await api<Project>(`/projects/${slug}`, { method: "PATCH", body: patch });
  invalidate("projects");
  return project;
}

export async function updateWorkspace(patch: Partial<Workspace>) {
  const workspace = await api<Workspace>("/workspace", { method: "PATCH", body: patch });
  invalidate("session");
  return workspace;
}

export interface NewAccount {
  user: User;
  /** Shown once to the admin, who hands it over. The person must change it at first sign-in. */
  temporaryPassword: string;
}

export async function addMember(input: { name: string; email: string; role: Role; focus?: string }) {
  const created = await api<NewAccount>("/users", { method: "POST", body: input });
  invalidate("users");
  return created;
}

export async function resetPassword(userId: string) {
  const reset = await api<NewAccount>(`/users/${userId}/reset-password`, { method: "POST" });
  invalidate("users");
  return reset;
}

export async function changeRole(userId: string, role: Role) {
  const user = await api<User>(`/users/${userId}`, { method: "PATCH", body: { role } });
  invalidate("users");
  return user;
}

export async function setMemberStatus(userId: string, status: User["status"]) {
  const user = await api<User>(`/users/${userId}`, { method: "PATCH", body: { status } });
  invalidate("users");
  return user;
}

export async function startSprint(id: string) {
  const sprint = await api<Sprint>(`/sprints/${id}/start`, { method: "POST" });
  invalidate(...TASK_KEYS);
  return sprint;
}

export async function completeSprint(id: string) {
  const sprint = await api<Sprint>(`/sprints/${id}/complete`, { method: "POST" });
  invalidate(...TASK_KEYS);
  return sprint;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await api<Session>("/auth/password", { method: "POST", body: { currentPassword, newPassword } });
  prime("session", session);
  return session;
}

export const fetchSession = () => api<Session>("/auth/session");
