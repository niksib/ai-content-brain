import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../lib/prisma.js";
import { threadsApiService, type ThreadsPost } from "./threads-api.service.js";
import { StyleAnalysisAgent } from "../agents/style-analysis/style-analysis.agent.js";

const client = new Anthropic({ maxRetries: 3 });

const POSTS_LIMIT = 20;

export interface StyleAnalysisResult {
  status: "completed" | "skipped";
  reason?: string;
  postsAnalyzed?: number;
}

function formatPostsForAnalysis(posts: ThreadsPost[]): string {
  const lines = [
    `Here are ${posts.length} recent posts from this creator. Analyze their writing style and call update_writing_style with your findings.`,
    "",
    "---",
    "",
  ];

  posts.forEach((post, index) => {
    lines.push(`Post ${index + 1}:`);
    lines.push(post.text);
    lines.push("");
  });

  return lines.join("\n");
}

export async function analyzeWritingStyleFromThreads(
  userId: string
): Promise<StyleAnalysisResult> {
  const threadsAccount = await prisma.threadsAccount.findUnique({
    where: { userId },
    select: {
      threadsUserId: true,
      accessToken: true,
    },
  });

  if (!threadsAccount) {
    return { status: "skipped", reason: "No Threads account connected" };
  }

  const posts = await threadsApiService.fetchUserPosts(
    threadsAccount.threadsUserId,
    threadsAccount.accessToken,
    POSTS_LIMIT
  );

  const usablePosts = posts.filter((post) => post.text.length >= 10);

  if (usablePosts.length < 3) {
    return {
      status: "skipped",
      reason: `Not enough posts to analyze (found ${usablePosts.length}, need at least 3)`,
    };
  }

  const agent = await StyleAnalysisAgent.create(userId);
  const { definitions } = agent.getTools();
  const content = formatPostsForAnalysis(usablePosts);

  const messages: Anthropic.MessageParam[] = [{ role: "user", content }];

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [{ type: "text", text: agent.systemPrompt, cache_control: { type: "ephemeral" } }],
    messages,
    tools: definitions,
    tool_choice: { type: "any" },
  });

  if (response.stop_reason !== "tool_use") {
    throw new Error("Style analysis agent stopped without calling update_writing_style");
  }

  const toolCall = response.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === "tool_use" && block.name === "update_writing_style"
  );

  if (!toolCall) {
    throw new Error("Style analysis agent did not call update_writing_style");
  }

  const input = toolCall.input as {
    toneExamples: string[];
    styleObservations: string;
  };

  const updatedRawNotes = await buildUpdatedRawNotes(userId, input.styleObservations);

  await Promise.all([
    prisma.creatorProfile.update({
      where: { userId },
      data: {
        toneExamples: input.toneExamples,
        rawNotes: updatedRawNotes,
      },
    }),
    prisma.threadsAccount.update({
      where: { userId },
      data: {
        styleAnalyzed: true,
        styleAnalyzedAt: new Date(),
      },
    }),
  ]);

  return {
    status: "completed",
    postsAnalyzed: usablePosts.length,
  };
}

async function buildUpdatedRawNotes(
  userId: string,
  styleObservations: string
): Promise<string> {
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId },
    select: { rawNotes: true },
  });

  const existingNotes = profile?.rawNotes ?? "";
  const separator = existingNotes ? "\n\n---\n\n" : "";

  return `${existingNotes}${separator}[Style analysis from Threads posts]\n${styleObservations}`;
}
