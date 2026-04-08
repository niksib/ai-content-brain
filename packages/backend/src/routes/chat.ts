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

  // Load full conversation history to pass as context to the agent
  const messageHistory = await prisma.chatMessage.findMany({
    where: { chatSessionId: chatSession.id },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
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
    .streamAgentResponse("strategist", messageHistory, user.id, wrappedSse, chatSession.id)
    .then(async ({ costUsd }) => {
      // Save assistant message with accumulated text and cost
      const assistantContent = tokenChunks.join("");
      if (assistantContent.length > 0) {
        await prisma.chatMessage.create({
          data: {
            chatSessionId: chatSession.id,
            role: "assistant",
            content: assistantContent,
            costUsd,
          },
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
