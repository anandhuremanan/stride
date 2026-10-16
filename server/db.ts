// The backend's storage: one JSON file, loaded once and written after every
// change. A fresh install has no file; it is created empty, and the first
// person to open the app sets up the workspace.
//
// Start over by stopping the server and deleting server/.data/db.json.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Activity, BurndownPoint, Comment, Project, Sprint, Task, User, Workspace } from "../src/shared/types.ts";

export interface StoredUser extends User {
  passwordHash: string;
  salt: string;
}

export type StoredProject = Omit<Project, "tasksDone" | "tasksTotal">;

export type StoredSprint = Omit<Sprint, "stats" | "workingDays" | "daysLeft"> & {
  /** Frozen when the sprint completes, so later task edits don't rewrite history. */
  archive?: { committed: number; delivered: number; tasksDone: number; tasksTotal: number };
  /** Remaining points at the end of each day the sprint changed; today's value is computed live. */
  burndown: BurndownPoint[];
};

export interface StoredSession {
  token: string;
  userId: string;
  expires: number;
}

export interface Db {
  version: number;
  /** Null until the first account sets up the workspace. */
  workspace: Omit<Workspace, "today" | "now"> | null;
  users: StoredUser[];
  projects: StoredProject[];
  sprints: StoredSprint[];
  tasks: Task[];
  comments: Comment[];
  activity: Activity[];
  sessions: StoredSession[];
}

/** Bump when the stored shape changes; an older file is set aside, not misread. */
export const DB_VERSION = 3;

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), ".data");
const DATA_FILE = join(DATA_DIR, "db.json");

function createEmpty(): Db {
  return {
    version: DB_VERSION,
    workspace: null,
    users: [],
    projects: [],
    sprints: [],
    tasks: [],
    comments: [],
    activity: [],
    sessions: [],
  };
}

let db: Db | null = null;

export function getDb(): Db {
  // Deleting the data file while the server runs means "start over", not "restore what's in memory".
  if (db && !existsSync(DATA_FILE)) db = null;
  if (db) return db;
  if (existsSync(DATA_FILE)) {
    const raw = readFileSync(DATA_FILE, "utf8");
    try {
      const loaded = JSON.parse(raw) as Db;
      if (loaded.version === DB_VERSION) return (db = loaded);
    } catch {
      // Unreadable: fall through and keep a copy below.
    }
    // Never silently drop someone's data: keep the old file next to the new one.
    writeFileSync(join(DATA_DIR, `db.${Date.now()}.bak.json`), raw);
  }
  db = createEmpty();
  saveDb();
  return db;
}

export function saveDb() {
  if (!db) return;
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}
