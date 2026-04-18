import type Anthropic from "@anthropic-ai/sdk";
import { memoryService } from "../../services/memory.service.js";

export const readMemoryTool: Anthropic.Tool = {
  name: "read_memory",
  description:
    "Read full content of one or more memory blocks for the current user. Use the keys listed in the Memory Map section of the system prompt. Prefer reading only the keys relevant to the user's request.",
  input_schema: {
    type: "object",
    properties: {
      keys: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        description: "List of memory block keys to read (from the Memory Map).",
      },
    },
    required: ["keys"],
  },
};

export function makeReadMemory(userId: string) {
  return async (input: Record<string, unknown>): Promise<string> => {
    const keys = Array.isArray(input.keys) ? (input.keys as string[]) : [];
    if (keys.length === 0) {
      return JSON.stringify({ error: "keys must be a non-empty array" });
    }
    const blocks = await memoryService.readMemory(userId, keys);
    return JSON.stringify({ blocks });
  };
}
