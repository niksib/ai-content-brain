import type Anthropic from "@anthropic-ai/sdk";
import { BaseAgent, type AgentToolSet } from "../base.agent.js";

const extractCreatorSignalsTool: Anthropic.Tool = {
  name: "extract_creator_signals",
  description:
    "Save extracted creator signals from the profile snapshot and recent posts. Call this exactly once after reading everything. Each block becomes a memory block in the user profile. Only return blocks where the input actually reveals that signal. Leave a block out if you cannot ground it in bio, display name, or a pattern across multiple posts.",
  input_schema: {
    type: "object",
    properties: {
      blocks: {
        type: "array",
        description:
          "Memory blocks extracted from the input. Each block uses a canonical key. Leave any block out if the input does not reveal it clearly.",
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
                "content_formats",
                "current_projects",
              ],
              description: "Canonical memory key.",
            },
            content: {
              type: "string",
              description:
                "Plain-text content for this block. 1-4 sentences for niche/creator_angle/audience/voice_tone/content_formats. For content_pillars and current_projects, a short bulleted list with '- ' prefixes. Use the creator's own vocabulary where possible. Avoid generic phrasing.",
            },
          },
          required: ["key", "content"],
        },
      },
      toneExamples: {
        type: "array",
        description:
          "3-7 real sentences extracted verbatim from the posts that best represent the creator's unique voice. These end up appended to the voice_tone block.",
        items: { type: "string" },
        minItems: 3,
        maxItems: 7,
      },
    },
    required: ["blocks", "toneExamples"],
  },
};

export class StyleAnalysisAgent extends BaseAgent {
  constructor(userId: string) {
    super("style-analysis", userId, { skills: [] });
  }

  static async create(userId: string): Promise<StyleAnalysisAgent> {
    return BaseAgent.initialize(new StyleAnalysisAgent(userId));
  }

  getTools(): AgentToolSet {
    return {
      definitions: [extractCreatorSignalsTool],
      executors: {},
    };
  }
}
