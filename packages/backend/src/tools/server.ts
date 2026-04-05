import { createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { getCreatorProfile, saveCreatorProfile } from "./creator-profile.js";
import { getContentHistory, saveContentIdea, saveProducedContent } from "./content.js";

export const contentToolsServer = createSdkMcpServer({
  name: "content",
  version: "1.0.0",
  tools: [
    getCreatorProfile,
    saveCreatorProfile,
    getContentHistory,
    saveContentIdea,
    saveProducedContent,
  ],
});
