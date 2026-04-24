import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireCredits } from "../middleware/credits.middleware.js";
import { prisma } from "../lib/prisma.js";
import { agentRunner } from "../services/agent-runner.service.js";
import { createSSEStream } from "../lib/sse.js";
import { ThreadsAgent } from "../agents/threads/threads.agent.js";
import { LinkedInAgent } from "../agents/linkedin/linkedin.agent.js";
import { VideoAgent } from "../agents/video/video.agent.js";
import { InstagramAgent } from "../agents/instagram/instagram.agent.js";
import type { AppEnv } from "../types/hono.js";
import type { ContentIdea } from "../generated/prisma/client.js";
import type { PlatformAgent } from "../agents/base.agent.js";

export const ideaRoutes = new Hono<AppEnv>();

async function resolvePlatformAgent(idea: ContentIdea, userId: string): Promise<PlatformAgent> {
  const { platform } = idea;

  if (platform === "threads") return ThreadsAgent.create(userId, idea);
  if (platform === "linkedin") return LinkedInAgent.create(userId, idea);
  if (platform === "tiktok") return VideoAgent.create(userId, idea);
  if (platform === "instagram") {
    return idea.format === "video_script"
      ? VideoAgent.create(userId, idea)
      : InstagramAgent.create(userId, idea);
  }

  throw new Error(`No agent for platform=${platform}`);
}

// List ideas from session
ideaRoutes.get("/sessions/:id/ideas", requireAuth, async (context) => {
  const user = context.get("user");
  const sessionId = context.req.param("id");

  const chatSession = await prisma.chatSession.findUnique({
    where: { id: sessionId, userId: user.id },
  });

  if (!chatSession) {
    return context.json({ error: "Session not found" }, 404);
  }

  const contentPlan = await prisma.contentPlan.findUnique({
    where: { chatSessionId: chatSession.id },
    include: {
      ideas: {
        orderBy: { createdAt: "asc" },
        include: { producedContent: true },
      },
    },
  });

  if (!contentPlan) {
    return context.json({ ideas: [] });
  }

  return context.json({ ideas: contentPlan.ideas });
});

// Approve idea and start content production
ideaRoutes.patch(
  "/ideas/:id/approve",
  requireAuth,
  requireCredits(2, "content_production"),
  async (context) => {
    const user = context.get("user");
    const reservedCents = (context.get("creditReservation" as never) as number | undefined) ?? 0;
    const ideaId = context.req.param("id");

    const idea = await prisma.contentIdea.findUnique({
      where: { id: ideaId, userId: user.id },
    });

    if (!idea) {
      return context.json({ error: "Idea not found" }, 404);
    }

    await prisma.contentIdea.update({
      where: { id: ideaId },
      data: { status: "producing" },
    });

    const agent = await resolvePlatformAgent(idea, user.id);
    const { send, close, response, isClosed } = createSSEStream(context);

    void agentRunner
      .stream(
        agent,
        [{ role: "user", content: agent.buildProductionPrompt() }],
        { send, close, isClosed },
        undefined,
        { userId: user.id, actionType: "content_production", reference: ideaId, reservedCents }
      )
      .then(async () => {
        await prisma.contentIdea.update({
          where: { id: ideaId },
          data: { status: "completed" },
        });
      })
      .catch(async (error) => {
        console.error("[ideas/approve] Agent stream failed:", error);
        try {
          await prisma.contentIdea.update({
            where: { id: ideaId },
            data: { status: "approved" },
          });
        } catch (dbError) {
          console.error("[ideas/approve] Failed to revert status:", dbError);
        }
      });

    return response;
  }
);

// Reject idea
ideaRoutes.patch("/ideas/:id/reject", requireAuth, async (context) => {
  const user = context.get("user");
  const ideaId = context.req.param("id");

  const idea = await prisma.contentIdea.findUnique({
    where: { id: ideaId, userId: user.id },
  });

  if (!idea) {
    return context.json({ error: "Idea not found" }, 404);
  }

  const updatedIdea = await prisma.contentIdea.update({
    where: { id: ideaId },
    data: { status: "rejected" },
  });

  return context.json({ idea: updatedIdea });
});

// Chat with platform agent in the context of a completed idea
ideaRoutes.post(
  "/ideas/:id/message",
  requireAuth,
  requireCredits(2, "content_plan"),
  async (context) => {
    const user = context.get("user");
    const reservedCents = (context.get("creditReservation" as never) as number | undefined) ?? 0;
    const ideaId = context.req.param("id");
    const body = await context.req.json();
    const { content, aiContext } = body;

    if (!content || typeof content !== "string") {
      return context.json({ error: "content is required" }, 400);
    }

    // aiContext carries extra context for the AI (e.g. user-edited content diff)
    // but we only save the clean display text to the DB.
    const aiMessageContent: string = typeof aiContext === "string" ? aiContext : content;

    const idea = await prisma.contentIdea.findUnique({
      where: { id: ideaId, userId: user.id },
      include: {
        producedContent: true,
        contentPlan: { include: { chatSession: true } },
      },
    });

    if (!idea) return context.json({ error: "Idea not found" }, 404);
    if (!idea.producedContent) return context.json({ error: "Idea has no produced content yet" }, 400);

    const chatSession = idea.contentPlan.chatSession;

    // Save user message linked to this idea
    await prisma.chatMessage.create({
      data: {
        chatSessionId: chatSession.id,
        role: "user",
        content,
        contentIdeaId: ideaId,
      },
    });

    const agent = await resolvePlatformAgent(idea, user.id);

    // Synthetic initial context: production prompt + what was produced
    const syntheticHistory = [
      { role: "user" as const, content: agent.buildProductionPrompt() },
      {
        role: "assistant" as const,
        content: `I've produced and saved the content:\n\n${JSON.stringify(idea.producedContent.body, null, 2)}`,
      },
    ];

    // Real follow-up messages for this idea (includes the just-saved user message)
    const followUpMessages = await prisma.chatMessage.findMany({
      where: { chatSessionId: chatSession.id, contentIdeaId: ideaId },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true },
    });

    // Replace the last message (the one we just saved) with aiMessageContent
    // so the AI receives full context (e.g. user-edited diff), while the DB
    // stores only the clean display text.
    const historyMessages = followUpMessages.slice(0, -1).map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    historyMessages.push({ role: "user" as const, content: aiMessageContent });

    const messageHistory = [...syntheticHistory, ...historyMessages];

    const { send, close, response } = createSSEStream(context);
    const tokenChunks: string[] = [];

    const wrappedSse = {
      send: (event: string, data: unknown) => {
        if (event === "token" && typeof data === "string") tokenChunks.push(data);
        send(event, data);
      },
      close,
    };

    // Called inside the tool executor — before the SSE stream closes — so the
    // idea_updated event is sent while the stream is still open.
    const onContentSaved = async () => {
      const updatedIdea = await prisma.contentIdea.findUnique({
        where: { id: ideaId },
        include: { producedContent: true },
      });
      if (updatedIdea?.producedContent) {
        send("idea_updated", updatedIdea);
      }
    };

    void agentRunner
      .stream(
        agent,
        messageHistory,
        wrappedSse,
        { onContentSaved },
        { userId: user.id, actionType: "agent_call", reference: ideaId, reservedCents }
      )
      .then(async ({ costUsd }) => {
        const assistantContent = tokenChunks.join("");
        if (assistantContent.length > 0) {
          await prisma.chatMessage.create({
            data: {
              chatSessionId: chatSession.id,
              role: "assistant",
              content: assistantContent,
              costUsd,
              contentIdeaId: ideaId,
            },
          });
        }
      })
      .catch((error) => {
        console.error("[ideas/message] Post-stream save failed:", error);
      });

    return response;
  }
);

// Update produced content body (user manual edits)
ideaRoutes.patch("/ideas/:id/content", requireAuth, async (context) => {
  const user = context.get("user");
  const ideaId = context.req.param("id");
  const body = await context.req.json();

  if (!body || typeof body !== "object") {
    return context.json({ error: "body is required" }, 400);
  }

  const idea = await prisma.contentIdea.findUnique({
    where: { id: ideaId, userId: user.id },
    include: { producedContent: true },
  });

  if (!idea) return context.json({ error: "Idea not found" }, 404);
  if (!idea.producedContent) return context.json({ error: "No produced content yet" }, 400);

  const updated = await prisma.producedContent.update({
    where: { id: idea.producedContent.id },
    data: { body },
  });

  return context.json({ content: updated });
});

// Get idea detail with produced content
ideaRoutes.get("/ideas/:id", requireAuth, async (context) => {
  const user = context.get("user");
  const ideaId = context.req.param("id");

  const idea = await prisma.contentIdea.findUnique({
    where: { id: ideaId, userId: user.id },
    include: {
      producedContent: true,
    },
  });

  if (!idea) {
    return context.json({ error: "Idea not found" }, 404);
  }

  return context.json({ idea });
});
