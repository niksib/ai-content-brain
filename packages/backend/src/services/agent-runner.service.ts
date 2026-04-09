import Anthropic from "@anthropic-ai/sdk";
import path from "path";
import fs from "fs";
import { getAgentTools } from "../tools/server.js";
import { executeGetSessionContext } from "../tools/content.js";

interface SSEWriter {
  send: (event: string, data: unknown) => void;
  close: () => void;
}

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export class AgentRunnerService {
  private anthropic: Anthropic;
  private agentsBasePath: string;

  constructor() {
    this.anthropic = new Anthropic();
    this.agentsBasePath = path.join(import.meta.dirname, "../agents");
  }

  // Claude Sonnet 4.6 pricing
  private static readonly INPUT_COST_PER_TOKEN = 3 / 1_000_000;
  private static readonly OUTPUT_COST_PER_TOKEN = 15 / 1_000_000;

  async streamAgentResponse(
    agentName: string,
    messageHistory: HistoryMessage[],
    userId: string,
    sse: SSEWriter,
    chatSessionId?: string
  ): Promise<{ costUsd: number }> {
    const agentDir = path.join(this.agentsBasePath, agentName);
    const claudeMdPath = path.join(agentDir, ".claude", "CLAUDE.md");
    const baseSystemPrompt = fs.existsSync(claudeMdPath)
      ? fs.readFileSync(claudeMdPath, "utf-8")
      : "";

    const contextLines = [
      `CURRENT USER ID: ${userId}`,
      chatSessionId ? `CURRENT SESSION ID: ${chatSessionId}` : "",
      `Always use these IDs when calling tools — never ask the user for them.`,
    ]
      .filter(Boolean)
      .join("\n");

    let sessionContextBlock = "";
    if (agentName === "strategist") {
      const sessionContext = await executeGetSessionContext({ userId });
      sessionContextBlock = `\n\n## SESSION CONTEXT\n${sessionContext}`;
    }

    const systemPrompt = `${contextLines}${sessionContextBlock}\n\n${baseSystemPrompt}`;

    const { definitions, executors } = getAgentTools(agentName, {
      onIdeaSaved: (idea) => sse.send("idea", idea),
      onIdeaUpdating: (ideaId) => sse.send("idea_updating", { ideaId }),
      onIdeaUpdated: (idea) => sse.send("idea_updated", idea),
    });

    const messages: Anthropic.MessageParam[] = messageHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    try {
      let continueLoop = true;

      while (continueLoop) {
        const stream = this.anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          system: systemPrompt,
          messages,
          tools: definitions,
          max_tokens: 8096,
        });

        // Emit idea_pending as soon as save_content_idea tool call starts
        stream.on("streamEvent", (event) => {
          if (
            event.type === "content_block_start" &&
            event.content_block.type === "tool_use" &&
            (event.content_block as { name?: string }).name === "save_content_idea"
          ) {
            sse.send("idea_pending", {});
          }
        });

        // Stream text tokens in real time
        stream.on("text", (text) => {
          sse.send("token", text);
        });

        const response = await stream.finalMessage();

        totalInputTokens += response.usage.input_tokens;
        totalOutputTokens += response.usage.output_tokens;

        // Append assistant turn to conversation history
        messages.push({ role: "assistant", content: response.content });

        if (response.stop_reason === "tool_use") {
          const toolResults: Anthropic.ToolResultBlockParam[] = [];

          for (const block of response.content) {
            if (block.type !== "tool_use") continue;

            const executor = executors[block.name];
            let resultContent: string;

            if (executor) {
              resultContent = await executor(block.input as Record<string, unknown>);
            } else {
              resultContent = JSON.stringify({ error: `Unknown tool: ${block.name}` });
              console.warn(`[${agentName}] Unknown tool called: ${block.name}`);
            }

            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: resultContent,
            });
          }

          messages.push({ role: "user", content: toolResults });
        } else {
          continueLoop = false;
        }
      }
    } catch (error) {
      sse.send("error", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      const costUsd =
        totalInputTokens * AgentRunnerService.INPUT_COST_PER_TOKEN +
        totalOutputTokens * AgentRunnerService.OUTPUT_COST_PER_TOKEN;
      sse.send("done", { costUsd });
      sse.close();
    }

    const costUsd =
      totalInputTokens * AgentRunnerService.INPUT_COST_PER_TOKEN +
      totalOutputTokens * AgentRunnerService.OUTPUT_COST_PER_TOKEN;

    return { costUsd };
  }
}

export const agentRunner = new AgentRunnerService();
