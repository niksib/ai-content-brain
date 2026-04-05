import { query } from "@anthropic-ai/claude-agent-sdk";
import path from "path";
import { contentToolsServer } from "../tools/server.js";

interface SSEWriter {
  send: (event: string, data: unknown) => void;
  close: () => void;
}

export class AgentRunnerService {
  private agentsBasePath: string;

  constructor() {
    this.agentsBasePath = path.join(import.meta.dirname, "../agents");
  }

  async streamAgentResponse(
    agentName: string,
    prompt: string,
    sdkSessionId: string | undefined,
    userId: string,
    sse: SSEWriter
  ): Promise<{ sdkSessionId?: string }> {
    const agentDir = path.join(this.agentsBasePath, agentName);
    let capturedSessionId: string | undefined = sdkSessionId;

    try {
      for await (const message of query({
        prompt,
        options: {
          cwd: agentDir,
          systemPrompt: { type: "preset", preset: "claude_code" },
          settingSources: ["project"],
          allowedTools: [
            "Read",
            "Skill",
            ...this.getAllowedMcpTools(agentName),
          ],
          mcpServers: { content: contentToolsServer },
          permissionMode: "bypassPermissions",
          allowDangerouslySkipPermissions: true,
          ...(sdkSessionId ? { resume: sdkSessionId } : {}),
        },
      })) {
        // Capture session ID on init
        if (message.type === "system" && message.subtype === "init") {
          capturedSessionId = message.session_id;
        }

        // Stream text tokens
        if (message.type === "assistant") {
          for (const block of message.message.content) {
            if ("text" in block) {
              sse.send("token", block.text);
            }
          }
        }

        // Handle result
        if (message.type === "result") {
          // Stream complete — session result available
        }
      }
    } catch (error) {
      sse.send("error", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      sse.send("done", { sdkSessionId: capturedSessionId });
      sse.close();
    }

    return { sdkSessionId: capturedSessionId };
  }

  private getAllowedMcpTools(agentName: string): string[] {
    const baseTools = ["mcp__content__get_creator_profile"];

    switch (agentName) {
      case "onboarding":
        return [...baseTools, "mcp__content__save_creator_profile"];
      case "strategist":
        return [
          ...baseTools,
          "mcp__content__get_content_history",
          "mcp__content__save_content_idea",
        ];
      case "threads":
      case "linkedin":
      case "video":
      case "instagram":
        return [...baseTools, "mcp__content__save_produced_content"];
      default:
        return baseTools;
    }
  }
}

export const agentRunner = new AgentRunnerService();
