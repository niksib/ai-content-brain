import { BaseAgent, type AgentToolSet, type AgentToolOptions } from "../base.agent.js";
import {
  saveContentIdeaTool,
  makeSaveContentIdea,
  updateContentIdeaTool,
  makeUpdateContentIdea,
  executeGetSessionContext,
} from "../../tools/content.js";

export class StrategistAgent extends BaseAgent {
  private constructor(userId: string, chatSessionId: string) {
    super("strategist", userId, {
      chatSessionId,
      skills: ["content-filtering"],
    });
  }

  static async create(userId: string, chatSessionId: string): Promise<StrategistAgent> {
    return BaseAgent.initialize(new StrategistAgent(userId, chatSessionId));
  }

  // Loads creator profile + last 30 days of content history before first run
  protected async loadContext(): Promise<string> {
    const sessionContext = await executeGetSessionContext({ userId: this.userId });
    return `## Session Context\n${sessionContext}`;
  }

  getTools(options: AgentToolOptions = {}): AgentToolSet {
    return {
      definitions: [saveContentIdeaTool, updateContentIdeaTool],
      executors: {
        save_content_idea: makeSaveContentIdea(options.onIdeaSaved),
        update_content_idea: makeUpdateContentIdea(options.onIdeaUpdating, options.onIdeaUpdated),
      },
    };
  }
}
