import { createHmac } from "node:crypto";
import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import { threadsApiService } from "../services/threads-api.service.js";
import type { AppEnv } from "../types/hono.js";

function signOAuthState(userId: string): string {
  const secret = process.env.THREADS_APP_SECRET!;
  const sig = createHmac("sha256", secret).update(userId).digest("hex").slice(0, 16);
  return `${userId}:${sig}`;
}

function verifyOAuthState(state: string): string | null {
  const parts = state.split(":");
  if (parts.length !== 2) return null;
  const [userId, sig] = parts;
  const expected = createHmac("sha256", process.env.THREADS_APP_SECRET!).update(userId).digest("hex").slice(0, 16);
  if (sig !== expected) return null;
  return userId;
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
      tokenExpiresAt: true,
      scopes: true,
      isPrivateProfile: true,
      postsCount: true,
    },
  });

  return context.json({ account });
});

// GET /threads/auth — redirect user to Threads OAuth
threadsRoutes.get("/threads/auth", requireAuth, async (context) => {
  const user = context.get("user");
  const authUrl = threadsApiService.buildAuthorizationUrl(signOAuthState(user.id));
  return context.redirect(authUrl);
});

// GET /threads/callback — handle OAuth callback
threadsRoutes.get("/threads/callback", async (context) => {
  const code = context.req.query("code");
  const state = context.req.query("state");
  const error = context.req.query("error");

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  if (error || !code || !state) {
    return context.redirect(`${frontendUrl}/profile?threads_error=access_denied`);
  }

  const verifiedUserId = verifyOAuthState(state);
  if (!verifiedUserId) {
    return context.redirect(`${frontendUrl}/profile?threads_error=invalid_state`);
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
        accessToken: tokenData.accessToken,
        tokenExpiresAt,
        scopes: "threads_basic,threads_content_publish,threads_keyword_search,threads_manage_insights,threads_manage_replies,threads_profile_discovery,threads_read_replies",
      },
      update: {
        threadsUserId: userInfo.id,
        accessToken: tokenData.accessToken,
        tokenExpiresAt,
      },
    });

    return context.redirect(`${frontendUrl}/profile?threads_connected=true`);
  } catch (connectError) {
    console.error("[threads/callback] Failed to connect Threads account:", connectError);
    return context.redirect(`${frontendUrl}/profile?threads_error=connection_failed`);
  }
});

// DELETE /threads/account — disconnect Threads account
threadsRoutes.delete("/threads/account", requireAuth, async (context) => {
  const user = context.get("user");

  await prisma.threadsAccount.deleteMany({
    where: { userId: user.id },
  });

  return context.json({ success: true });
});

// POST /threads/publish — publish a post immediately
threadsRoutes.post("/threads/publish", requireAuth, async (context) => {
  const user = context.get("user");
  const body = await context.req.json() as { text: string; contentIdeaId?: string };

  if (!body.text?.trim() || typeof body.text !== "string") {
    return context.json({ error: "text is required" }, 400);
  }

  if (body.text.length > 500) {
    return context.json({ error: "text must be 500 characters or fewer" }, 400);
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
    const result = await threadsApiService.publishTextPost(
      account.threadsUserId,
      account.accessToken,
      body.text
    );

    await prisma.threadsAccount.update({
      where: { id: account.id },
      data: { postsCount: { increment: 1 } },
    });

    return context.json({ postId: result.postId });
  } catch (publishError) {
    console.error("[threads/publish] Publish failed:", publishError);
    return context.json({ error: "Failed to publish post. Please try again." }, 500);
  }
});

// POST /threads/schedule — schedule a post for later
threadsRoutes.post("/threads/schedule", requireAuth, async (context) => {
  const user = context.get("user");
  const body = await context.req.json() as { text: string; scheduledAt: string; contentIdeaId?: string };

  if (!body.text?.trim() || typeof body.text !== "string") {
    return context.json({ error: "text is required" }, 400);
  }

  if (body.text.length > 500) {
    return context.json({ error: "text must be 500 characters or fewer" }, 400);
  }

  if (!body.scheduledAt) {
    return context.json({ error: "scheduledAt is required" }, 400);
  }

  const scheduledAt = new Date(body.scheduledAt);
  if (isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
    return context.json({ error: "scheduledAt must be a future date" }, 400);
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
      text: body.text,
      scheduledAt,
    },
  });

  return context.json({ scheduledPost });
});

// GET /threads/scheduled — list pending scheduled posts
threadsRoutes.get("/threads/scheduled", requireAuth, async (context) => {
  const user = context.get("user");

  const scheduledPosts = await prisma.scheduledPost.findMany({
    where: { userId: user.id, status: "pending" },
    orderBy: { scheduledAt: "asc" },
  });

  return context.json({ scheduledPosts });
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
    console.error("[threads/insights] Failed to fetch insights:", insightsError);
    return context.json({ error: "Failed to fetch insights. Please try again." }, 500);
  }
});
