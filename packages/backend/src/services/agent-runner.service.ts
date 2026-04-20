import Anthropic from "@anthropic-ai/sdk";
import type { BaseAgent, AgentToolOptions } from "../agents/base.agent.js";
export type { AgentToolOptions };

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

  constructor() {
    this.anthropic = new Anthropic();
  }

  // Claude Sonnet 4.6 pricing
  private static readonly INPUT_COST_PER_TOKEN = 3 / 1_000_000;
  private static readonly OUTPUT_COST_PER_TOKEN = 15 / 1_000_000;

  async stream(
    agent: BaseAgent,
    messageHistory: HistoryMessage[],
    sse: SSEWriter,
    extraToolOptions?: AgentToolOptions
  ): Promise<{ costUsd: number }> {
    // extraToolOptions first so SSE-wired defaults always win on conflict
    const toolOptions: AgentToolOptions = {
      ...extraToolOptions,
      onIdeaSaved: (idea) => sse.send("idea", idea),
      onIdeaUpdating: (ideaId) => sse.send("idea_updating", { ideaId }),
      onIdeaUpdated: (idea) => sse.send("idea_updated", idea),
    };

    const { definitions, executors } = agent.getTools(toolOptions);

    const messages: Anthropic.MessageParam[] = messageHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let finalCostUsd = 0;

    try {
      let continueLoop = true;

      while (continueLoop) {
        const stream = this.anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          system: agent.systemPrompt,
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

        messages.push({ role: "assistant", content: response.content });

        if (response.stop_reason === "tool_use") {
          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          let productionComplete = false;

          for (const block of response.content) {
            if (block.type !== "tool_use") continue;

            if (block.name === "save_produced_content") {
              productionComplete = true;
            }

            const executor = executors[block.name];
            let resultContent: string;
            let isError = false;

            if (executor) {
              try {
                resultContent = await executor(block.input as Record<string, unknown>);
              } catch (toolError) {
                isError = true;
                const message =
                  toolError instanceof Error ? toolError.message : String(toolError);
                resultContent = JSON.stringify({
                  success: false,
                  error: "tool_execution_failed",
                  tool: block.name,
                  message,
                });
                console.error(
                  `[${agent.constructor.name}] Tool ${block.name} threw:`,
                  toolError
                );
              }
            } else {
              isError = true;
              resultContent = JSON.stringify({ error: `Unknown tool: ${block.name}` });
              console.warn(`[${agent.constructor.name}] Unknown tool called: ${block.name}`);
            }

            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: resultContent,
              ...(isError && { is_error: true }),
            });
          }

          // Stop after save_produced_content — no need for a confirmation round trip
          if (productionComplete) {
            continueLoop = false;
          } else {
            messages.push({ role: "user", content: toolResults });
          }
        } else {
          continueLoop = false;
        }
      }
    } catch (error) {
      sse.send("error", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      finalCostUsd =
        totalInputTokens * AgentRunnerService.INPUT_COST_PER_TOKEN +
        totalOutputTokens * AgentRunnerService.OUTPUT_COST_PER_TOKEN;
      sse.send("done", { costUsd: finalCostUsd });
      sse.close();
    }

    return { costUsd: finalCostUsd };
  }
}

export const agentRunner = new AgentRunnerService();
