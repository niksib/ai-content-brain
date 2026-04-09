import type Anthropic from "@anthropic-ai/sdk";
import {
  getCreatorProfileTool,
  executeGetCreatorProfile,
  saveCreatorProfileTool,
  executeSaveCreatorProfile,
} from "./creator-profile.js";
import {
  saveContentIdeaTool,
  makeSaveContentIdea,
  updateContentIdeaTool,
  makeUpdateContentIdea,
  saveProducedContentTool,
  executeSaveProducedContent,
} from "./content.js";
import type { ContentIdea } from "../generated/prisma/client.js";

type ToolExecutor = (input: Record<string, unknown>) => Promise<string>;

export interface AgentToolSet {
  definitions: Anthropic.Tool[];
  executors: Record<string, ToolExecutor>;
}

interface AgentToolOptions {
  onIdeaSaved?: (idea: ContentIdea) => void;
  onIdeaUpdating?: (ideaId: string) => void;
  onIdeaUpdated?: (idea: ContentIdea) => void;
}

export function getAgentTools(agentName: string, options: AgentToolOptions = {}): AgentToolSet {
  switch (agentName) {
    case "onboarding":
      return {
        definitions: [getCreatorProfileTool, saveCreatorProfileTool],
        executors: {
          get_creator_profile: executeGetCreatorProfile,
          save_creator_profile: executeSaveCreatorProfile,
        },
      };

    case "strategist":
      return {
        definitions: [saveContentIdeaTool, updateContentIdeaTool],
        executors: {
          save_content_idea: makeSaveContentIdea(options.onIdeaSaved),
          update_content_idea: makeUpdateContentIdea(options.onIdeaUpdating, options.onIdeaUpdated),
        },
      };

    case "threads":
    case "linkedin":
    case "video":
    case "instagram":
      return {
        definitions: [getCreatorProfileTool, saveProducedContentTool],
        executors: {
          get_creator_profile: executeGetCreatorProfile,
          save_produced_content: executeSaveProducedContent,
        },
      };

    default:
      return {
        definitions: [getCreatorProfileTool],
        executors: { get_creator_profile: executeGetCreatorProfile },
      };
  }
}
