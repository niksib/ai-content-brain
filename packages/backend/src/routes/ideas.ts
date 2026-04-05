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

// Approve idea and start content production
ideaRoutes.patch("/ideas/:id/approve", requireAuth, async (context) => {
  const user = context.get("user" as never) as AuthUser;
  const ideaId = context.req.param("id");

  const idea = await prisma.contentIdea.findUnique({
    where: { id: ideaId },
  });

  if (!idea || idea.userId !== user.id) {
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
  const prompt = buildProductionPrompt(idea.angle, idea.description, description, idea.format);

  // Stream agent response via SSE
  const { send, close, response } = createSSEStream(context);

  agentRunner
    .streamAgentResponse(agent, prompt, undefined, user.id, { send, close })
    .then(async () => {
      // After agent finishes, update idea status to completed
      await prisma.contentIdea.update({
        where: { id: ideaId },
        data: { status: "completed" },
      });
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

function buildProductionPrompt(
  angle: string,
  description: string,
  platformDescription: string,
  format: string
): string {
  const formatInstructions: Record<string, string> = {
    text_post: `Write a ready-to-post text. Return the result by calling save_produced_content with a JSON body containing:
- "text": the full post text
- "hashtags": array of hashtag strings (without #)`,
    video_script: `Write a full video script with shooting brief. Return the result by calling save_produced_content with a JSON body containing:
- "script": array of objects with "timestamp" and "text" fields
- "shootingBrief": string with camera and setup directions
- "deliveryNotes": string with energy, pace, and style guidance
- "caption": the video caption text
- "hashtags": array of hashtag strings (without #)`,
    carousel: `Write carousel slide content. Return the result by calling save_produced_content with a JSON body containing:
- "slides": array of objects with "slideNumber", "text", and "designNotes" fields
- "caption": the post caption
- "hashtags": array of hashtag strings (without #)`,
    stories: `Write an Instagram Stories sequence. Return the result by calling save_produced_content with a JSON body containing:
- "stories": array of objects with "storyNumber", "textOverlay", "background", and optional "interactiveElement" fields
- "notes": any delivery or timing suggestions`,
  };

  const instructions =
    formatInstructions[format] ?? "Produce the content in the most appropriate format for this platform.";

  return `Produce a ${platformDescription} based on this approved content idea.

**Angle:** ${angle}

**Description:** ${description}

**Format:** ${format}

${instructions}

Use the tone-of-voice-matching and anti-ai-writing skills. Make the content sound like the creator, not like AI. Apply hook-formulas for the opening and cta-patterns for the call-to-action.`;
}
