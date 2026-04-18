import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../lib/prisma.js";
import { OnboardingAgent } from "../agents/onboarding/onboarding.agent.js";
import { StyleAnalysisAgent } from "../agents/style-analysis/style-analysis.agent.js";
import { threadsApiService } from "./threads-api.service.js";
import { CANONICAL_KEYS } from "../memory/canonical-keys.js";
import { memoryService } from "./memory.service.js";
import {
  ANTI_PATTERNS_QUESTION,
  DEFAULT_QUESTIONS,
  type OnboardingQuestion,
} from "../onboarding/default-questions.js";
import { Prisma } from "../generated/prisma/client.js";
import type { OnboardingSession } from "../generated/prisma/client.js";

const client = new Anthropic({ maxRetries: 3 });
const ANALYSIS_MODEL = "claude-sonnet-4-6";
const NORMALIZATION_MODEL = "claude-sonnet-4-6";
const POSTS_LIMIT = 30;
const ANALYSIS_STALE_MS = 2 * 60 * 1000;
const ANALYSIS_PIPELINE_RETRIES = 2;
const ANALYSIS_RETRY_BACKOFF_MS = 2000;

export type OnboardingStep =
  | "connect"
  | "analyzing"
  | "questions"
  | "summary"
  | "done";

export class OnboardingBusinessRuleError extends Error {
  constructor(
    message: string,
    public readonly code: "already_refined" | "session_not_started" | "already_completed" | "blocks_missing",
    public readonly httpStatus: number,
  ) {
    super(message);
    this.name = "OnboardingBusinessRuleError";
  }
}

export interface AnalysisBlock {
  key: string;
  content: string;
}

export interface ThreadsAnalysis {
  source: "threads" | "fallback";
  postsAnalyzed: number;
  blocks: AnalysisBlock[];
  toneExamples: string[];
}

export interface QuestionAnswer {
  selected: string[];
  text: string;
}

export interface SessionView {
  id: string;
  currentStep: OnboardingStep;
  threadsAnalysis: ThreadsAnalysis | null;
  generatedQuestions: OnboardingQuestion[] | null;
  answers: Record<string, QuestionAnswer> | null;
  summary: string | null;
  clarification: string | null;
  completedAt: string | null;
}

function toView(session: OnboardingSession): SessionView {
  return {
    id: session.id,
    currentStep: session.currentStep as OnboardingStep,
    threadsAnalysis: (session.threadsAnalysis as unknown as ThreadsAnalysis | null) ?? null,
    generatedQuestions:
      (session.generatedQuestions as unknown as OnboardingQuestion[] | null) ?? null,
    answers: (session.answers as unknown as Record<string, QuestionAnswer> | null) ?? null,
    summary: session.summary ?? null,
    clarification: session.clarification ?? null,
    completedAt: session.completedAt?.toISOString() ?? null,
  };
}

function findToolUse(
  response: Anthropic.Message,
  name: string
): Anthropic.ToolUseBlock {
  const block = response.content.find(
    (entry): entry is Anthropic.ToolUseBlock =>
      entry.type === "tool_use" && entry.name === name
  );
  if (!block) {
    throw new Error(`Onboarding agent did not call ${name}`);
  }
  return block;
}

interface CreatorProfileSnapshot {
  displayName: string | null;
  biography: string | null;
}

function formatPostsForAnalysis(
  posts: { text: string }[],
  profile: CreatorProfileSnapshot
): string {
  const lines = [
    `Here are this creator's Threads profile snapshot and ${posts.length} recent root posts. Extract creator signals as memory blocks. Call extract_creator_signals exactly once.`,
    "",
    "## Profile",
    `Display name: ${profile.displayName?.trim() || "(not set)"}`,
    `Biography: ${profile.biography?.trim() || "(not set)"}`,
    "",
    "## Posts",
    "",
  ];
  posts.forEach((post, index) => {
    lines.push(`Post ${index + 1}:`);
    lines.push(post.text);
    lines.push("");
  });
  return lines.join("\n");
}

function formatCanonicalKeys(): string {
  return CANONICAL_KEYS.map(
    (entry) => `- ${entry.key}: ${entry.title} — ${entry.description}`
  ).join("\n");
}

function formatAnalysis(analysis: ThreadsAnalysis | null): string {
  const blocks = Array.isArray(analysis?.blocks) ? analysis.blocks : [];
  const toneExamples = Array.isArray(analysis?.toneExamples) ? analysis.toneExamples : [];
  if (!analysis || (blocks.length === 0 && toneExamples.length === 0)) {
    return "(no Threads analysis available — generate questions covering all key gaps)";
  }
  const lines = [`Source: ${analysis.source}, posts analyzed: ${analysis.postsAnalyzed}`];
  blocks.forEach((block) => {
    lines.push("", `[${block.key}]`, block.content);
  });
  if (toneExamples.length > 0) {
    lines.push("", "[verbatim tone examples]");
    toneExamples.forEach((example) => lines.push(`- ${example}`));
  }
  return lines.join("\n");
}

function formatAnswers(
  questions: OnboardingQuestion[],
  answers: Record<string, QuestionAnswer> | null
): string {
  if (!answers) return "(no answers captured)";
  return questions
    .map((question) => {
      const answer = answers[question.key];
      if (!answer) return `[${question.key}] (skipped)`;
      const lines = [`[${question.key}] ${question.prompt}`];
      if (answer.selected.length > 0) {
        lines.push(`Selected: ${answer.selected.join(", ")}`);
      }
      if (answer.text.trim()) {
        lines.push(`Free text: ${answer.text.trim()}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

class OnboardingService {
  async getOrCreateSession(userId: string): Promise<SessionView> {
    const existing = await prisma.onboardingSession.findUnique({
      where: { userId },
    });
    if (existing) return toView(existing);

    const created = await prisma.onboardingSession.create({
      data: { userId, currentStep: "connect" },
    });
    return toView(created);
  }

  async getSession(userId: string): Promise<SessionView | null> {
    const session = await prisma.onboardingSession.findUnique({
      where: { userId },
    });
    return session ? toView(session) : null;
  }

  async runAnalysis(userId: string): Promise<SessionView> {
    const session = await this.requireActiveSession(userId);

    if (session.currentStep === "analyzing") {
      return toView(session);
    }

    const staleThreshold = new Date(Date.now() - ANALYSIS_STALE_MS);
    const claim = await prisma.onboardingSession.updateMany({
      where: {
        id: session.id,
        OR: [
          { currentStep: { not: "analyzing" } },
          { analysisStartedAt: { lt: staleThreshold } },
        ],
      },
      data: {
        currentStep: "analyzing",
        analysisStartedAt: new Date(),
      },
    });

    if (claim.count === 0) {
      const current = await prisma.onboardingSession.findUniqueOrThrow({
        where: { id: session.id },
      });
      return toView(current);
    }

    void this.executeAnalysis(userId, session.id).catch((err) => {
      console.error("[onboarding/executeAnalysis] unexpected failure", err);
    });

    const claimed = await prisma.onboardingSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    return toView(claimed);
  }

  private async executeAnalysis(userId: string, sessionId: string): Promise<void> {
    for (let attempt = 1; attempt <= ANALYSIS_PIPELINE_RETRIES; attempt++) {
      try {
        await this.runAnalysisPipeline(userId, sessionId);
        return;
      } catch (err) {
        console.error(
          `[onboarding/executeAnalysis] attempt ${attempt}/${ANALYSIS_PIPELINE_RETRIES} failed`,
          err
        );
        if (attempt === ANALYSIS_PIPELINE_RETRIES) {
          try {
            await this.runAnalysisFallback(userId);
          } catch (fallbackErr) {
            console.error("[onboarding/executeAnalysis] fallback failed", fallbackErr);
            await prisma.onboardingSession.update({
              where: { id: sessionId },
              data: { currentStep: "connect", analysisStartedAt: null },
            });
          }
          return;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, ANALYSIS_RETRY_BACKOFF_MS * attempt)
        );
      }
    }
  }

  private async runAnalysisPipeline(userId: string, sessionId: string): Promise<void> {
    const threadsAccount = await prisma.threadsAccount.findUnique({
      where: { userId },
      select: {
        threadsUserId: true,
        accessToken: true,
        name: true,
        biography: true,
      },
    });

    if (!threadsAccount) {
      await this.writeFallbackResult(sessionId);
      return;
    }

    const posts = await threadsApiService.fetchUserPosts(
      threadsAccount.threadsUserId,
      threadsAccount.accessToken,
      POSTS_LIMIT
    );
    const usable = posts.filter((post) => post.text.length >= 10);

    if (usable.length < 3) {
      await this.writeFallbackResult(sessionId);
      return;
    }

    const profile: CreatorProfileSnapshot = {
      displayName: threadsAccount.name,
      biography: threadsAccount.biography,
    };

    const analysis = await this.extractAnalysisFromPosts(userId, usable, profile);
    const questions = await this.generatePersonalizedQuestions(userId, analysis);

    await prisma.onboardingSession.update({
      where: { id: sessionId },
      data: {
        currentStep: "questions",
        analysisStartedAt: null,
        threadsAnalysis: analysis as unknown as Prisma.InputJsonValue,
        generatedQuestions: questions as unknown as Prisma.InputJsonValue,
        answers: {},
      },
    });
  }

  private async writeFallbackResult(sessionId: string): Promise<void> {
    const analysis: ThreadsAnalysis = {
      source: "fallback",
      postsAnalyzed: 0,
      blocks: [],
      toneExamples: [],
    };
    await prisma.onboardingSession.update({
      where: { id: sessionId },
      data: {
        currentStep: "questions",
        analysisStartedAt: null,
        threadsAnalysis: analysis as unknown as Prisma.InputJsonValue,
        generatedQuestions: DEFAULT_QUESTIONS as unknown as Prisma.InputJsonValue,
        answers: {},
      },
    });
  }

  async runAnalysisFallback(userId: string): Promise<SessionView> {
    const session = await this.requireActiveSession(userId);

    const analysis: ThreadsAnalysis = {
      source: "fallback",
      postsAnalyzed: 0,
      blocks: [],
      toneExamples: [],
    };

    const updated = await prisma.onboardingSession.update({
      where: { id: session.id },
      data: {
        currentStep: "questions",
        analysisStartedAt: null,
        threadsAnalysis: analysis as unknown as Prisma.InputJsonValue,
        generatedQuestions: DEFAULT_QUESTIONS as unknown as Prisma.InputJsonValue,
        answers: {},
      },
    });
    return toView(updated);
  }

  async saveAnswer(
    userId: string,
    questionKey: string,
    answer: QuestionAnswer
  ): Promise<SessionView> {
    const session = await this.requireActiveSession(userId);
    const current = (session.answers as unknown as Record<string, QuestionAnswer> | null) ?? {};
    current[questionKey] = answer;

    const updated = await prisma.onboardingSession.update({
      where: { id: session.id },
      data: {
        answers: current as unknown as Prisma.InputJsonValue,
      },
    });
    return toView(updated);
  }

  async generateSummary(userId: string): Promise<SessionView> {
    const session = await this.requireActiveSession(userId);
    const questions = (session.generatedQuestions as unknown as OnboardingQuestion[] | null) ?? [];
    const analysis = (session.threadsAnalysis as unknown as ThreadsAnalysis | null) ?? null;
    const answers = (session.answers as unknown as Record<string, QuestionAnswer> | null) ?? null;

    const { blocks, summary } = await this.normalizeBlocks(userId, {
      analysis,
      questions,
      answers,
      clarification: null,
    });

    const updated = await prisma.onboardingSession.update({
      where: { id: session.id },
      data: {
        currentStep: "summary",
        summary,
        clarification: null,
        threadsAnalysis: {
          ...(analysis ?? { source: "fallback", postsAnalyzed: 0, toneExamples: [] }),
          blocks: blocks as AnalysisBlock[],
        } as unknown as Prisma.InputJsonValue,
      },
    });
    return toView(updated);
  }

  async applyClarification(
    userId: string,
    clarification: string
  ): Promise<SessionView> {
    const session = await this.requireActiveSession(userId);
    if (session.clarification) {
      throw new OnboardingBusinessRuleError(
        "Summary can be refined only once",
        "already_refined",
        409,
      );
    }
    const questions = (session.generatedQuestions as unknown as OnboardingQuestion[] | null) ?? [];
    const analysis = (session.threadsAnalysis as unknown as ThreadsAnalysis | null) ?? null;
    const answers = (session.answers as unknown as Record<string, QuestionAnswer> | null) ?? null;

    const { blocks, summary } = await this.normalizeBlocks(userId, {
      analysis,
      questions,
      answers,
      clarification,
    });

    const updated = await prisma.onboardingSession.update({
      where: { id: session.id },
      data: {
        summary,
        clarification,
        threadsAnalysis: {
          ...(analysis ?? { source: "fallback", postsAnalyzed: 0, toneExamples: [] }),
          blocks: blocks as AnalysisBlock[],
        } as unknown as Prisma.InputJsonValue,
      },
    });
    return toView(updated);
  }

  async complete(userId: string): Promise<SessionView> {
    const session = await this.requireActiveSession(userId);
    const analysis = (session.threadsAnalysis as unknown as ThreadsAnalysis | null) ?? null;
    if (!analysis || analysis.blocks.length === 0) {
      throw new Error("Cannot complete onboarding without normalized blocks");
    }

    await Promise.all(
      analysis.blocks.map((block) => {
        const meta = CANONICAL_KEYS.find((entry) => entry.key === block.key);
        return memoryService.upsertMemoryBlock(userId, {
          key: block.key,
          title: meta?.title ?? block.key,
          description: meta?.description ?? "",
          content: block.content,
        });
      })
    );

    if (analysis.source !== "fallback") {
      await prisma.threadsAccount.updateMany({
        where: { userId },
        data: { styleAnalyzed: true, styleAnalyzedAt: new Date() },
      });
    }

    const updated = await prisma.onboardingSession.update({
      where: { id: session.id },
      data: {
        currentStep: "done",
        completedAt: new Date(),
        threadsAnalysis: Prisma.JsonNull,
        generatedQuestions: Prisma.JsonNull,
      },
    });
    return toView(updated);
  }

  // ── Internal ─────────────────────────────────────────────

  private async requireActiveSession(userId: string) {
    const session = await prisma.onboardingSession.findUnique({
      where: { userId },
    });
    if (!session) {
      throw new Error("Onboarding session not started");
    }
    if (session.completedAt) {
      throw new Error("Onboarding already completed");
    }
    return session;
  }

  private async extractAnalysisFromPosts(
    userId: string,
    posts: { text: string }[],
    profile: CreatorProfileSnapshot
  ): Promise<ThreadsAnalysis> {
    const agent = await StyleAnalysisAgent.create(userId);
    const { definitions } = agent.getTools();

    const response = await client.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 1500,
      system: [
        {
          type: "text",
          text: agent.systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: formatPostsForAnalysis(posts, profile) }],
      tools: definitions,
      tool_choice: { type: "tool", name: "extract_creator_signals" },
    });

    const block = findToolUse(response, "extract_creator_signals");
    const input = block.input as {
      blocks: AnalysisBlock[];
      toneExamples: string[];
    };

    return {
      source: "threads",
      postsAnalyzed: posts.length,
      blocks: input.blocks,
      toneExamples: input.toneExamples,
    };
  }

  private async generatePersonalizedQuestions(
    userId: string,
    analysis: ThreadsAnalysis
  ): Promise<OnboardingQuestion[]> {
    const agent = await OnboardingAgent.create(userId);
    const { definitions } = agent.getTools();

    const userMessage = [
      "Phase A — generate up to 4 personalized onboarding questions.",
      "",
      "## Canonical memory keys",
      formatCanonicalKeys(),
      "",
      "## Analysis of the user's recent posts",
      formatAnalysis(analysis),
      "",
      "Generate up to 3 questions covering the weakest-signal durable-identity keys. Skip anything the analysis already covers convincingly. Never ask about anti_patterns (handled separately by a fixed default question). Never frame questions around time, stages, or what is happening this month. Chip options must be grounded in analysis signal where possible.",
    ].join("\n");

    const response = await client.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 1500,
      system: [
        {
          type: "text",
          text: agent.systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
      tools: definitions,
      tool_choice: { type: "tool", name: "generate_questions" },
    });

    const block = findToolUse(response, "generate_questions");
    const input = block.input as {
      questions: OnboardingQuestion[];
      antiPatternOptions?: string[];
    };
    if (!Array.isArray(input.questions) || input.questions.length === 0) {
      return DEFAULT_QUESTIONS;
    }
    const generated = input.questions
      .filter((question) => question.key !== "anti_patterns")
      .slice(0, 3);
    const tailoredChips = (input.antiPatternOptions ?? [])
      .map((chip) => chip.trim())
      .filter((chip) => chip.length > 0)
      .slice(0, 6);
    const antiPatternsQuestion: OnboardingQuestion = {
      ...ANTI_PATTERNS_QUESTION,
      options:
        tailoredChips.length >= 4
          ? tailoredChips
          : ANTI_PATTERNS_QUESTION.options,
    };
    return [...generated, antiPatternsQuestion];
  }

  private async normalizeBlocks(
    userId: string,
    payload: {
      analysis: ThreadsAnalysis | null;
      questions: OnboardingQuestion[];
      answers: Record<string, QuestionAnswer> | null;
      clarification: string | null;
    }
  ): Promise<{ blocks: AnalysisBlock[]; summary: string }> {
    const agent = await OnboardingAgent.create(userId);
    const { definitions } = agent.getTools();

    const userMessage = [
      "Phase B — normalize all signals into final memory blocks plus a user-facing summary.",
      "",
      "## Canonical memory keys",
      formatCanonicalKeys(),
      "",
      "## Pre-filled blocks from post analysis",
      formatAnalysis(payload.analysis),
      "",
      "## User answers to onboarding questions",
      formatAnswers(payload.questions, payload.answers),
      "",
      "## User clarification on the summary",
      payload.clarification?.trim()
        ? payload.clarification.trim()
        : "(none)",
      "",
      "Call save_memory_blocks with the final block set and a 3 to 5 sentence summary in the second person. Always include onboarding_transcript with the verbatim raw signal.",
    ].join("\n");

    for (let attempt = 1; attempt <= 2; attempt++) {
      const response = await client.messages.create({
        model: NORMALIZATION_MODEL,
        max_tokens: 2500,
        system: [
          {
            type: "text",
            text: agent.systemPrompt,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: userMessage }],
        tools: definitions,
        tool_choice: { type: "tool", name: "save_memory_blocks" },
      });

      const block = findToolUse(response, "save_memory_blocks");
      const input = block.input as {
        blocks?: AnalysisBlock[];
        summary?: string;
      };
      const blocks = Array.isArray(input.blocks) ? input.blocks : [];
      const summary = typeof input.summary === "string" ? input.summary.trim() : "";

      if (blocks.length > 0 && summary.length > 0) {
        return { blocks, summary };
      }

      console.warn(
        `[onboarding/normalizeBlocks] attempt ${attempt}/2 returned incomplete output (blocks=${blocks.length}, summaryLen=${summary.length}). stop_reason=${response.stop_reason}`
      );
    }

    const fallbackBlocks = this.synthesizeBlocksFromAnswers(payload);
    const fallbackSummary = this.synthesizeSummaryFromAnswers(payload);
    console.warn(
      "[onboarding/normalizeBlocks] using synthesized fallback after 2 failed model attempts"
    );
    return { blocks: fallbackBlocks, summary: fallbackSummary };
  }

  private synthesizeBlocksFromAnswers(payload: {
    analysis: ThreadsAnalysis | null;
    questions: OnboardingQuestion[];
    answers: Record<string, QuestionAnswer> | null;
  }): AnalysisBlock[] {
    const blocks: AnalysisBlock[] = [];
    const answers = payload.answers ?? {};

    if (payload.analysis?.blocks) {
      for (const block of payload.analysis.blocks) {
        blocks.push({ key: block.key, content: block.content });
      }
    }

    for (const question of payload.questions) {
      const answer = answers[question.key];
      if (!answer) continue;
      const parts: string[] = [];
      if (answer.selected.length > 0) parts.push(...answer.selected);
      if (answer.text.trim()) parts.push(answer.text.trim());
      if (parts.length === 0) continue;
      const existing = blocks.findIndex((entry) => entry.key === question.key);
      const content = parts.map((part) => `- ${part}`).join("\n");
      if (existing >= 0) {
        blocks[existing] = { key: question.key, content };
      } else {
        blocks.push({ key: question.key, content });
      }
    }

    const transcriptLines: string[] = [];
    if (payload.analysis?.blocks?.length) {
      transcriptLines.push("## Analysis blocks");
      for (const block of payload.analysis.blocks) {
        transcriptLines.push(`[${block.key}] ${block.content}`);
      }
    }
    transcriptLines.push("", "## User answers");
    transcriptLines.push(formatAnswers(payload.questions, payload.answers));
    blocks.push({
      key: "onboarding_transcript",
      content: transcriptLines.join("\n"),
    });

    return blocks;
  }

  private synthesizeSummaryFromAnswers(payload: {
    questions: OnboardingQuestion[];
    answers: Record<string, QuestionAnswer> | null;
  }): string {
    const answers = payload.answers ?? {};
    const parts: string[] = [];
    for (const question of payload.questions) {
      const answer = answers[question.key];
      if (!answer || answer.selected.length === 0) continue;
      parts.push(`${question.key}: ${answer.selected.join(", ")}`);
    }
    if (parts.length === 0) {
      return "Here is what I captured from your answers. You can refine any of this on your Creator Profile.";
    }
    return `Here is what I captured from your answers:\n\n${parts.join("\n")}\n\nYou can refine any of this on your Creator Profile.`;
  }
}

export const onboardingService = new OnboardingService();
