import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const getContentHistory = tool(
  "get_content_history",
  "Get the user's content ideas from the last 30 days. Useful for understanding what content has already been planned or produced.",
  {
    userId: z.string().describe("The user ID to fetch content history for"),
  },
  async ({ userId }) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const ideas = await prisma.contentIdea.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        producedContent: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(ideas),
        },
      ],
    };
  }
);

export const saveContentIdea = tool(
  "save_content_idea",
  "Save a new content idea to the user's content plan. Use this when the strategist agent proposes a content idea.",
  {
    userId: z.string().describe("The user ID"),
    contentPlanId: z.string().describe("The content plan ID to associate the idea with"),
    platform: z.enum(["threads", "linkedin", "tiktok", "instagram"]).describe("Target platform"),
    format: z.enum(["text_post", "video_script", "carousel", "stories"]).describe("Content format"),
    angle: z.string().describe("The angle or hook of the content idea"),
    description: z.string().describe("Detailed description of the content idea"),
  },
  async (input) => {
    const idea = await prisma.contentIdea.create({
      data: {
        userId: input.userId,
        contentPlanId: input.contentPlanId,
        platform: input.platform,
        format: input.format,
        angle: input.angle,
        description: input.description,
      },
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(idea),
        },
      ],
    };
  }
);

export const saveProducedContent = tool(
  "save_produced_content",
  "Save the final produced content for a content idea. Use this when a platform-specific agent finishes writing the content.",
  {
    contentIdeaId: z.string().describe("The content idea ID this content was produced for"),
    userId: z.string().describe("The user ID"),
    platform: z.enum(["threads", "linkedin", "tiktok", "instagram"]).describe("Target platform"),
    format: z.enum(["text_post", "video_script", "carousel", "stories"]).describe("Content format"),
    body: z.string().describe("The produced content body as a JSON string"),
  },
  async (input) => {
    const parsedBody = JSON.parse(input.body);

    await prisma.$transaction([
      prisma.producedContent.create({
        data: {
          contentIdeaId: input.contentIdeaId,
          userId: input.userId,
          platform: input.platform,
          format: input.format,
          body: parsedBody,
        },
      }),
      prisma.contentIdea.update({
        where: { id: input.contentIdeaId },
        data: { status: "completed" },
      }),
    ]);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ success: true, message: "Produced content saved and idea marked as completed." }),
        },
      ],
    };
  }
);
