import { Hono } from "hono";
import { auth } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

export const devRoutes = new Hono();

const isProduction = process.env.NODE_ENV === "production";

// Dev-only magic login. Creates a real better-auth session for the chosen user
// and sets the same cookie format as a normal sign-in, then redirects to the
// frontend so the next request is authenticated. Disabled in production.
//
// Usage:
//   GET /api/dev/magic-login                 -> first user by createdAt
//   GET /api/dev/magic-login?email=foo@x.io  -> by email
//   GET /api/dev/magic-login?userId=cuid     -> by id
//   GET /api/dev/magic-login?redirect=/path  -> custom redirect target
devRoutes.get("/dev/magic-login", async (context) => {
  if (isProduction) {
    return context.json({ error: "Not Found" }, 404);
  }

  const email = context.req.query("email");
  const userId = context.req.query("userId");
  const redirectTo =
    context.req.query("redirect") ||
    process.env.FRONTEND_URL ||
    "http://localhost:3000";

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : email
      ? await prisma.user.findUnique({ where: { email } })
      : await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });

  if (!user) {
    return context.json({ error: "User not found" }, 404);
  }

  const ctx = await auth.$context;
  const session = await ctx.internalAdapter.createSession(user.id, false);

  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(ctx.secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(session.token)
  );
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));
  const cookieValue = encodeURIComponent(`${session.token}.${signature}`);

  const cookieName = ctx.authCookies.sessionToken.name;
  const attrs = ctx.authCookies.sessionToken.attributes;
  const sameSite = String(attrs.sameSite ?? "Lax");
  const sameSiteFormatted = sameSite.charAt(0).toUpperCase() + sameSite.slice(1).toLowerCase();

  const cookieHeader = [
    `${cookieName}=${cookieValue}`,
    `Path=${attrs.path ?? "/"}`,
    `Max-Age=${ctx.sessionConfig.expiresIn}`,
    `SameSite=${sameSiteFormatted}`,
    attrs.httpOnly ? "HttpOnly" : null,
    attrs.secure ? "Secure" : null,
    attrs.domain ? `Domain=${attrs.domain}` : null,
  ]
    .filter(Boolean)
    .join("; ");

  context.header("Set-Cookie", cookieHeader);

  return context.redirect(redirectTo);
});
