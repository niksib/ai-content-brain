import { prisma } from "../lib/prisma.js";
import type Anthropic from "@anthropic-ai/sdk";

// ── Tool definitions (Anthropic Messages API format) ────────────────────────

export const getCreatorProfileTool: Anthropic.Tool = {
  name: "get_creator_profile",
  description:
    "Get the creator profile for a user, including their niche, platforms, tone of voice, audience details, and goals.",
  input_schema: {
    type: "object",
    properties: {
      userId: { type: "string", description: "The user ID to fetch the creator profile for" },
    },
    required: ["userId"],
  },
};

export const saveCreatorProfileTool: Anthropic.Tool = {
  name: "save_creator_profile",
  description:
    "Create or update a creator profile for a user. Use this after the onboarding conversation to persist the creator's information.",
  input_schema: {
    type: "object",
    properties: {
      userId: { type: "string", description: "The user ID" },
      platforms: {
        type: "array",
        items: { type: "string" },
        description: "Platforms the creator uses (e.g. threads, linkedin, tiktok, instagram)",
      },
      niche: { type: "string", description: "The creator's niche or industry" },
      topics: {
        type: "array",
        items: { type: "string" },
        description: "Key topics the creator covers",
      },
      audienceDescription: { type: "string", description: "Description of the target audience" },
      audiencePainPoints: {
        type: "string",
        description: "Pain points of the target audience",
      },
      stage: {
        type: "string",
        enum: ["starting", "growing", "established"],
        description: "The creator's current stage",
      },
      toneOfVoice: { type: "string", description: "The creator's desired tone of voice" },
      toneExamples: {
        type: "array",
        items: { type: "string" },
        description: "Examples of the creator's tone",
      },
      goals: {
        type: "array",
        items: { type: "string" },
        description: "The creator's content goals",
      },
      rawNotes: { type: "string", description: "Raw notes from the onboarding conversation" },
      contentLanguage: {
        type: "string",
        description: "The primary language for all produced content (e.g. 'Russian', 'English', 'Ukrainian')",
      },
    },
    required: [
      "userId",
      "platforms",
      "niche",
      "topics",
      "audienceDescription",
      "stage",
      "toneOfVoice",
      "toneExamples",
      "goals",
      "rawNotes",
      "contentLanguage",
    ],
  },
};

// ── Executors ───────────────────────────────────────────────────────────────

export async function executeGetCreatorProfile(input: Record<string, unknown>): Promise<string> {
  const userId = input.userId as string;

  const profile = await prisma.creatorProfile.findUnique({ where: { userId } });

  if (!profile) {
    return JSON.stringify({ found: false, message: "No creator profile found for this user." });
  }

  return JSON.stringify({ found: true, profile });
}

export async function executeSaveCreatorProfile(input: Record<string, unknown>): Promise<string> {
  const { userId, ...profileData } = input as {
    userId: string;
    platforms: string[];
    niche: string;
    topics: string[];
    audienceDescription: string;
    audiencePainPoints?: string;
    stage: "starting" | "growing" | "established";
    toneOfVoice: string;
    toneExamples: string[];
    goals: string[];
    rawNotes: string;
    contentLanguage: string;
  };

  await prisma.creatorProfile.upsert({
    where: { userId },
    create: { userId, ...profileData },
    update: profileData,
  });

  return JSON.stringify({ success: true, message: "Creator profile saved successfully." });
}
