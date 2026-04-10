import type Anthropic from "@anthropic-ai/sdk";
import { BaseAgent, type AgentToolSet } from "../base.agent.js";
import {
  saveCreatorProfileTool,
  executeSaveCreatorProfile,
} from "../../tools/creator-profile.js";

const requestClarificationTool: Anthropic.Tool = {
  name: "request_clarification",
  description:
    "Request specific follow-up questions when the audience description or tone example is too vague. Maximum 3 questions. Do not use this if the answers are clear enough.",
  input_schema: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: 3,
      },
    },
    required: ["questions"],
  },
};

export class OnboardingAgent extends BaseAgent {
  constructor(userId: string) {
    // Onboarding has no skills — pure structured review flow
    super("onboarding", userId, { skills: [] });
  }

  static async create(userId: string): Promise<OnboardingAgent> {
    return BaseAgent.initialize(new OnboardingAgent(userId));
  }

  getTools(): AgentToolSet {
    return {
      definitions: [saveCreatorProfileTool, requestClarificationTool],
      executors: {
        // Onboarding service handles tool execution inline — executors unused
        save_creator_profile: executeSaveCreatorProfile,
      },
    };
  }
}
