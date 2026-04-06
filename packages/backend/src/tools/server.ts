import { createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { getCreatorProfile, saveCreatorProfile } from "./creator-profile.js";
import { getContentHistory, saveContentIdea, saveProducedContent } from "./content.js";

export function createAgentMcpServer(agentName: string) {
  switch (agentName) {
    case "onboarding":
      return createSdkMcpServer({
        name: "content",
        version: "1.0.0",
        tools: [getCreatorProfile, saveCreatorProfile],
      });

    case "strategist":
      return createSdkMcpServer({
        name: "content",
        version: "1.0.0",
        tools: [getCreatorProfile, getContentHistory, saveContentIdea],
      });

    case "threads":
    case "linkedin":
    case "video":
    case "instagram":
      return createSdkMcpServer({
        name: "content",
        version: "1.0.0",
        tools: [getCreatorProfile, saveProducedContent],
      });

    default:
      return createSdkMcpServer({
        name: "content",
        version: "1.0.0",
        tools: [getCreatorProfile],
      });
  }
}
