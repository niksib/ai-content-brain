import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../lib/prisma.js";
import { OnboardingAgent } from "../agents/onboarding/onboarding.agent.js";

const client = new Anthropic({ maxRetries: 3 });

export interface QuizData {
  platforms: string[];
  stage: string;
  topics: string[];
  topicOther?: string;
  audience: string;
  goal: string;
  toneStyles: string[];
  toneExample: string;
}

export interface OnboardingSubmission {
  quiz: QuizData;
  followUpAnswers?: { question: string; answer: string }[];
}

export interface OnboardingResult {
  status: "complete" | "needs_more";
  questions?: string[];
}

function formatSubmission(submission: OnboardingSubmission): string {
  const { quiz, followUpAnswers } = submission;

  const topics =
    quiz.topics.includes("other") && quiz.topicOther
      ? [...quiz.topics.filter((t) => t !== "other"), `Other: ${quiz.topicOther}`]
      : quiz.topics;

  const lines = [
    `PLATFORMS: ${quiz.platforms.join(", ")}`,
    `CREATOR STAGE: ${quiz.stage}`,
    `CONTENT TOPICS: ${topics.join(", ")}`,
    `AUDIENCE: ${quiz.audience}`,
    `MAIN GOAL: ${quiz.goal}`,
    `COMMUNICATION STYLE: ${quiz.toneStyles.join(", ")}`,
    `TONE EXAMPLE: "${quiz.toneExample}"`,
  ];

  if (followUpAnswers?.length) {
    lines.push(
      "",
      "FOLLOW-UP ANSWERS:",
      ...followUpAnswers.map((a) => `Q: ${a.question}\nA: ${a.answer}`)
    );
  }

  return lines.join("\n");
}

export async function processOnboardingAnswers(
  userId: string,
  submission: OnboardingSubmission
): Promise<OnboardingResult> {
  const agent = await OnboardingAgent.create(userId);
  const { definitions } = agent.getTools();
  const content = formatSubmission(submission);

  const messages: Anthropic.MessageParam[] = [{ role: "user", content }];

  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: [{ type: "text", text: agent.systemPrompt, cache_control: { type: "ephemeral" } }],
      messages,
      tools: definitions,
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
            ...(profileData as Parameters<typeof prisma.creatorProfile.create>[0]["data"]),
            userId: uid,
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
