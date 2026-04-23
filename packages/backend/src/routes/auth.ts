import { createHmac } from "node:crypto";
import { Hono } from "hono";
import { auth } from "../lib/auth.js";

export const authRoutes = new Hono();

authRoutes.post("/auth/logout", (context) => {
  const incoming = context.req.raw;
  const url = new URL(incoming.url);
  url.pathname = "/api/auth/sign-out";
  return auth.handler(new Request(url.toString(), incoming));
});

// Exchange a Threads handoff token for a real better-auth session cookie.
// Called from the frontend page /auth/threads-finalize so cookies are set in
// the top-level origin's storage partition (localhost) instead of ngrok's.
authRoutes.post("/auth/threads-finalize", async (context) => {
  const body = await context.req.json().catch(() => null) as { token?: string } | null;
  if (!body?.token) {
    return context.json({ error: "token is required" }, 400);
  }

  const threadsUserId = verifyThreadsHandoffToken(body.token);
  if (!threadsUserId) {
    return context.json({ error: "invalid or expired token" }, 401);
  }

  const email = `threads-${threadsUserId}@postrr.local`;
  const password = deriveThreadsLoginPassword(threadsUserId);

  const signInRequest = new Request(new URL(context.req.raw.url).origin + "/api/auth/sign-in/email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: context.req.header("origin") ?? "",
      cookie: context.req.header("cookie") ?? "",
    },
    body: JSON.stringify({ email, password }),
  });

  return auth.handler(signInRequest);
});

authRoutes.on(["POST", "GET"], "/auth/*", (context) => {
  return auth.handler(context.req.raw);
});

function verifyThreadsHandoffToken(token: string): string | null {
  const parts = token.split(":");
  if (parts.length !== 3) return null;
  const [threadsUserId, expiresAtStr, sig] = parts;
  const secret = process.env.BETTER_AUTH_SECRET || process.env.THREADS_APP_SECRET!;
  const expected = createHmac("sha256", secret).update(`${threadsUserId}:${expiresAtStr}`).digest("hex").slice(0, 32);
  if (sig !== expected) return null;
  const expiresAt = parseInt(expiresAtStr, 10);
  if (Number.isNaN(expiresAt) || Date.now() > expiresAt) return null;
  return threadsUserId;
}

function deriveThreadsLoginPassword(threadsUserId: string): string {
  const secret = process.env.BETTER_AUTH_SECRET || process.env.THREADS_APP_SECRET!;
  return createHmac("sha256", secret).update(`threads-login:${threadsUserId}`).digest("hex");
}
