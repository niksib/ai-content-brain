import { randomBytes } from "node:crypto";
import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import { threadsApiService, THREADS_BASE_URL } from "../services/threads-api.service.js";
import { auth } from "../lib/auth.js";
import { redactSecrets } from "../lib/redact.js";
import type { AppEnv } from "../types/hono.js";

const LOGIN_STATE_PREFIX = "login";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function issueConnectState(userId: string): Promise<string> {
  const nonce = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS);
  await prisma.oAuthState.create({
    data: { nonce, purpose: "connect", userId, expiresAt },
  });
  return nonce;
}

/**
 * Consume a connect-mode state. Returns bound userId or null on invalid/expired/replay.
 * Delete-on-read guarantees single-use semantics.
 */
async function consumeConnectState(nonce: string): Promise<string | null> {
  try {
    const deleted = await prisma.oAuthState.delete({ where: { nonce } });
    if (deleted.purpose !== "connect") return null;
    if (deleted.expiresAt.getTime() < Date.now()) return null;
    return deleted.userId ?? null;
  } catch {
    return null;
  }
}

async function issueLoginState(): Promise<string> {
  const nonce = `${LOGIN_STATE_PREFIX}_${randomBytes(32).toString("hex")}`;
  const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS);
  await prisma.oAuthState.create({
    data: { nonce, purpose: "login", expiresAt },
  });
  return nonce;
}

async function consumeLoginState(nonce: string): Promise<boolean> {
  try {
    const deleted = await prisma.oAuthState.delete({ where: { nonce } });
    if (deleted.purpose !== "login") return false;
    if (deleted.expiresAt.getTime() < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

function buildThreadsLoginEmail(threadsUserId: string): string {
  return `threads-${threadsUserId}@postrr.local`;
}

// 256 bits of entropy; stored on the user's ThreadsAccount row and used only
// as the opaque password better-auth needs to establish a session. Secret
// rotation (env var changes) does NOT invalidate existing logins.
function generateLoginSecret(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Reject any mediaUrl that doesn't correspond to a MediaFile owned by the
 * caller. Prevents users from pointing Threads at an attacker-controlled
 * server (fingerprinting, tracking, content swap on refresh).
 */
async function assertMediaUrlsOwnedBy(userId: string, urls: string[]): Promise<string | null> {
  const unique = Array.from(new Set(urls.filter((url): url is string => Boolean(url))));
  if (unique.length === 0) return null;

  const found = await prisma.mediaFile.findMany({
    where: { userId, url: { in: unique } },
    select: { url: true },
  });

  const foundSet = new Set(found.map((row) => row.url));
  const unknown = unique.find((url) => !foundSet.has(url));
  return unknown ?? null;
}

export const threadsRoutes = new Hono<AppEnv>();

// GET /threads/account — get connected account info (or null)
threadsRoutes.get("/threads/account", requireAuth, async (context) => {
  const user = context.get("user");

  const account = await prisma.threadsAccount.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      threadsUserId: true,
      username: true,
      profilePictureUrl: true,
      tokenExpiresAt: true,
      scopes: true,
      isPrivateProfile: true,
      postsCount: true,
      styleAnalyzed: true,
    },
  });

  return context.json({ account });
});

// GET /threads/auth — redirect user to Threads OAuth
threadsRoutes.get("/threads/auth", requireAuth, async (context) => {
  const user = context.get("user");
  const state = await issueConnectState(user.id);
  const authUrl = threadsApiService.buildAuthorizationUrl(state);
  return context.redirect(authUrl);
});

// GET /threads/login — start Threads OAuth login flow (no existing session required)
threadsRoutes.get("/threads/login", async (context) => {
  const state = await issueLoginState();
  const authUrl = threadsApiService.buildAuthorizationUrl(state);
  return context.redirect(authUrl);
});

// GET /threads/callback — handle OAuth callback (connect-mode or login-mode)
threadsRoutes.get("/threads/callback", async (context) => {
  const code = context.req.query("code");
  const state = context.req.query("state");
  const error = context.req.query("error");

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const isLoginMode = typeof state === "string" && state.startsWith(`${LOGIN_STATE_PREFIX}_`);

  if (error || !code || !state) {
    const errorPath = isLoginMode ? "/?threads_login_error=access_denied" : "/settings?threads_error=access_denied";
    return context.redirect(`${frontendUrl}${errorPath}`);
  }

  if (isLoginMode) {
    return handleLoginCallback(context, code, state, frontendUrl);
  }

  return handleConnectCallback(context, code, state, frontendUrl);
});

async function handleConnectCallback(
  context: Parameters<Parameters<typeof threadsRoutes.get>[1]>[0],
  code: string,
  state: string,
  frontendUrl: string,
) {
  const verifiedUserId = await consumeConnectState(state);
  if (!verifiedUserId) {
    return context.redirect(`${frontendUrl}/settings?threads_error=invalid_state`);
  }

  try {
    const shortLivedToken = await threadsApiService.exchangeCodeForShortLivedToken(code);
    const tokenData = await threadsApiService.exchangeForLongLivedToken(shortLivedToken);
    const userInfo = await threadsApiService.getUserInfo(tokenData.accessToken);
    const tokenExpiresAt = new Date(Date.now() + tokenData.expiresInSeconds * 1000);

    await prisma.threadsAccount.upsert({
      where: { userId: verifiedUserId },
      create: {
        userId: verifiedUserId,
        threadsUserId: userInfo.id,
        username: userInfo.username,
        name: userInfo.name ?? null,
        biography: userInfo.biography ?? null,
        profilePictureUrl: userInfo.profilePictureUrl ?? null,
        accessToken: tokenData.accessToken,
        tokenExpiresAt,
        scopes: "threads_basic,threads_content_publish,threads_keyword_search,threads_manage_insights,threads_manage_replies,threads_profile_discovery,threads_read_replies",
      },
      update: {
        threadsUserId: userInfo.id,
        username: userInfo.username,
        name: userInfo.name ?? null,
        biography: userInfo.biography ?? null,
        profilePictureUrl: userInfo.profilePictureUrl ?? null,
        accessToken: tokenData.accessToken,
        tokenExpiresAt,
      },
    });

    const onboardingSession = await prisma.onboardingSession.findUnique({
      where: { userId: verifiedUserId },
      select: { completedAt: true },
    });
    const returnPath = onboardingSession?.completedAt ? "/dashboard" : "/onboarding";

    return context.redirect(`${frontendUrl}${returnPath}?threads_connected=true`);
  } catch (connectError) {
    console.error("[threads/callback] Failed to connect Threads account:", redactSecrets(connectError));
    return context.redirect(`${frontendUrl}/settings?threads_error=connection_failed`);
  }
}

async function handleLoginCallback(
  context: Parameters<Parameters<typeof threadsRoutes.get>[1]>[0],
  code: string,
  state: string,
  frontendUrl: string,
) {
  if (!(await consumeLoginState(state))) {
    return context.redirect(`${frontendUrl}/?threads_login_error=invalid_state`);
  }

  try {
    const shortLivedToken = await threadsApiService.exchangeCodeForShortLivedToken(code);
    const tokenData = await threadsApiService.exchangeForLongLivedToken(shortLivedToken);
    const userInfo = await threadsApiService.getUserInfo(tokenData.accessToken);
    const tokenExpiresAt = new Date(Date.now() + tokenData.expiresInSeconds * 1000);

    const email = buildThreadsLoginEmail(userInfo.id);
    const displayName = userInfo.name?.trim() || userInfo.username || "Threads creator";

    const existingUser = await prisma.user.findUnique({ where: { email } });
    const existingThreadsAccount = existingUser
      ? await prisma.threadsAccount.findFirst({ where: { threadsUserId: userInfo.id } })
      : null;

    const authHeaders = new Headers({
      "content-type": "application/json",
      origin: frontendUrl,
    });

    let authResult;
    let loginSecretToPersist: string | null = null;

    if (existingUser) {
      // Returning Threads user. Use the random secret stored on their
      // ThreadsAccount row. If missing (pre-migration accounts), issue a
      // one-time rekey directly via better-auth's internal adapter — the
      // derived-password migration path. New secret is then persisted on
      // the ThreadsAccount row below.
      let password = existingThreadsAccount?.loginSecret ?? null;
      if (!password) {
        password = generateLoginSecret();
        const ctx = await auth.$context;
        const accounts = await ctx.internalAdapter.findAccounts(existingUser.id);
        const credentialAccount = accounts.find(
          (account: { providerId: string; password?: string | null }) =>
            account.providerId === "credential" && account.password
        );
        if (credentialAccount) {
          const passwordHash = await ctx.password.hash(password);
          await ctx.internalAdapter.updateAccount(credentialAccount.id, { password: passwordHash });
        }
        loginSecretToPersist = password;
      }
      authResult = await auth.api.signInEmail({
        body: { email, password },
        headers: authHeaders,
        returnHeaders: true,
        asResponse: false,
      });
    } else {
      // New Threads user — generate a fresh random secret, sign up with it,
      // and persist it below alongside the ThreadsAccount row.
      const password = generateLoginSecret();
      loginSecretToPersist = password;
      authResult = await auth.api.signUpEmail({
        body: { email, password, name: displayName },
        headers: authHeaders,
        returnHeaders: true,
        asResponse: false,
      });
    }

    const userId = authResult.response.user.id;

    await prisma.threadsAccount.upsert({
      where: { userId },
      create: {
        userId,
        threadsUserId: userInfo.id,
        username: userInfo.username,
        name: userInfo.name ?? null,
        biography: userInfo.biography ?? null,
        profilePictureUrl: userInfo.profilePictureUrl ?? null,
        accessToken: tokenData.accessToken,
        tokenExpiresAt,
        scopes: "threads_basic,threads_content_publish,threads_keyword_search,threads_manage_insights,threads_manage_replies,threads_profile_discovery,threads_read_replies",
        loginSecret: loginSecretToPersist,
      },
      update: {
        threadsUserId: userInfo.id,
        username: userInfo.username,
        name: userInfo.name ?? null,
        biography: userInfo.biography ?? null,
        profilePictureUrl: userInfo.profilePictureUrl ?? null,
        accessToken: tokenData.accessToken,
        tokenExpiresAt,
        ...(loginSecretToPersist ? { loginSecret: loginSecretToPersist } : {}),
      },
    });

    const onboardingSession = await prisma.onboardingSession.findUnique({
      where: { userId },
      select: { completedAt: true },
    });
    const returnPath = onboardingSession?.completedAt ? "/dashboard" : "/onboarding";

    const responseHeaders = new Headers();
    responseHeaders.set("Location", `${frontendUrl}${returnPath}?threads_connected=true`);

    const getSetCookie = (authResult.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
    const cookies = typeof getSetCookie === "function" ? getSetCookie.call(authResult.headers) : [];

    for (const cookie of cookies) {
      responseHeaders.append("set-cookie", cookie);
    }

    return new Response(null, { status: 302, headers: responseHeaders });
  } catch (loginError) {
    console.error("[threads/callback] Threads login failed:", redactSecrets(loginError));
    return context.redirect(`${frontendUrl}/?threads_login_error=login_failed`);
  }
}

// DELETE /threads/account — disconnect Threads account
threadsRoutes.delete("/threads/account", requireAuth, async (context) => {
  const user = context.get("user");

  await prisma.threadsAccount.deleteMany({
    where: { userId: user.id },
  });

  return context.json({ success: true });
});

// POST /threads/publish — publish a single post immediately (text-only or with single media)
threadsRoutes.post("/threads/publish", requireAuth, async (context) => {
  const user = context.get("user");
  const body = await context.req.json() as {
    text: string;
    contentIdeaId?: string;
    mediaUrl?: string;
    mediaType?: "IMAGE" | "VIDEO";
    // Carousel: array of { mediaUrl, mediaType }
    carouselItems?: Array<{ mediaUrl: string; mediaType: "IMAGE" | "VIDEO" }>;
  };

  if (!body.text?.trim() || typeof body.text !== "string") {
    return context.json({ error: "text is required" }, 400);
  }

  if (body.text.length > 500) {
    return context.json({ error: "text must be 500 characters or fewer" }, 400);
  }

  const hasMedia = Boolean(body.mediaUrl && body.mediaType);
  const hasCarousel = Array.isArray(body.carouselItems) && body.carouselItems.length >= 2;

  if (hasCarousel && body.carouselItems!.length > 20) {
    return context.json({ error: "Carousel supports 2–20 items" }, 400);
  }

  const publishMediaUrls: string[] = [
    ...(hasMedia ? [body.mediaUrl!] : []),
    ...(hasCarousel ? body.carouselItems!.map((item) => item.mediaUrl) : []),
  ];
  const unknownPublishUrl = await assertMediaUrlsOwnedBy(user.id, publishMediaUrls);
  if (unknownPublishUrl) {
    return context.json({ error: "mediaUrl does not match any uploaded media" }, 400);
  }

  const account = await prisma.threadsAccount.findUnique({
    where: { userId: user.id },
  });

  if (!account) {
    return context.json({ error: "Threads account not connected" }, 400);
  }

  if (account.tokenExpiresAt <= new Date()) {
    return context.json({ error: "Threads token expired. Please reconnect your account in Settings." }, 401);
  }

  try {
    let result: { postId: string };

    if (hasCarousel) {
      result = await threadsApiService.publishCarousel(
        account.threadsUserId,
        account.accessToken,
        body.text,
        body.carouselItems!
      );
    } else if (hasMedia) {
      result = await threadsApiService.publishSingleMediaPost(
        account.threadsUserId,
        account.accessToken,
        body.text,
        body.mediaType!,
        body.mediaUrl!
      );
    } else {
      result = await threadsApiService.publishTextPost(
        account.threadsUserId,
        account.accessToken,
        body.text
      );
    }

    await prisma.threadsAccount.update({
      where: { id: account.id },
      data: { postsCount: { increment: 1 } },
    });

    if (body.contentIdeaId) {
      await prisma.contentIdea.update({
        where: { id: body.contentIdeaId, userId: user.id },
        data: { publishStatus: "posted", threadsPostId: result.postId, publishedAt: new Date() },
      });
    }

    return context.json({ postId: result.postId });
  } catch (publishError) {
    console.error("[threads/publish] Publish failed:", redactSecrets(publishError));
    return context.json({ error: "Failed to publish post. Please try again." }, 500);
  }
});

// POST /threads/publish-thread — publish a multi-post reply chain
threadsRoutes.post("/threads/publish-thread", requireAuth, async (context) => {
  const user = context.get("user");
  const body = await context.req.json() as {
    posts: Array<string | { text: string; mediaType?: "IMAGE" | "VIDEO"; mediaUrl?: string }>;
    contentIdeaId?: string;
  };

  if (!Array.isArray(body.posts) || body.posts.length === 0) {
    return context.json({ error: "posts must be a non-empty array" }, 400);
  }

  const normalized = body.posts.map((entry) =>
    typeof entry === "string" ? { text: entry } : entry
  );

  for (const [postIndex, post] of normalized.entries()) {
    if (typeof post.text !== "string" || !post.text.trim()) {
      return context.json({ error: `post[${postIndex}] is empty` }, 400);
    }
    if (post.text.length > 500) {
      return context.json({ error: `post[${postIndex}] exceeds 500 characters` }, 400);
    }
    if (post.mediaUrl && post.mediaType !== "IMAGE" && post.mediaType !== "VIDEO") {
      return context.json({ error: `post[${postIndex}] has mediaUrl without a valid mediaType` }, 400);
    }
  }

  const threadMediaUrls = normalized
    .map((post) => post.mediaUrl)
    .filter((url): url is string => typeof url === "string");
  const unknownThreadUrl = await assertMediaUrlsOwnedBy(user.id, threadMediaUrls);
  if (unknownThreadUrl) {
    return context.json({ error: "mediaUrl does not match any uploaded media" }, 400);
  }

  const account = await prisma.threadsAccount.findUnique({
    where: { userId: user.id },
  });

  if (!account) {
    return context.json({ error: "Threads account not connected" }, 400);
  }

  if (account.tokenExpiresAt <= new Date()) {
    return context.json({ error: "Threads token expired. Please reconnect your account in Settings." }, 401);
  }

  try {
    const result = await threadsApiService.publishThreadChain(
      account.threadsUserId,
      account.accessToken,
      normalized
    );

    await prisma.threadsAccount.update({
      where: { id: account.id },
      data: { postsCount: { increment: 1 } },
    });

    if (body.contentIdeaId) {
      await prisma.contentIdea.update({
        where: { id: body.contentIdeaId, userId: user.id },
        data: { publishStatus: "posted", threadsPostId: result.postIds[0], publishedAt: new Date() },
      });
    }

    return context.json({ postIds: result.postIds });
  } catch (publishError) {
    console.error("[threads/publish-thread] Thread publish failed:", redactSecrets(publishError));
    return context.json({ error: "Failed to publish thread. Please try again." }, 500);
  }
});

// POST /threads/schedule — schedule a post (single or multi-post thread) for later
threadsRoutes.post("/threads/schedule", requireAuth, async (context) => {
  const user = context.get("user");
  const body = await context.req.json() as {
    text?: string;
    mediaType?: "IMAGE" | "VIDEO";
    mediaUrl?: string;
    posts?: Array<string | { text: string; mediaType?: "IMAGE" | "VIDEO"; mediaUrl?: string }>;
    scheduledAt: string;
    contentIdeaId?: string;
  };

  const isThread = Array.isArray(body.posts) && body.posts.length > 1;

  const normalizedPosts = isThread
    ? body.posts!.map((entry) => (typeof entry === "string" ? { text: entry } : entry))
    : null;

  if (isThread && normalizedPosts) {
    for (const [postIndex, post] of normalizedPosts.entries()) {
      if (typeof post.text !== "string" || !post.text.trim()) {
        return context.json({ error: `post[${postIndex}] is empty` }, 400);
      }
      if (post.text.length > 500) {
        return context.json({ error: `post[${postIndex}] exceeds 500 characters` }, 400);
      }
      if (post.mediaUrl && post.mediaType !== "IMAGE" && post.mediaType !== "VIDEO") {
        return context.json({ error: `post[${postIndex}] has mediaUrl without a valid mediaType` }, 400);
      }
    }
  } else {
    if (!body.text?.trim() || typeof body.text !== "string") {
      return context.json({ error: "text is required" }, 400);
    }
    if (body.text.length > 500) {
      return context.json({ error: "text must be 500 characters or fewer" }, 400);
    }
    if (body.mediaUrl && body.mediaType !== "IMAGE" && body.mediaType !== "VIDEO") {
      return context.json({ error: "mediaUrl requires a valid mediaType" }, 400);
    }
  }

  if (!body.scheduledAt) {
    return context.json({ error: "scheduledAt is required" }, 400);
  }

  const scheduledAt = new Date(body.scheduledAt);
  if (isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
    return context.json({ error: "scheduledAt must be a future date" }, 400);
  }

  const mediaUrls = isThread && normalizedPosts
    ? normalizedPosts.map((post) => post.mediaUrl).filter((url): url is string => typeof url === "string")
    : body.mediaUrl ? [body.mediaUrl] : [];
  const unknownUrl = await assertMediaUrlsOwnedBy(user.id, mediaUrls);
  if (unknownUrl) {
    return context.json({ error: "mediaUrl does not match any uploaded media" }, 400);
  }

  const account = await prisma.threadsAccount.findUnique({
    where: { userId: user.id },
  });

  if (!account) {
    return context.json({ error: "Threads account not connected" }, 400);
  }

  const scheduledPost = await prisma.scheduledPost.create({
    data: {
      userId: user.id,
      threadsAccountId: account.id,
      contentIdeaId: body.contentIdeaId ?? null,
      text: isThread ? (normalizedPosts?.[0]?.text ?? "") : body.text!,
      posts: isThread ? normalizedPosts : undefined,
      mediaType: isThread ? "TEXT" : (body.mediaType ?? "TEXT"),
      mediaUrl: isThread ? null : (body.mediaUrl ?? null),
      scheduledAt,
    },
  });

  if (body.contentIdeaId) {
    await prisma.contentIdea.update({
      where: { id: body.contentIdeaId, userId: user.id },
      data: { publishStatus: "scheduled", scheduledAt },
    });
  }

  return context.json({ scheduledPost });
});

// GET /threads/scheduled — list scheduled posts (default: pending only; ?status=all includes published/failed)
threadsRoutes.get("/threads/scheduled", requireAuth, async (context) => {
  const user = context.get("user");
  const statusFilter = context.req.query("status") === "all" ? undefined : "pending";

  const scheduledPosts = await prisma.scheduledPost.findMany({
    where: {
      userId: user.id,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    orderBy: { scheduledAt: "asc" },
  });

  return context.json({ scheduledPosts });
});

// PATCH /threads/scheduled/:id — update a pending scheduled post
threadsRoutes.patch("/threads/scheduled/:id", requireAuth, async (context) => {
  const user = context.get("user");
  const postId = context.req.param("id");
  const body = await context.req.json() as {
    text?: string;
    mediaType?: "TEXT" | "IMAGE" | "VIDEO";
    mediaUrl?: string | null;
    posts?: Array<string | { text: string; mediaType?: "IMAGE" | "VIDEO"; mediaUrl?: string }>;
    scheduledAt?: string;
  };

  const post = await prisma.scheduledPost.findUnique({
    where: { id: postId, userId: user.id },
  });

  if (!post) {
    return context.json({ error: "Scheduled post not found" }, 404);
  }

  if (post.status !== "pending") {
    return context.json({ error: "Only pending posts can be edited" }, 400);
  }

  const isThread = Array.isArray(body.posts) && body.posts.length > 1;

  const normalizedPosts = isThread
    ? body.posts!.map((entry) => (typeof entry === "string" ? { text: entry } : entry))
    : null;

  if (isThread && normalizedPosts) {
    for (const [postIndex, entry] of normalizedPosts.entries()) {
      if (typeof entry.text !== "string" || !entry.text.trim()) {
        return context.json({ error: `post[${postIndex}] is empty` }, 400);
      }
      if (entry.text.length > 500) {
        return context.json({ error: `post[${postIndex}] exceeds 500 characters` }, 400);
      }
      if (entry.mediaUrl && entry.mediaType !== "IMAGE" && entry.mediaType !== "VIDEO") {
        return context.json({ error: `post[${postIndex}] has mediaUrl without a valid mediaType` }, 400);
      }
    }
  } else if (body.text !== undefined) {
    if (typeof body.text !== "string" || !body.text.trim()) {
      return context.json({ error: "text is required" }, 400);
    }
    if (body.text.length > 500) {
      return context.json({ error: "text must be 500 characters or fewer" }, 400);
    }
    if (body.mediaUrl && body.mediaType !== "IMAGE" && body.mediaType !== "VIDEO") {
      return context.json({ error: "mediaUrl requires a valid mediaType" }, 400);
    }
  }

  const editMediaUrls = isThread && normalizedPosts
    ? normalizedPosts.map((entry) => entry.mediaUrl).filter((url): url is string => typeof url === "string")
    : typeof body.mediaUrl === "string" ? [body.mediaUrl] : [];
  const unknownEditUrl = await assertMediaUrlsOwnedBy(user.id, editMediaUrls);
  if (unknownEditUrl) {
    return context.json({ error: "mediaUrl does not match any uploaded media" }, 400);
  }

  let scheduledAt: Date | undefined;
  if (body.scheduledAt) {
    scheduledAt = new Date(body.scheduledAt);
    if (isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      return context.json({ error: "scheduledAt must be a future date" }, 400);
    }
  }

  const updated = await prisma.scheduledPost.update({
    where: { id: postId },
    data: {
      ...(isThread
        ? { text: normalizedPosts?.[0]?.text ?? post.text, posts: normalizedPosts, mediaType: "TEXT", mediaUrl: null }
        : {
            ...(body.text !== undefined ? { text: body.text } : {}),
            posts: undefined,
            ...(body.mediaType !== undefined ? { mediaType: body.mediaType } : {}),
            ...(body.mediaUrl !== undefined ? { mediaUrl: body.mediaUrl } : {}),
          }),
      ...(scheduledAt ? { scheduledAt } : {}),
    },
  });

  return context.json({ scheduledPost: updated });
});

// DELETE /threads/scheduled/:id — cancel a scheduled post
threadsRoutes.delete("/threads/scheduled/:id", requireAuth, async (context) => {
  const user = context.get("user");
  const postId = context.req.param("id");

  const post = await prisma.scheduledPost.findUnique({
    where: { id: postId, userId: user.id },
  });

  if (!post) {
    return context.json({ error: "Scheduled post not found" }, 404);
  }

  if (post.status !== "pending") {
    return context.json({ error: "Cannot cancel a post that is not pending" }, 400);
  }

  await prisma.scheduledPost.delete({ where: { id: postId } });

  return context.json({ success: true });
});

// GET /threads/insights — get profile stats for last 30 days
threadsRoutes.get("/threads/insights", requireAuth, async (context) => {
  const user = context.get("user");

  const account = await prisma.threadsAccount.findUnique({
    where: { userId: user.id },
  });

  if (!account) {
    return context.json({ error: "Threads account not connected" }, 400);
  }

  if (account.tokenExpiresAt <= new Date()) {
    return context.json({ error: "Threads token expired. Please reconnect your account in Settings." }, 401);
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sinceTimestamp = Math.floor(thirtyDaysAgo.getTime() / 1000);
  const untilTimestamp = Math.floor(now.getTime() / 1000);

  try {
    const insights = await threadsApiService.getProfileInsights(
      account.threadsUserId,
      account.accessToken,
      sinceTimestamp,
      untilTimestamp
    );

    const engagementRate = threadsApiService.calculateEngagementRate(insights);

    return context.json({
      insights: {
        ...insights,
        engagementRate,
        postsCount: account.postsCount,
        period: { since: thirtyDaysAgo.toISOString(), until: now.toISOString() },
      },
    });
  } catch (insightsError) {
    console.error("[threads/insights] Failed to fetch insights:", redactSecrets(insightsError));
    return context.json({ error: "Failed to fetch insights. Please try again." }, 500);
  }
});

// POST /threads/insights/:contentIdeaId/refresh — fetch and store a new insights snapshot
threadsRoutes.post("/threads/insights/:contentIdeaId/refresh", requireAuth, async (context) => {
  const user = context.get("user");
  const contentIdeaId = context.req.param("contentIdeaId");

  const idea = await prisma.contentIdea.findUnique({
    where: { id: contentIdeaId, userId: user.id },
    select: { threadsPostId: true },
  });

  if (!idea?.threadsPostId) {
    return context.json({ error: "No Threads post ID for this idea" }, 400);
  }

  const account = await prisma.threadsAccount.findUnique({
    where: { userId: user.id },
  });

  if (!account) {
    return context.json({ error: "Threads account not connected" }, 400);
  }

  if (account.tokenExpiresAt <= new Date()) {
    return context.json({ error: "Threads token expired. Please reconnect." }, 401);
  }

  try {
    const url = new URL(`${THREADS_BASE_URL}/${idea.threadsPostId}/insights`);
    url.searchParams.set("metric", "views,likes,replies,reposts,quotes,shares");
    url.searchParams.set("access_token", account.accessToken);

    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorBody = redactSecrets(await response.text().catch(() => "(unreadable)"));
      console.error(`[threads/insights/refresh] Threads API ${response.status}:`, errorBody);
      return context.json({ error: "Failed to fetch post insights from Threads", threadsStatus: response.status }, 502);
    }

    const data = await response.json() as { data: Array<{ name: string; values: Array<{ value: number }> }> };
    const metrics: Record<string, number> = {};
    for (const metricEntry of data.data ?? []) {
      metrics[metricEntry.name] = metricEntry.values?.[0]?.value ?? 0;
    }

    const snapshot = await prisma.threadsInsightsSnapshot.create({
      data: {
        contentIdeaId,
        userId: user.id,
        views: metrics.views ?? null,
        likes: metrics.likes ?? null,
        replies: metrics.replies ?? null,
        reposts: metrics.reposts ?? null,
        quotes: metrics.quotes ?? null,
        shares: metrics.shares ?? null,
      },
    });

    return context.json({ snapshot });
  } catch (refreshError) {
    console.error("[threads/insights/refresh] Failed:", redactSecrets(refreshError));
    return context.json({ error: "Failed to refresh insights. Please try again." }, 500);
  }
});

// GET /threads/post-insights/:threadsPostId — get per-post analytics
threadsRoutes.get("/threads/post-insights/:threadsPostId", requireAuth, async (context) => {
  const user = context.get("user");
  const threadsPostId = context.req.param("threadsPostId");

  const account = await prisma.threadsAccount.findUnique({
    where: { userId: user.id },
  });

  if (!account) {
    return context.json({ error: "Threads account not connected" }, 400);
  }

  if (account.tokenExpiresAt <= new Date()) {
    return context.json({ error: "Threads token expired." }, 401);
  }

  try {
    const url = new URL(`${THREADS_BASE_URL}/${threadsPostId}/insights`);
    url.searchParams.set("metric", "views,likes,replies,reposts,quotes,shares");
    url.searchParams.set("access_token", account.accessToken);

    const response = await fetch(url.toString());
    if (!response.ok) {
      return context.json({ error: "Failed to fetch post insights" }, 502);
    }

    const data = await response.json() as { data: Array<{ name: string; values: Array<{ value: number }> }> };
    const metrics: Record<string, number> = {};
    for (const metricEntry of data.data ?? []) {
      metrics[metricEntry.name] = metricEntry.values?.[0]?.value ?? 0;
    }

    return context.json({ metrics });
  } catch (insightsError) {
    console.error("[threads/post-insights] Failed:", redactSecrets(insightsError));
    return context.json({ error: "Failed to fetch post insights" }, 500);
  }
});
