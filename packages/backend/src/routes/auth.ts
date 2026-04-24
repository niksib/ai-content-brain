import { Hono } from "hono";
import { auth } from "../lib/auth.js";

export const authRoutes = new Hono();

authRoutes.post("/auth/logout", (context) => {
  const incoming = context.req.raw;
  const url = new URL(incoming.url);
  url.pathname = "/api/auth/sign-out";
  return auth.handler(new Request(url.toString(), incoming));
});

// Explicit allow-list of better-auth GET endpoints. Everything else (sign-out,
// sign-in, sign-up, change-password, delete-user, etc.) must be POST.
// Prevents CSRF logout via <img src="/api/auth/sign-out">.
const AUTH_GET_ALLOWLIST = new Set([
  "/api/auth/get-session",
  "/api/auth/ok",
  "/api/auth/error",
  "/api/auth/list-sessions",
  "/api/auth/list-accounts",
]);

authRoutes.get("/auth/*", (context) => {
  const pathname = new URL(context.req.raw.url).pathname;
  if (!AUTH_GET_ALLOWLIST.has(pathname)) {
    return context.json({ error: "Method Not Allowed" }, 405);
  }
  return auth.handler(context.req.raw);
});

authRoutes.post("/auth/*", (context) => {
  return auth.handler(context.req.raw);
});
