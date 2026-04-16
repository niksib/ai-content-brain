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
        enum: ["text_post", "text_with_image", "image_series", "video_script", "carousel", "stories"],
        description: "Content format",
      },
      angle: { type: "string", description: "The angle or hook of the content idea" },
      description: { type: "string", description: "Detailed description of the content idea" },
    },
    required: ["userId", "chatSessionId", "platform", "format", "angle", "description"],
  },
};

export const updateContentIdeaTool: Anthropic.Tool = {
  name: "update_content_idea",
  description:
    "Update an existing content idea's angle or description. Use this when the user asks to refine, adjust, or improve a specific idea. You already know each idea's ID from the save_content_idea tool results.",
  input_schema: {
    type: "object",
    properties: {
      ideaId: { type: "string", description: "The ID of the content idea to update" },
      angle: { type: "string", description: "Updated one-line angle/hook (omit to keep unchanged)" },
      description: { type: "string", description: "Updated description (omit to keep unchanged)" },
    },
    required: ["ideaId"],
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
      imageSuggestion: {
        type: "object",
        description: "Optional visual recommendation to attach alongside the post. Stored separately from the post body — never put it inside body.",
        properties: {
          type: {
            type: "string",
            enum: ["real_photo", "screenshot", "illustration", "collage"],
            description: "Type of visual",
          },
          brief: { type: "string", description: "Specific, actionable description of what to shoot or create" },
        },
        required: ["type", "brief"],
      },
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

export function makeUpdateContentIdea(
  onUpdating?: (ideaId: string) => void,
  onUpdated?: (idea: ContentIdea) => void
) {
  return async (input: Record<string, unknown>): Promise<string> => {
    const { ideaId, angle, description } = input as {
      ideaId: string;
      angle?: string;
      description?: string;
    };

    onUpdating?.(ideaId);

    const idea = await prisma.contentIdea.update({
      where: { id: ideaId },
      data: {
        ...(angle !== undefined && { angle }),
        ...(description !== undefined && { description }),
      },
    });

    onUpdated?.(idea);

    return JSON.stringify({ success: true, ideaId: idea.id });
  };
}

export function makeSaveProducedContent(onContentSaved?: (contentIdeaId: string) => Promise<void> | void) {
  return async (input: Record<string, unknown>): Promise<string> => {
    const result = await executeSaveProducedContent(input);
    try {
      await onContentSaved?.(input.contentIdeaId as string);
    } catch (err) {
      console.error("[makeSaveProducedContent] onContentSaved callback failed:", err);
    }
    return result;
  };
}

function normalizeThreadsBody(parsedBody: unknown): unknown {
  if (
    typeof parsedBody !== "object" ||
    parsedBody === null ||
    !("posts" in parsedBody)
  ) {
    return parsedBody;
  }

  const posts = (parsedBody as { posts: unknown }).posts;
  if (!Array.isArray(posts)) return parsedBody;

  const validPosts = posts.filter((p): p is string => typeof p === "string");

  // If only one post → no thread needed
  if (validPosts.length <= 1) {
    return { text: validPosts[0] ?? "" };
  }

  // If all posts combined (joined with double newline) fit in 500 chars → merge
  const merged = validPosts.join("\n\n");
  if (merged.length <= 500) {
    return { text: merged };
  }

  return { posts: validPosts };
}

export async function executeSaveProducedContent(input: Record<string, unknown>): Promise<string> {
  const { contentIdeaId, userId, platform, format, body, imageSuggestion } = input as {
    contentIdeaId: string;
    userId: string;
    platform: string;
    format: string;
    body: string;
    imageSuggestion?: { type: string; brief: string };
  };

  let parsedBody = JSON.parse(body);

  if (platform === "threads") {
    parsedBody = normalizeThreadsBody(parsedBody);
  }

  await prisma.$transaction([
    prisma.producedContent.upsert({
      where: { contentIdeaId },
      create: {
        contentIdeaId,
        userId,
        platform: platform as Platform,
        format: format as ContentFormat,
        body: parsedBody,
        ...(imageSuggestion !== undefined && { imageSuggestion }),
      },
      update: {
        platform: platform as Platform,
        format: format as ContentFormat,
        body: parsedBody,
        ...(imageSuggestion !== undefined && { imageSuggestion }),
      },
    }),
    prisma.contentIdea.update({
      where: { id: contentIdeaId },
      data: { status: "completed" },
    }),
  ]);

  return JSON.stringify({ success: true, message: "Produced content saved and idea marked as completed." });
}
