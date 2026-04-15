import { createHmac } from "node:crypto";
import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import { threadsApiService, THREADS_BASE_URL } from "../services/threads-api.service.js";
import { analyzeWritingStyleFromThreads } from "../services/style-analysis.service.js";
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
        username: userInfo.username,
        profilePictureUrl: userInfo.profilePictureUrl ?? null,
        accessToken: tokenData.accessToken,
        tokenExpiresAt,
        scopes: "threads_basic,threads_content_publish,threads_keyword_search,threads_manage_insights,threads_manage_replies,threads_profile_discovery,threads_read_replies",
      },
      update: {
        threadsUserId: userInfo.id,
        username: userInfo.username,
        profilePictureUrl: userInfo.profilePictureUrl ?? null,
        accessToken: tokenData.accessToken,
        tokenExpiresAt,
      },
    });

    // Fire-and-forget: analyze writing style from the user's recent posts
    analyzeWritingStyleFromThreads(verifiedUserId).catch((analysisError) => {
      console.error("[threads/callback] Style analysis failed:", analysisError);
    });

    return context.redirect(`${frontendUrl}/dashboard?threads_connected=true`);
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

    if (body.contentIdeaId) {
      await prisma.contentIdea.update({
        where: { id: body.contentIdeaId, userId: user.id },
        data: { publishStatus: "posted", threadsPostId: result.postId },
      });
    }

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

  if (body.contentIdeaId) {
    await prisma.contentIdea.update({
      where: { id: body.contentIdeaId, userId: user.id },
      data: { publishStatus: "scheduled", scheduledAt },
    });
  }

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
      const errorBody = await response.text().catch(() => "(unreadable)");
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
    console.error("[threads/insights/refresh] Failed:", refreshError);
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
    console.error("[threads/post-insights] Failed:", insightsError);
    return context.json({ error: "Failed to fetch post insights" }, 500);
  }
});
