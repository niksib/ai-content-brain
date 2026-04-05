import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export const sessionRoutes = new Hono();

// Create or return today's session
sessionRoutes.post("/sessions", requireAuth, async (context) => {
  const user = context.get("user" as never) as AuthUser;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

  const newSession = await prisma.chatSession.create({
    data: {
      userId: user.id,
      type: "daily",
      status: "active",
      sessionDate: today,
    },
  });

  return context.json({ session: newSession }, 201);
});

// List user sessions for calendar
sessionRoutes.get("/sessions", requireAuth, async (context) => {
  const user = context.get("user" as never) as AuthUser;

  const sessions = await prisma.chatSession.findMany({
    where: {
      userId: user.id,
      type: "daily",
    },
    include: {
      contentPlan: {
        include: {
          _count: {
            select: { ideas: true },
          },
        },
      },
    },
    orderBy: { sessionDate: "desc" },
  });

  const result = sessions.map((session) => ({
    id: session.id,
    sessionDate: session.sessionDate,
    status: session.status,
    ideaCount: session.contentPlan?._count?.ideas ?? 0,
  }));

  return context.json({ sessions: result });
});

// Get session detail
sessionRoutes.get("/sessions/:id", requireAuth, async (context) => {
  const user = context.get("user" as never) as AuthUser;
  const sessionId = context.req.param("id");

  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
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

  if (!session || session.userId !== user.id) {
    return context.json({ error: "Session not found" }, 404);
  }

  return context.json({ session });
});
