import { randomBytes } from "node:crypto";
import { Hono } from "hono";
import { auth } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { onboardingService } from "../services/onboarding.service.js";
import { grantTrialCredits } from "../services/trial-grant.service.js";

export const devRoutes = new Hono();

const isProduction = process.env.NODE_ENV === "production";

const THREADS_TEST_SCOPES =
  "threads_basic,threads_content_publish,threads_keyword_search,threads_manage_insights,threads_manage_replies,threads_profile_discovery,threads_read_replies";
const THREADS_TEST_TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000;

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

// Dev-only test flow that simulates the "empty Threads account" scenario:
// a fake ThreadsAccount (postsCount=0, dummy access token), a fresh
// OnboardingSession, and — by default — pre-written fallback analysis so
// the user lands directly on the questions step without burning a real
// Threads API call against an invalid token.
//
// Usage:
//   GET /api/dev/threads-test-empty
//     → uses email threads-test-empty@postrr.local, handle test_empty_creator
//   GET /api/dev/threads-test-empty?email=foo@x.io&handle=foo_handle
//   GET /api/dev/threads-test-empty?prefillFallback=false
//     → leaves the session in `connect` step so you can click Analyze in UI
//   GET /api/dev/threads-test-empty?redirect=/dashboard
devRoutes.get("/dev/threads-test-empty", async (context) => {
  if (isProduction) {
    return context.json({ error: "Not Found" }, 404);
  }

  const email = (context.req.query("email") || "threads-test-empty@postrr.local").toLowerCase();
  const handle = context.req.query("handle") || "test_empty_creator";
  const displayName = context.req.query("name") || "Threads Test (Empty)";
  const prefillFallback = context.req.query("prefillFallback") !== "false";
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const redirectPath = context.req.query("redirect") || "/onboarding?test_empty=1";
  const redirectTo = redirectPath.startsWith("http") ? redirectPath : `${frontendUrl}${redirectPath}`;

  const authHeaders = new Headers({
    "content-type": "application/json",
    origin: frontendUrl,
  });

  const password = randomBytes(32).toString("hex");
  const ctx = await auth.$context;

  const existingUser = await prisma.user.findUnique({ where: { email } });

  let userId: string;
  let authResult;

  if (existingUser) {
    const accounts = await ctx.internalAdapter.findAccounts(existingUser.id);
    const credentialAccount = accounts.find(
      (account: { providerId: string; password?: string | null }) =>
        account.providerId === "credential" && account.password,
    );
    if (!credentialAccount) {
      return context.json(
        { error: "Existing user has no credential account; pick a different email" },
        409,
      );
    }
    const passwordHash = await ctx.password.hash(password);
    await ctx.internalAdapter.updateAccount(credentialAccount.id, { password: passwordHash });
    authResult = await auth.api.signInEmail({
      body: { email, password },
      headers: authHeaders,
      returnHeaders: true,
      asResponse: false,
    });
    userId = existingUser.id;
  } else {
    authResult = await auth.api.signUpEmail({
      body: { email, password, name: displayName },
      headers: authHeaders,
      returnHeaders: true,
      asResponse: false,
    });
    userId = authResult.response.user.id;
  }

  await grantTrialCredits(userId);

  await prisma.onboardingSession.deleteMany({ where: { userId } });
  await prisma.threadsAccount.deleteMany({ where: { userId } });

  await prisma.threadsAccount.create({
    data: {
      userId,
      threadsUserId: `test_${randomBytes(8).toString("hex")}`,
      username: handle,
      name: displayName,
      biography: "Empty test account — no posts.",
      profilePictureUrl: null,
      accessToken: `test_token_${randomBytes(16).toString("hex")}`,
      tokenExpiresAt: new Date(Date.now() + THREADS_TEST_TOKEN_TTL_MS),
      scopes: THREADS_TEST_SCOPES,
      isPrivateProfile: false,
      postsCount: 0,
      loginSecret: password,
    },
  });

  await prisma.onboardingSession.create({
    data: { userId, currentStep: "connect" },
  });

  if (prefillFallback) {
    await onboardingService.runAnalysisFallback(userId);
  }

  const responseHeaders = new Headers();
  responseHeaders.set("Location", redirectTo);

  const getSetCookie = (authResult.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const cookies = typeof getSetCookie === "function" ? getSetCookie.call(authResult.headers) : [];
  for (const cookie of cookies) {
    responseHeaders.append("set-cookie", cookie);
  }

  return new Response(null, { status: 302, headers: responseHeaders });
});
