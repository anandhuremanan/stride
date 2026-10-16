import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { User } from "../src/shared/types.ts";
import { getDb, saveDb, type StoredUser } from "./db.ts";

export const SESSION_COOKIE = "pms_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  return { salt, passwordHash: scryptSync(password, salt, 32).toString("hex") };
}

export function verifyPassword(user: StoredUser, password: string): boolean {
  const attempt = scryptSync(password, user.salt, 32);
  const stored = Buffer.from(user.passwordHash, "hex");
  return stored.length === attempt.length && timingSafeEqual(stored, attempt);
}

/** The user without credentials: list fields explicitly so a new secret can't leak by default. */
export function publicUser(u: StoredUser): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    focus: u.focus,
    status: u.status,
    mustChangePassword: u.mustChangePassword,
  };
}

export function createSession(userId: string): string {
  const db = getDb();
  const token = randomBytes(24).toString("hex");
  const live = Date.now();
  db.sessions = db.sessions.filter((s) => s.expires > live);
  db.sessions.push({ token, userId, expires: live + SESSION_TTL_MS });
  saveDb();
  return token;
}

/** Sign someone out everywhere, e.g. after a password reset or deactivation. */
export function endSessionsFor(userId: string, keepToken?: string) {
  const db = getDb();
  db.sessions = db.sessions.filter((s) => s.userId !== userId || s.token === keepToken);
  saveDb();
}

/** A readable one-time password for an admin to hand over, e.g. "plum-river-4821". */
export function temporaryPassword(): string {
  const words = ["amber", "cedar", "delta", "ember", "fjord", "harbor", "indigo", "juniper", "lumen", "maple", "nova", "orbit", "plum", "quartz", "river", "sable", "tidal", "willow"];
  const pick = () => words[randomBytes(1)[0] % words.length];
  return `${pick()}-${pick()}-${1000 + (randomBytes(2).readUInt16BE(0) % 9000)}`;
}

export function endSession(token: string) {
  const db = getDb();
  db.sessions = db.sessions.filter((s) => s.token !== token);
  saveDb();
}

export function userForToken(token: string | undefined): StoredUser | null {
  if (!token) return null;
  const db = getDb();
  const session = db.sessions.find((s) => s.token === token && s.expires > Date.now());
  if (!session) return null;
  const user = db.users.find((u) => u.id === session.userId);
  return user && user.status === "active" ? user : null;
}

export function sessionCookie(token: string, maxAgeMs = SESSION_TTL_MS) {
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(maxAgeMs / 1000)}`;
}

export function readCookie(header: string | undefined, name: string): string | undefined {
  return header
    ?.split(";")
    .map((part) => part.trim().split("="))
    .find(([key]) => key === name)?.[1];
}
