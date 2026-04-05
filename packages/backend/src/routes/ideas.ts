import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export const ideaRoutes = new Hono();

// List ideas from session
ideaRoutes.get("/sessions/:id/ideas", requireAuth, async (context) => {
  const user = context.get("user" as never) as AuthUser;
  const sessionId = context.req.param("id");

  const chatSession = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  });

  if (!chatSession || chatSession.userId !== user.id) {
    return context.json({ error: "Session not found" }, 404);
  }

  const contentPlan = await prisma.contentPlan.findUnique({
    where: { chatSessionId: chatSession.id },
    include: {
      ideas: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!contentPlan) {
    return context.json({ ideas: [] });
  }

  return context.json({ ideas: contentPlan.ideas });
});

// Approve idea
ideaRoutes.patch("/ideas/:id/approve", requireAuth, async (context) => {
  const user = context.get("user" as never) as AuthUser;
  const ideaId = context.req.param("id");

  const idea = await prisma.contentIdea.findUnique({
    where: { id: ideaId },
  });

  if (!idea || idea.userId !== user.id) {
    return context.json({ error: "Idea not found" }, 404);
  }

  const updatedIdea = await prisma.contentIdea.update({
    where: { id: ideaId },
    data: { status: "approved" },
  });

  return context.json({ idea: updatedIdea });
});

// Reject idea
ideaRoutes.patch("/ideas/:id/reject", requireAuth, async (context) => {
  const user = context.get("user" as never) as AuthUser;
  const ideaId = context.req.param("id");

  const idea = await prisma.contentIdea.findUnique({
    where: { id: ideaId },
  });

  if (!idea || idea.userId !== user.id) {
    return context.json({ error: "Idea not found" }, 404);
  }

  const updatedIdea = await prisma.contentIdea.update({
    where: { id: ideaId },
    data: { status: "rejected" },
  });

  return context.json({ idea: updatedIdea });
});

// Get idea detail with produced content
ideaRoutes.get("/ideas/:id", requireAuth, async (context) => {
  const user = context.get("user" as never) as AuthUser;
  const ideaId = context.req.param("id");

  const idea = await prisma.contentIdea.findUnique({
    where: { id: ideaId },
    include: {
      producedContent: true,
    },
  });

  if (!idea || idea.userId !== user.id) {
    return context.json({ error: "Idea not found" }, 404);
  }

  return context.json({ idea });
});
