import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import { maybeAttachCostsForAdmin } from "../services/idea-cost.service.js";
import type { AppEnv } from "../types/hono.js";

export const sessionRoutes = new Hono<AppEnv>();

// Create or return today's session
sessionRoutes.post("/sessions", requireAuth, async (context) => {
  const user = context.get("user");

  // Store sessionDate as UTC midnight so the @@unique([userId, sessionDate])
  // constraint is consistent regardless of what timezone the server runs in.
  // Clients that care about local-midnight grouping should handle timezone
  // conversion on their side (frontend calendar already does).
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  // Try to find existing daily session for today
  const existingSession = await prisma.chatSession.findFirst({
    where: {
      userId: user.id,
      sessionDate: today,
      type: "daily",
    },
  });

  if (existingSession) {
    return context.json({ session: existingSession });
  }

  try {
    const newSession = await prisma.chatSession.create({
      data: {
        userId: user.id,
        type: "daily",
        status: "active",
        sessionDate: today,
      },
    });
    return context.json({ session: newSession }, 201);
  } catch (error) {
    // Unique constraint race: another concurrent request created today's
    // session between our findFirst and create. Re-fetch and return it.
    if ((error as { code?: string }).code === "P2002") {
      const session = await prisma.chatSession.findFirst({
        where: { userId: user.id, sessionDate: today, type: "daily" },
      });
      if (session) return context.json({ session });
    }
    throw error;
  }
});

// List user sessions for calendar
sessionRoutes.get("/sessions", requireAuth, async (context) => {
  const user = context.get("user");

  const sessions = await prisma.chatSession.findMany({
    where: {
      userId: user.id,
      type: "daily",
    },
    include: {
      _count: {
        select: { messages: true },
      },
      contentPlan: {
        include: {
          _count: {
            select: { ideas: true },
          },
          ideas: {
            select: { publishStatus: true },
          },
        },
      },
    },
    orderBy: { sessionDate: "desc" },
  });

  const result = sessions.map((session) => {
    const ideas = session.contentPlan?.ideas ?? [];
    return {
      id: session.id,
      sessionDate: session.sessionDate,
      status: session.status,
      messageCount: session._count.messages,
      ideaCount: session.contentPlan?._count?.ideas ?? 0,
      postedCount: ideas.filter((i) => i.publishStatus === "posted").length,
      scheduledCount: ideas.filter((i) => i.publishStatus === "scheduled").length,
    };
  });

  return context.json({ sessions: result });
});

// Delete session (admin only)
sessionRoutes.delete("/sessions/:id", requireAuth, async (context) => {
  const user = context.get("user");
  const sessionId = context.req.param("id");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isAdmin: true },
  });

  if (!dbUser?.isAdmin) {
    return context.json({ error: "Forbidden" }, 403);
  }

  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId, userId: user.id },
  });

  if (!session) {
    return context.json({ error: "Session not found" }, 404);
  }

  await prisma.chatMessage.deleteMany({ where: { chatSessionId: sessionId } });

  const plan = await prisma.contentPlan.findUnique({ where: { chatSessionId: sessionId } });
  if (plan) {
    const ideas = await prisma.contentIdea.findMany({
      where: { contentPlanId: plan.id },
      select: { id: true },
    });
    const ideaIds = ideas.map((idea) => idea.id);

    await prisma.producedContent.deleteMany({ where: { contentIdeaId: { in: ideaIds } } });
    await prisma.threadsInsightsSnapshot.deleteMany({ where: { contentIdeaId: { in: ideaIds } } });
    await prisma.contentIdea.deleteMany({ where: { contentPlanId: plan.id } });
    await prisma.contentPlan.delete({ where: { id: plan.id } });
  }

  await prisma.chatSession.delete({ where: { id: sessionId } });

  return context.json({ success: true });
});

// Get session detail
sessionRoutes.get("/sessions/:id", requireAuth, async (context) => {
  const user = context.get("user");
  const sessionId = context.req.param("id");

  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId, userId: user.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
      contentPlan: {
        include: {
          ideas: {
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!session) {
    return context.json({ error: "Session not found" }, 404);
  }

  if (session.contentPlan?.ideas?.length) {
    session.contentPlan.ideas = await maybeAttachCostsForAdmin(
      user.id,
      session.contentPlan.ideas,
    );
  }

  return context.json({ session });
});
