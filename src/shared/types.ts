// Domain types shared by the fake backend (server/) and the app (src/).
// Keep this file free of browser and Node APIs: both sides import it.

export type Role = "owner" | "admin" | "member" | "viewer";
export type TaskType = "Story" | "Task" | "Bug";
export type Priority = "High" | "Medium" | "Low";
export type TaskStatus = "To do" | "In progress" | "In review" | "Done";
export type ProjectStatus = "Active" | "Planning";
export type SprintStatus = "completed" | "active" | "planned";

export const ROLES: Role[] = ["owner", "admin", "member", "viewer"];
export const TASK_TYPES: TaskType[] = ["Story", "Task", "Bug"];
export const PRIORITIES: Priority[] = ["High", "Medium", "Low"];
export const STATUSES: TaskStatus[] = ["To do", "In progress", "In review", "Done"];
export const ESTIMATES = [1, 2, 3, 5, 8] as const;

/** A user as the API returns it. Never carries the password hash. */
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  focus: string;
  status: "active" | "deactivated";
  /** Set when an admin created the account or reset its password; cleared once the person picks their own. */
  mustChangePassword: boolean;
}

export interface Workspace {
  name: string;
  timeZone: string;
  weekStart: string;
  /** The backend's "today" as `yyyy-mm-dd`. */
  today: string;
  /** The backend's current time, ISO. Use it, not the browser clock, for "2 hours ago". */
  now: string;
}

export interface Project {
  id: string;
  slug: string;
  key: string;
  name: string;
  description: string;
  status: ProjectStatus;
  ownerId: string;
  milestone: string;
  milestoneDate: string;
  sprintLength: string;
  /** Live tasks plus anything archived from earlier sprints. */
  tasksDone: number;
  tasksTotal: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  type: TaskType;
  priority: Priority;
  points: number;
  assigneeId: string;
  sprintId: string | null;
  status: TaskStatus;
  due: string | null;
  description: string;
  checklist: ChecklistItem[];
  createdBy: string;
  createdAt: string;
}

export interface SprintStats {
  tasks: number;
  points: number;
  doneTasks: number;
  donePoints: number;
  byStatus: Record<TaskStatus, { tasks: number; points: number }>;
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  status: SprintStatus;
  goal: string;
  start: string;
  end: string;
  capacity: number;
  /** Computed from live tasks for active and planned sprints, from the archive for completed ones. */
  stats: SprintStats;
  /** Working days of the sprint as `yyyy-mm-dd`. */
  workingDays: string[];
  /** Working days left after today (active sprints only). */
  daysLeft: number;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  link?: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  projectId: string;
  taskId?: string;
  actorId: string;
  text: string;
  detail: string;
  createdAt: string;
}

export interface BurndownPoint {
  date: string;
  remaining: number;
}

export interface SprintReport {
  sprint: Sprint;
  burndown: BurndownPoint[];
  history: { name: string; delivered: number; committed: number }[];
}

export interface Session {
  user: User;
  workspace: Workspace;
}

export interface ApiError {
  error: string;
}
