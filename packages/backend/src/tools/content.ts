import { prisma } from "../lib/prisma.js";
import type { ContentIdea } from "../generated/prisma/client.js";
import type { Platform, ContentFormat } from "../generated/prisma/enums.js";
import type Anthropic from "@anthropic-ai/sdk";
import { memoryService } from "../services/memory.service.js";

export const saveContentIdeaTool: Anthropic.Tool = {
  name: "save_content_idea",
  description:
    "Save a new content idea for the current session. Automatically creates a content plan for the session if one doesn't exist yet. The idea appears instantly in the right panel of the UI — do NOT repeat it in the chat.",
  input_schema: {
    type: "object",
    properties: {
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
      title: {
        type: "string",
        description:
          "Short, specific title for the idea (3–8 words). Names the actual topic/material — not the angle structure. Shown to the user as the idea card title. Examples: \"Why I quit using Notion\", \"14 minutes to first signup\", \"Stop writing daily\".",
      },
      angle: { type: "string", description: "The angle or hook of the content idea" },
      description: { type: "string", description: "Detailed description of the content idea" },
      source_quote: {
        type: "string",
        description:
          "Direct quote from the user — their actual words about this topic, copied as-is. Not a paraphrase. Pass empty string if the user did not say anything quote-worthy on this idea.",
      },
      do_not: {
        type: "array",
        items: { type: "string" },
        description:
          "Short list of things the platform agent should NOT do with this material (e.g. \"don't end with a takeaway\"). Pass empty array when no specific trap applies.",
      },
    },
    required: ["platform", "format", "title", "angle", "description"],
  },
};

export const updateContentIdeaTool: Anthropic.Tool = {
  name: "update_content_idea",
  description:
    "Update an existing content idea's title, angle, description, source quote, or do_not list. Use this when the user asks to refine, adjust, or improve a specific idea. You already know each idea's ID from the save_content_idea tool results.",
  input_schema: {
    type: "object",
    properties: {
      ideaId: { type: "string", description: "The ID of the content idea to update" },
      title: { type: "string", description: "Updated short title (omit to keep unchanged)" },
      angle: { type: "string", description: "Updated one-line angle/hook (omit to keep unchanged)" },
      description: { type: "string", description: "Updated description (omit to keep unchanged)" },
      source_quote: {
        type: "string",
        description: "Updated direct user quote (omit to keep unchanged; pass empty string to clear)",
      },
      do_not: {
        type: "array",
        items: { type: "string" },
        description: "Updated do_not list (omit to keep unchanged; pass empty array to clear)",
      },
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

// ── Strategist context loader ──────────────────────────────────────────────

export async function loadStrategistSessionContext(
  userId: string,
  chatSessionId: string
): Promise<string> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [memoryMap, sessionIdeas, historyIdeas] = await Promise.all([
    memoryService.getMemoryMap(userId),
    prisma.contentIdea.findMany({
      where: { userId, contentPlan: { chatSessionId } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.contentIdea.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
        contentPlan: { chatSessionId: { not: chatSessionId } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const memoryLines =
    memoryMap.length === 0
      ? "(empty — onboarding may be incomplete)"
      : memoryMap
          .map((entry) => `- ${entry.key}: ${entry.title} — ${entry.description}`)
          .join("\n");

  const sessionIdeaLines =
    sessionIdeas.length === 0
      ? "(none yet — you have not saved any ideas in this session)"
      : sessionIdeas
          .map(
            (idea) =>
              `- ideaId=${idea.id} | [${idea.platform}/${idea.format}/${idea.angle}] ${idea.title || idea.description.slice(0, 60)} — status: ${idea.status}`
          )
          .join("\n");

  const historyLines =
    historyIdeas.length === 0
      ? "(no content from the last 30 days)"
      : historyIdeas
          .map(
            (idea) =>
              `- ideaId=${idea.id} | [${idea.platform}/${idea.format}/${idea.angle}] ${idea.title || idea.description.slice(0, 60)} — status: ${idea.status}`
          )
          .join("\n");

  return [
    "## Memory Map",
    memoryLines,
    "",
    "Use the read_memory tool to fetch the full content of any block above when needed.",
    "",
    "## Current Session Ideas",
    "These are the ideas you have already saved in THIS chat session, with their `ideaId`. When the user asks to refine an idea by topic/angle, match it to one of these and call `update_content_idea` with the matching `ideaId` — never ask the user for an ID.",
    sessionIdeaLines,
    "",
    "## Content History (last 30 days, other sessions)",
    historyLines,
  ].join("\n");
}

function normalizeDoNot(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function makeSaveContentIdea(userId: string, chatSessionId: string, onIdeaSaved?: (idea: ContentIdea) => void) {
  return async (input: Record<string, unknown>): Promise<string> => {
    const { platform, format, title, angle, description, source_quote, do_not } = input as {
      platform: string;
      format: string;
      title: string;
      angle: string;
      description: string;
      source_quote?: string;
      do_not?: unknown;
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
        title: typeof title === "string" ? title : "",
        angle,
        description,
        sourceQuote: typeof source_quote === "string" ? source_quote : "",
        doNot: normalizeDoNot(do_not),
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
    const { ideaId, title, angle, description, source_quote, do_not } = input as {
      ideaId: string;
      title?: string;
      angle?: string;
      description?: string;
      source_quote?: string;
      do_not?: unknown;
    };

    const existing = await prisma.contentIdea.findUnique({ where: { id: ideaId } });
    if (!existing) {
      return JSON.stringify({
        success: false,
        error: "idea_not_found",
        message: `No content idea with id "${ideaId}". Look up the correct ideaId in the "Current Session Ideas" section of your system prompt — never invent IDs. If the user's reference is ambiguous, ask them which idea (by topic) before retrying.`,
      });
    }

    onUpdating?.(ideaId);

    const idea = await prisma.contentIdea.update({
      where: { id: ideaId },
      data: {
        ...(title !== undefined && { title }),
        ...(angle !== undefined && { angle }),
        ...(description !== undefined && { description }),
        ...(source_quote !== undefined && { sourceQuote: source_quote }),
        ...(do_not !== undefined && { doNot: normalizeDoNot(do_not) }),
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
  const { contentIdeaId, platform, body, imageSuggestion } = input as {
    contentIdeaId: string;
    platform: string;
    body: string;
    imageSuggestion?: { type: string; brief: string };
  };

  let parsedBody = JSON.parse(body);

  if (platform === "threads") {
    parsedBody = normalizeThreadsBody(parsedBody);
  }

  // Split the platform-specific body into the Post columns: a single text or
  // a thread of `{ text }` entries. mediaItems and scheduling stay default.
  const text = typeof parsedBody.text === "string" ? parsedBody.text : null;
  const threadPosts = Array.isArray(parsedBody.posts) && parsedBody.posts.length > 0
    ? parsedBody.posts.map((entry: unknown) => ({ text: typeof entry === "string" ? entry : "" }))
    : null;

  const idea = await prisma.contentIdea.findUnique({
    where: { id: contentIdeaId },
    select: { userId: true, post: { select: { id: true } } },
  });
  if (!idea) {
    return JSON.stringify({ success: false, message: "Content idea not found." });
  }
  const account = await prisma.threadsAccount.findUnique({
    where: { userId: idea.userId },
    select: { id: true },
  });
  if (!account) {
    return JSON.stringify({ success: false, message: "Threads account not connected." });
  }

  await prisma.contentIdea.update({
    where: { id: contentIdeaId },
    data: { status: "completed" },
  });

  const postFields = {
    text,
    posts: threadPosts ?? undefined,
    ...(imageSuggestion !== undefined ? { imageSuggestion } : {}),
  };

  if (idea.post) {
    await prisma.post.update({ where: { id: idea.post.id }, data: postFields });
  } else {
    await prisma.post.create({
      data: {
        userId: idea.userId,
        threadsAccountId: account.id,
        contentIdeaId,
        ...postFields,
      },
    });
  }

  return JSON.stringify({ success: true, message: "Produced content saved and idea marked as completed." });
}
