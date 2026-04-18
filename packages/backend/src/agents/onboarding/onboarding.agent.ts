import type Anthropic from "@anthropic-ai/sdk";
import { BaseAgent, type AgentToolSet } from "../base.agent.js";

const generateQuestionsTool: Anthropic.Tool = {
  name: "generate_questions",
  description:
    "Save the personalized onboarding questions plus niche-specific chip options for the fixed anti-patterns question. Maximum 3 personalized questions covering durable-identity gaps. Skip canonical keys the analysis already covers. Also produce 4-6 anti-pattern chip options tailored to this creator's niche (they will be shown under a fixed prompt about what the creator avoids in their own posts).",
  input_schema: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            key: {
              type: "string",
              enum: [
                "niche",
                "creator_angle",
                "audience",
                "content_pillars",
                "voice_tone",
                "goal",
                "current_projects",
                "content_formats",
              ],
              description:
                "Canonical memory key this question maps to. Never generate questions for anti_patterns — that key is handled by a fixed default question added server-side.",
            },
            prompt: {
              type: "string",
              description:
                "Personalized question text shown in the agent bubble. Conversational, second-person. No em-dashes — use commas instead.",
            },
            options: {
              type: "array",
              items: { type: "string" },
              minItems: 3,
              maxItems: 5,
              description:
                "3-5 personalized chip options. Should be concrete, grounded in what the analysis revealed (or generic but realistic if the analysis is thin). Free text input is always available alongside.",
            },
            bubbleContext: {
              type: "string",
              description:
                "Optional short intro line shown above the question. Use to acknowledge what was learned from the analysis. Skip if not needed.",
            },
          },
          required: ["key", "prompt", "options"],
        },
      },
      antiPatternOptions: {
        type: "array",
        minItems: 4,
        maxItems: 6,
        items: { type: "string" },
        description:
          "4-6 chip options for the fixed anti-patterns question, tailored to this creator's niche and observed style. Examples for a nail technician: 'overly filtered photos', 'stock images instead of own work', 'posts that only push services'. Examples for a solo software builder: 'hype takes without substance', 'engagement bait like follow-for-more', 'over-polished marketing copy'. Must describe POST STYLES the creator would avoid in their own content, not opinions about the world. Never time-bound.",
      },
    },
    required: ["questions", "antiPatternOptions"],
  },
};

const normalizeMemoryBlocksTool: Anthropic.Tool = {
  name: "save_memory_blocks",
  description:
    "Save the final normalized memory blocks plus a plain-text summary the user will see. Each block uses a canonical key. Always set onboarding_transcript to the full raw user input (analysis context plus answers plus clarification).",
  input_schema: {
    type: "object",
    properties: {
      blocks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            key: {
              type: "string",
              enum: [
                "niche",
                "creator_angle",
                "audience",
                "content_pillars",
                "voice_tone",
                "goal",
                "anti_patterns",
                "current_projects",
                "content_formats",
                "onboarding_transcript",
              ],
              description: "Canonical memory key.",
            },
            content: {
              type: "string",
              description:
                "Plain-text content for this block. Use the user's own vocabulary where possible. No marketing language.",
            },
          },
          required: ["key", "content"],
        },
      },
      summary: {
        type: "string",
        description:
          "Plain-text summary the user sees. 3-5 short sentences in the second person. Cover niche, audience, voice, and current focus. No em-dashes — use commas.",
      },
    },
    required: ["blocks", "summary"],
  },
};

export class OnboardingAgent extends BaseAgent {
  constructor(userId: string) {
    super("onboarding", userId, { skills: [] });
  }

  static async create(userId: string): Promise<OnboardingAgent> {
    return BaseAgent.initialize(new OnboardingAgent(userId));
  }

  getTools(): AgentToolSet {
    return {
      definitions: [generateQuestionsTool, normalizeMemoryBlocksTool],
      executors: {},
    };
  }
}
