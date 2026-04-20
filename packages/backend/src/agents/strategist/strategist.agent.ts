import type Anthropic from "@anthropic-ai/sdk";
import { BaseAgent, type AgentToolSet, type AgentToolOptions } from "../base.agent.js";
import {
  saveContentIdeaTool,
  makeSaveContentIdea,
  updateContentIdeaTool,
  makeUpdateContentIdea,
  loadStrategistSessionContext,
} from "../../tools/content.js";
import { readMemoryTool, makeReadMemory } from "../tools/read-memory.js";

export class StrategistAgent extends BaseAgent {
  private readonly chatSessionId: string;

  private constructor(userId: string, chatSessionId: string) {
    super("strategist", userId, {
      chatSessionId,
      skills: ["content-filtering"],
    });
    this.chatSessionId = chatSessionId;
  }

  static async create(userId: string, chatSessionId: string): Promise<StrategistAgent> {
    return BaseAgent.initialize(new StrategistAgent(userId, chatSessionId));
  }

  protected async loadContext(): Promise<string> {
    return loadStrategistSessionContext(this.userId, this.chatSessionId);
  }

  getTools(options: AgentToolOptions = {}): AgentToolSet {
    const webSearchTool = { type: "web_search_20250305", name: "web_search" } as unknown as Anthropic.Tool;

    return {
      definitions: [webSearchTool, readMemoryTool, saveContentIdeaTool, updateContentIdeaTool],
      executors: {
        read_memory: makeReadMemory(this.userId),
        save_content_idea: makeSaveContentIdea(options.onIdeaSaved),
        update_content_idea: makeUpdateContentIdea(options.onIdeaUpdating, options.onIdeaUpdated),
      },
    };
  }
}
