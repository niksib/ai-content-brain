import { query } from "@anthropic-ai/claude-agent-sdk";
import path from "path";
import fs from "fs";
import { createAgentMcpServer } from "../tools/server.js";

interface SSEWriter {
  send: (event: string, data: unknown) => void;
  close: () => void;
}

export class AgentRunnerService {
  private agentsBasePath: string;
  private agentHome: string;

  constructor() {
    this.agentsBasePath = path.join(import.meta.dirname, "../agents");
    this.agentHome = path.join(this.agentsBasePath, ".claude-home");
  }

  async streamAgentResponse(
    agentName: string,
    prompt: string,
    sdkSessionId: string | undefined,
    userId: string,
    sse: SSEWriter
  ): Promise<{ sdkSessionId?: string }> {
    const agentDir = path.join(this.agentsBasePath, agentName);
    const claudeMdPath = path.join(agentDir, ".claude", "CLAUDE.md");
    const systemPrompt = fs.existsSync(claudeMdPath)
      ? fs.readFileSync(claudeMdPath, "utf-8")
      : "";
    let capturedSessionId: string | undefined = sdkSessionId;

    try {
      for await (const message of query({
        prompt,
        options: {
          cwd: agentDir,
          systemPrompt,
          settingSources: [],
          allowedTools: [
            "Read",
            ...(agentName !== "onboarding" ? ["Skill"] : []),
            ...this.getAllowedMcpTools(agentName),
          ],
          mcpServers: { content: createAgentMcpServer(agentName) },
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

        if (message.type === "result") {
          console.log(`[${agentName}] usage:`, JSON.stringify(message.usage ?? "n/a"));
          console.log(`[${agentName}] cost:`, message.total_cost_usd ?? "n/a");
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
