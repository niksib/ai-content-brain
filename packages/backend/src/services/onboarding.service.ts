import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma.js";

const client = new Anthropic({ maxRetries: 3 });

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(import.meta.dirname, "../agents/onboarding/.claude/CLAUDE.md"),
  "utf-8"
);

export interface OnboardingAnswer {
  question: string;
  answer: string;
}

export interface OnboardingResult {
  status: "complete" | "needs_more";
  questions?: string[];
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "save_creator_profile",
    description: "Save the completed creator profile to the database.",
    input_schema: {
      type: "object",
      properties: {
        userId: { type: "string" },
        platforms: { type: "array", items: { type: "string" } },
        niche: { type: "string" },
        topics: { type: "array", items: { type: "string" } },
        audienceDescription: { type: "string" },
        audiencePainPoints: { type: "string" },
        stage: { type: "string", enum: ["starting", "growing", "established"] },
        toneOfVoice: { type: "string" },
        toneExamples: { type: "array", items: { type: "string" } },
        goals: { type: "array", items: { type: "string" } },
        rawNotes: { type: "string" },
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
      ],
    },
  },
  {
    name: "request_clarification",
    description:
      "Request additional information from the user when critical fields cannot be determined from the answers. Use this instead of save_creator_profile when you are missing platform, niche, or tone of voice.",
    input_schema: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: { type: "string" },
          description:
            "Specific follow-up questions. Maximum 3. Each question must name exactly what information is missing.",
          minItems: 1,
          maxItems: 3,
        },
      },
      required: ["questions"],
    },
  },
];

export async function processOnboardingAnswers(
  userId: string,
  answers: OnboardingAnswer[]
): Promise<OnboardingResult> {
  const answersText = answers
    .map((a, i) => `Question ${i + 1}: ${a.question}\nAnswer: ${a.answer}`)
    .join("\n\n");

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: answersText },
  ];

  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        { type: "text", text: `User ID: ${userId}` },
      ],
      messages,
      tools: TOOLS,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      throw new Error("Agent stopped without calling a tool");
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      if (block.name === "save_creator_profile") {
        const { userId: uid, ...profileData } = block.input as {
          userId: string;
          [key: string]: unknown;
        };
        await prisma.creatorProfile.upsert({
          where: { userId: uid },
          create: {
            userId: uid,
            ...(profileData as Parameters<typeof prisma.creatorProfile.create>[0]["data"]),
          },
          update: profileData as Parameters<typeof prisma.creatorProfile.update>[0]["data"],
        });
        return { status: "complete" };
      }

      if (block.name === "request_clarification") {
        const input = block.input as { questions: string[] };
        return { status: "needs_more", questions: input.questions };
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify({ error: "Unknown tool" }),
      });
    }

    if (toolResults.length > 0) {
      messages.push({ role: "user", content: toolResults });
    } else {
      break;
    }
  }

  throw new Error("Agent did not complete the onboarding profile");
}
