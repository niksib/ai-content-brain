import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const getCreatorProfile = tool(
  "get_creator_profile",
  "Get the creator profile for a user, including their niche, platforms, tone of voice, audience details, and goals.",
  {
    userId: z.string().describe("The user ID to fetch the creator profile for"),
  },
  async ({ userId }) => {
    const profile = await prisma.creatorProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ found: false, message: "No creator profile found for this user." }),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ found: true, profile }),
        },
      ],
    };
  }
);

export const saveCreatorProfile = tool(
  "save_creator_profile",
  "Create or update a creator profile for a user. Use this after the onboarding conversation to persist the creator's information.",
  {
    userId: z.string().describe("The user ID"),
    platforms: z.array(z.string()).describe("Platforms the creator uses (e.g. threads, linkedin, tiktok, instagram)"),
    niche: z.string().describe("The creator's niche or industry"),
    topics: z.array(z.string()).describe("Key topics the creator covers"),
    audienceDescription: z.string().describe("Description of the target audience"),
    audiencePainPoints: z.string().optional().describe("Pain points of the target audience"),
    stage: z.enum(["starting", "growing", "established"]).describe("The creator's current stage"),
    toneOfVoice: z.string().describe("The creator's desired tone of voice"),
    toneExamples: z.array(z.string()).describe("Examples of the creator's tone"),
    goals: z.array(z.string()).describe("The creator's content goals"),
    rawNotes: z.string().describe("Raw notes from the onboarding conversation"),
  },
  async (input) => {
    const { userId, ...profileData } = input;

    await prisma.creatorProfile.upsert({
      where: { userId },
      create: { userId, ...profileData },
      update: profileData,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ success: true, message: "Creator profile saved successfully." }),
        },
      ],
    };
  }
);
