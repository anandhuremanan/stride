// Mounts the backend on the Vite dev and preview servers at /api, so
// `npm run dev` serves the app and its API from one origin.

import type { Connect, Plugin } from "vite";
import { handleApi } from "./api.ts";
import { createSession, sessionCookie } from "./auth.ts";
import { getDb } from "./db.ts";

/**
 * Test-only, and off unless the server starts with PMS_DEV_AUTOLOGIN=1:
 * GET /api/dev/login-as?email=…&next=/path signs in without a password and
 * redirects, so a headless browser can screenshot pages as each role.
 */
function devAutoLogin(url: URL, res: Parameters<Connect.NextHandleFunction>[1]): boolean {
  if (process.env.PMS_DEV_AUTOLOGIN !== "1" || url.pathname !== "/api/dev/login-as") return false;
  const user = getDb().users.find((u) => u.email === url.searchParams.get("email") && u.status === "active");
  const next = url.searchParams.get("next") ?? "/";
  res.statusCode = user ? 302 : 404;
  if (user) {
    res.setHeader("Set-Cookie", sessionCookie(createSession(user.id)));
    res.setHeader("Location", next.startsWith("/") && !next.startsWith("//") ? next : "/");
  }
  res.end();
  return true;
}

const middleware: Connect.NextHandleFunction = (req, res, next) => {
  if (!req.url?.startsWith("/api/")) return next();
  if (devAutoLogin(new URL(req.url, "http://localhost"), res)) return;
  void handleApi(req, res, req.url.slice("/api".length));
};

export function fakeBackend(): Plugin {
  return {
    name: "pms-fake-backend",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
