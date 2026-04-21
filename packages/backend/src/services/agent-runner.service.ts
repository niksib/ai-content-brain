import Anthropic from "@anthropic-ai/sdk";
import type { BaseAgent, AgentToolOptions } from "../agents/base.agent.js";
import { deductCreditsForLlmCall, type LlmActionType } from "./llm-cost.js";
export type { AgentToolOptions };

interface SSEWriter {
  send: (event: string, data: unknown) => void;
  close: () => void;
}

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

interface BillingOptions {
  userId: string;
  actionType: LlmActionType;
  reference?: string;
}

export class AgentRunnerService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic();
  }

  async stream(
    agent: BaseAgent,
    messageHistory: HistoryMessage[],
    sse: SSEWriter,
    extraToolOptions?: AgentToolOptions,
    billing?: BillingOptions
  ): Promise<{ costUsd: number }> {
    // extraToolOptions first so SSE-wired defaults always win on conflict
    const toolOptions: AgentToolOptions = {
      ...extraToolOptions,
      onIdeaSaved: (idea) => sse.send("idea", idea),
      onIdeaUpdating: (ideaId) => sse.send("idea_updating", { ideaId }),
      onIdeaUpdated: (idea) => sse.send("idea_updated", idea),
    };

    const { definitions, executors } = agent.getTools(toolOptions);

    // Build system as array of blocks:
    // - static part (CLAUDE.md + skills) gets cache_control → cached across turns
    // - dynamic part (session context: memory, ideas, history) is uncached → changes between requests
    const systemBlocks: Anthropic.Messages.TextBlockParam[] = [
      {
        type: "text",
        text: agent.staticSystemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ];
    if (agent.dynamicSystemPrompt) {
      systemBlocks.push({ type: "text", text: agent.dynamicSystemPrompt });
    }

    // Cache the last tool definition — tools never change, free win
    const toolsWithCache: Anthropic.Tool[] = definitions.map((tool, index) =>
      index === definitions.length - 1
        ? { ...tool, cache_control: { type: "ephemeral" } }
        : tool
    );

    const messages: Anthropic.MessageParam[] = messageHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Accumulate all token types across multi-turn loop
    let totalInputUncachedTokens = 0;
    let totalInputCachedTokens = 0;
    let totalCacheWriteTokens = 0;
    let totalOutputTokens = 0;
    let costUsd = 0;

    try {
      let continueLoop = true;

      while (continueLoop) {
        const stream = this.anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          system: systemBlocks,
          messages,
          tools: toolsWithCache,
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

        // Accumulate all token types for accurate billing
        const usage = response.usage as {
          input_tokens: number;
          output_tokens: number;
          cache_creation_input_tokens?: number;
          cache_read_input_tokens?: number;
        };
        totalInputUncachedTokens += usage.input_tokens;
        totalOutputTokens += usage.output_tokens;
        totalCacheWriteTokens += usage.cache_creation_input_tokens ?? 0;
        totalInputCachedTokens += usage.cache_read_input_tokens ?? 0;

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
      // Deduct real token-based credits if billing params provided
      if (billing) {
        try {
          const result = await deductCreditsForLlmCall({
            userId: billing.userId,
            model: "claude-sonnet-4-6",
            usage: {
              input_tokens: totalInputUncachedTokens,
              output_tokens: totalOutputTokens,
              cache_creation_input_tokens: totalCacheWriteTokens,
              cache_read_input_tokens: totalInputCachedTokens,
            },
            actionType: billing.actionType,
            reference: billing.reference,
          });
          costUsd = result.costCents / 100;
        } catch (billingError) {
          console.error("[AgentRunner] Failed to deduct credits:", billingError);
        }
      }

      sse.send("done", { costUsd });
      sse.close();
    }

    return { costUsd };
  }
}

export const agentRunner = new AgentRunnerService();
