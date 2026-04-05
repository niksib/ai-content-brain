import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import { agentRunner } from "../services/agent-runner.service.js";
import { createSSEStream } from "../lib/sse.js";

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export const onboardingRoutes = new Hono();

// Check if onboarding is complete
onboardingRoutes.get("/onboarding/status", requireAuth, async (context) => {
  const user = context.get("user" as never) as AuthUser;
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
  });
  return context.json({
    completed: !!profile,
    profile: profile || null,
  });
});

// Start onboarding session
onboardingRoutes.post("/onboarding/start", requireAuth, async (context) => {
  const user = context.get("user" as never) as AuthUser;

  // Check if already onboarded
  const existingProfile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
  });
  if (existingProfile) {
    return context.json({ error: "Already onboarded" }, 400);
  }

  // Create or find onboarding chat session
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let chatSession = await prisma.chatSession.findFirst({
    where: { userId: user.id, type: "onboarding" },
  });

  if (!chatSession) {
    chatSession = await prisma.chatSession.create({
      data: {
        userId: user.id,
        type: "onboarding",
        status: "active",
        sessionDate: today,
      },
    });
  }

  // Stream onboarding agent's first question
  const { send, close, response } = createSSEStream(context);

  // Run agent in background, don't await
  agentRunner
    .streamAgentResponse(
      "onboarding",
      "Start the onboarding interview. Ask the first question.",
      chatSession.sdkSessionId || undefined,
      user.id,
      { send, close }
    )
    .then(async ({ sdkSessionId }) => {
      // Save SDK session ID for resume
      if (sdkSessionId && !chatSession.sdkSessionId) {
        await prisma.chatSession.update({
          where: { id: chatSession.id },
          data: { sdkSessionId },
        });
      }
    });

  return response;
});

// Send message to onboarding agent
onboardingRoutes.post("/onboarding/message", requireAuth, async (context) => {
  const user = context.get("user" as never) as AuthUser;
  const body = await context.req.json();
  const { content } = body;

  if (!content || typeof content !== "string") {
    return context.json({ error: "content is required" }, 400);
  }

  // Find active onboarding session
  const chatSession = await prisma.chatSession.findFirst({
    where: { userId: user.id, type: "onboarding", status: "active" },
  });

  if (!chatSession) {
    return context.json({ error: "No active onboarding session" }, 404);
  }

  // Save user message
  await prisma.chatMessage.create({
    data: {
      chatSessionId: chatSession.id,
      role: "user",
      content,
    },
  });

  // Stream agent response
  const { send, close, response } = createSSEStream(context);

  agentRunner
    .streamAgentResponse(
      "onboarding",
      content,
      chatSession.sdkSessionId || undefined,
      user.id,
      { send, close }
    )
    .then(async ({ sdkSessionId }) => {
      if (sdkSessionId && chatSession.sdkSessionId !== sdkSessionId) {
        await prisma.chatSession.update({
          where: { id: chatSession.id },
          data: { sdkSessionId },
        });
      }
    });

  return response;
});
