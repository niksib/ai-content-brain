import type Anthropic from "@anthropic-ai/sdk";
import { BaseAgent, type AgentToolSet } from "../base.agent.js";

const updateWritingStyleTool: Anthropic.Tool = {
  name: "update_writing_style",
  description:
    "Save extracted tone examples and style observations from the creator's real posts. Call this once after completing the analysis.",
  input_schema: {
    type: "object",
    properties: {
      toneExamples: {
        type: "array",
        items: { type: "string" },
        minItems: 3,
        maxItems: 7,
        description: "5–7 real sentences extracted verbatim from the creator's posts that best represent their unique voice",
      },
      styleObservations: {
        type: "string",
        description: "3–5 sentence summary of observed writing patterns: rhythm, punctuation habits, emoji usage, hook/closing style",
      },
    },
    required: ["toneExamples", "styleObservations"],
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
      definitions: [updateWritingStyleTool],
      executors: {},
    };
  }
}
