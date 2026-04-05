import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireCredits } from "../middleware/credits.middleware.js";
import { prisma } from "../lib/prisma.js";
import { agentRunner } from "../services/agent-runner.service.js";
import { billingService } from "../services/billing.service.js";
import { createSSEStream } from "../lib/sse.js";
import type { AppEnv } from "../types/hono.js";

export const chatRoutes = new Hono<AppEnv>();

// Send message to strategist agent
chatRoutes.post("/sessions/:id/message", requireAuth, requireCredits(10, "content_plan"), async (context) => {
  const user = context.get("user");
  const sessionId = context.req.param("id");

  const chatSession = await prisma.chatSession.findUnique({
    where: { id: sessionId, userId: user.id },
  });

  if (!chatSession) {
    return context.json({ error: "Session not found" }, 404);
  }

  if (chatSession.type !== "daily") {
    return context.json({ error: "Invalid session type" }, 400);
  }

  const body = await context.req.json();
  const { content } = body;

  if (!content || typeof content !== "string") {
    return context.json({ error: "content is required" }, 400);
  }

  // Save user message
  await prisma.chatMessage.create({
    data: {
      chatSessionId: chatSession.id,
      role: "user",
      content,
    },
  });

  // Stream agent response with token accumulation
  const { send, close, response } = createSSEStream(context);
  const tokenChunks: string[] = [];

  const wrappedSse = {
    send: (event: string, data: unknown) => {
      // Accumulate token text for saving assistant message
      if (event === "token" && typeof data === "string") {
        tokenChunks.push(data);
      }
      send(event, data);
    },
    close,
  };

  agentRunner
    .streamAgentResponse(
      "strategist",
      content,
      chatSession.sdkSessionId || undefined,
      user.id,
      wrappedSse
    )
    .then(async ({ sdkSessionId }) => {
      // Save assistant message with accumulated text
      const assistantContent = tokenChunks.join("");
      if (assistantContent.length > 0) {
        await prisma.chatMessage.create({
          data: {
            chatSessionId: chatSession.id,
            role: "assistant",
            content: assistantContent,
          },
        });
      }

      // Update SDK session ID for resume
      if (sdkSessionId && chatSession.sdkSessionId !== sdkSessionId) {
        await prisma.chatSession.update({
          where: { id: chatSession.id },
          data: { sdkSessionId },
        });
      }

      // Deduct credits after successful processing
      await billingService.deductCredits(user.id, 10, "content_plan", chatSession.id);
    });

  return response;
});

// Get message history
chatRoutes.get("/sessions/:id/messages", requireAuth, async (context) => {
  const user = context.get("user");
  const sessionId = context.req.param("id");

  const chatSession = await prisma.chatSession.findUnique({
    where: { id: sessionId, userId: user.id },
  });

  if (!chatSession) {
    return context.json({ error: "Session not found" }, 404);
  }

  const messages = await prisma.chatMessage.findMany({
    where: { chatSessionId: chatSession.id },
    orderBy: { createdAt: "asc" },
  });

  return context.json({ messages });
});
