import { prisma } from "../lib/prisma.js";
import type { ContentIdea } from "../generated/prisma/client.js";
import type { Platform, ContentFormat } from "../generated/prisma/enums.js";
import type Anthropic from "@anthropic-ai/sdk";

// ── Tool definitions (Anthropic Messages API format) ────────────────────────

// Combined tool: fetches creator profile + last 30 days of content history in one call.
// Use this at the start of every strategy session — it replaces calling
// get_creator_profile and get_content_history separately.
export const getSessionContextTool: Anthropic.Tool = {
  name: "get_session_context",
  description:
    "Load everything needed to start a strategy session: the creator's profile (niche, platforms, tone, audience) AND their content history for the last 30 days. Always call this first — it replaces calling get_creator_profile and get_content_history separately.",
  input_schema: {
    type: "object",
    properties: {
      userId: { type: "string", description: "The user ID (provided in the system prompt as CURRENT USER ID)" },
    },
    required: ["userId"],
  },
};

export const getContentHistoryTool: Anthropic.Tool = {
  name: "get_content_history",
  description:
    "Get the user's content ideas from the last 30 days. Useful for understanding what content has already been planned or produced.",
  input_schema: {
    type: "object",
    properties: {
      userId: { type: "string", description: "The user ID to fetch content history for" },
    },
    required: ["userId"],
  },
};

export const saveContentIdeaTool: Anthropic.Tool = {
  name: "save_content_idea",
  description:
    "Save a new content idea for the current session. Automatically creates a content plan for the session if one doesn't exist yet. The idea appears instantly in the right panel of the UI — do NOT repeat it in the chat.",
  input_schema: {
    type: "object",
    properties: {
      userId: { type: "string", description: "The user ID" },
      chatSessionId: {
        type: "string",
        description: "The chat session ID (provided in the system prompt as CURRENT SESSION ID)",
      },
      platform: {
        type: "string",
        enum: ["threads", "linkedin", "tiktok", "instagram"],
        description: "Target platform",
      },
      format: {
        type: "string",
        enum: ["text_post", "video_script", "carousel", "stories"],
        description: "Content format",
      },
      angle: { type: "string", description: "The angle or hook of the content idea" },
      description: { type: "string", description: "Detailed description of the content idea" },
    },
    required: ["userId", "chatSessionId", "platform", "format", "angle", "description"],
  },
};

export const saveProducedContentTool: Anthropic.Tool = {
  name: "save_produced_content",
  description:
    "Save the final produced content for a content idea. Use this when a platform-specific agent finishes writing the content.",
  input_schema: {
    type: "object",
    properties: {
      contentIdeaId: { type: "string", description: "The content idea ID this content was produced for" },
      userId: { type: "string", description: "The user ID" },
      platform: {
        type: "string",
        enum: ["threads", "linkedin", "tiktok", "instagram"],
        description: "Target platform",
      },
      format: {
        type: "string",
        enum: ["text_post", "video_script", "carousel", "stories"],
        description: "Content format",
      },
      body: { type: "string", description: "The produced content body as a JSON string" },
    },
    required: ["contentIdeaId", "userId", "platform", "format", "body"],
  },
};

// ── Executors ───────────────────────────────────────────────────────────────

export async function executeGetSessionContext(input: Record<string, unknown>): Promise<string> {
  const userId = input.userId as string;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [profile, ideas] = await Promise.all([
    prisma.creatorProfile.findUnique({ where: { userId } }),
    prisma.contentIdea.findMany({
      where: { userId, createdAt: { gte: thirtyDaysAgo } },
      include: { producedContent: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return JSON.stringify({
    profile: profile ?? { found: false, message: "No creator profile found." },
    contentHistory: ideas,
  });
}

export async function executeGetContentHistory(input: Record<string, unknown>): Promise<string> {
  const userId = input.userId as string;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const ideas = await prisma.contentIdea.findMany({
    where: { userId, createdAt: { gte: thirtyDaysAgo } },
    include: { producedContent: true },
    orderBy: { createdAt: "desc" },
  });

  return JSON.stringify(ideas);
}

export function makeSaveContentIdea(onIdeaSaved?: (idea: ContentIdea) => void) {
  return async (input: Record<string, unknown>): Promise<string> => {
    const { userId, chatSessionId, platform, format, angle, description } = input as {
      userId: string;
      chatSessionId: string;
      platform: string;
      format: string;
      angle: string;
      description: string;
    };

    const contentPlan = await prisma.contentPlan.upsert({
      where: { chatSessionId },
      create: { userId, chatSessionId },
      update: {},
    });

    const idea = await prisma.contentIdea.create({
      data: {
        userId,
        contentPlanId: contentPlan.id,
        platform: platform as Platform,
        format: format as ContentFormat,
        angle,
        description,
      },
    });

    onIdeaSaved?.(idea);

    return JSON.stringify({ success: true, ideaId: idea.id });
  };
}

export async function executeSaveProducedContent(input: Record<string, unknown>): Promise<string> {
  const { contentIdeaId, userId, platform, format, body } = input as {
    contentIdeaId: string;
    userId: string;
    platform: string;
    format: string;
    body: string;
  };

  const parsedBody = JSON.parse(body);

  await prisma.$transaction([
    prisma.producedContent.create({
      data: {
        contentIdeaId,
        userId,
        platform: platform as Platform,
        format: format as ContentFormat,
        body: parsedBody,
      },
    }),
    prisma.contentIdea.update({
      where: { id: contentIdeaId },
      data: { status: "completed" },
    }),
  ]);

  return JSON.stringify({ success: true, message: "Produced content saved and idea marked as completed." });
}
