import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireCredits } from "../middleware/credits.middleware.js";
import { prisma } from "../lib/prisma.js";
import { agentRunner } from "../services/agent-runner.service.js";
import { billingService } from "../services/billing.service.js";
import { createSSEStream } from "../lib/sse.js";
import type { AppEnv } from "../types/hono.js";

interface PlatformAgentMapping {
  agent: string;
  description: string;
}

function resolvePlatformAgent(
  platform: string,
  format: string
): PlatformAgentMapping {
  if (platform === "threads" && format === "text_post") {
    return { agent: "threads", description: "Threads text post" };
  }
  if (platform === "linkedin" && format === "text_post") {
    return { agent: "linkedin", description: "LinkedIn text post" };
  }
  if (platform === "tiktok" && format === "video_script") {
    return { agent: "video", description: "TikTok video script" };
  }
  if (platform === "instagram" && format === "video_script") {
    return { agent: "video", description: "Instagram Reels video script" };
  }
  if (platform === "instagram" && format === "carousel") {
    return { agent: "instagram", description: "Instagram carousel" };
  }
  if (platform === "instagram" && format === "stories") {
    return { agent: "instagram", description: "Instagram stories" };
  }

  // Fallback: use platform name as agent
  return { agent: platform, description: `${platform} ${format}` };
}

export const ideaRoutes = new Hono<AppEnv>();

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
      },
    },
  });

  if (!contentPlan) {
    return context.json({ ideas: [] });
  }

  return context.json({ ideas: contentPlan.ideas });
});

// Approve idea and start content production
ideaRoutes.patch("/ideas/:id/approve", requireAuth, requireCredits(20, "content_production"), async (context) => {
  const user = context.get("user");
  const ideaId = context.req.param("id");

  const idea = await prisma.contentIdea.findUnique({
    where: { id: ideaId, userId: user.id },
  });

  if (!idea) {
    return context.json({ error: "Idea not found" }, 404);
  }

  // Set status to producing — content generation starts immediately
  const updatedIdea = await prisma.contentIdea.update({
    where: { id: ideaId },
    data: { status: "producing" },
  });

  // Determine which platform agent to use
  const { agent, description } = resolvePlatformAgent(
    idea.platform,
    idea.format
  );

  // Build prompt for the platform agent
  const prompt = buildProductionPrompt(ideaId, idea.platform, idea.format, idea.angle, idea.description, description);

  // Stream agent response via SSE
  const { send, close, response } = createSSEStream(context);

  agentRunner
    .streamAgentResponse(agent, [{ role: "user", content: prompt }], user.id, { send, close })
    .then(async () => {
      // After agent finishes, update idea status to completed
      await prisma.contentIdea.update({
        where: { id: ideaId },
        data: { status: "completed" },
      });

      // Deduct credits after successful content production
      await billingService.deductCredits(user.id, 20, "content_production", ideaId);
    })
    .catch(async () => {
      // If agent fails, revert status to approved so user can retry
      await prisma.contentIdea.update({
        where: { id: ideaId },
        data: { status: "approved" },
      });
    });

  return response;
});

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

function buildProductionPrompt(
  ideaId: string,
  platform: string,
  format: string,
  angle: string,
  description: string,
  platformDescription: string,
): string {
  const formatInstructions: Record<string, string> = {
    text_post: `Write a ready-to-post text. When done, call save_produced_content with:
- contentIdeaId: "${ideaId}" (always use this exact value)
- userId: the CURRENT USER ID from your system prompt
- platform: "${platform}"
- format: "${format}"
- body: JSON string containing { "text": "...", "hashtags": ["tag1", "tag2"] }`,
    video_script: `Write a full video script with shooting brief. When done, call save_produced_content with:
- contentIdeaId: "${ideaId}" (always use this exact value)
- userId: the CURRENT USER ID from your system prompt
- platform: "${platform}"
- format: "${format}"
- body: JSON string containing { "script": [{"timestamp": "0:00", "text": "..."}], "shootingBrief": "...", "deliveryNotes": "...", "caption": "...", "hashtags": ["tag1"] }`,
    carousel: `Write carousel slide content. When done, call save_produced_content with:
- contentIdeaId: "${ideaId}" (always use this exact value)
- userId: the CURRENT USER ID from your system prompt
- platform: "${platform}"
- format: "${format}"
- body: JSON string containing { "slides": [{"slideNumber": 1, "text": "...", "designNotes": "..."}], "caption": "...", "hashtags": ["tag1"] }`,
    stories: `Write an Instagram Stories sequence. When done, call save_produced_content with:
- contentIdeaId: "${ideaId}" (always use this exact value)
- userId: the CURRENT USER ID from your system prompt
- platform: "${platform}"
- format: "${format}"
- body: JSON string containing { "stories": [{"storyNumber": 1, "textOverlay": "...", "background": "...", "interactiveElement": "..."}], "notes": "..." }`,
  };

  const instructions =
    formatInstructions[format] ?? `Produce the content, then call save_produced_content with contentIdeaId: "${ideaId}", userId from system prompt, platform: "${platform}", format: "${format}", and body as a JSON string.`;

  return `Produce a ${platformDescription} based on this approved content idea.

**Angle:** ${angle}

**Description:** ${description}

${instructions}

Use the tone-of-voice-matching and anti-ai-writing skills. Make the content sound like the creator, not like AI. Apply hook-formulas for the opening and cta-patterns for the call-to-action.`;
}
