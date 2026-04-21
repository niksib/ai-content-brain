import path from "path";
import fs from "fs";
import type Anthropic from "@anthropic-ai/sdk";
import type { ContentIdea } from "../generated/prisma/client.js";

// Agents live alongside this file: src/agents/{agentName}/
const agentsBasePath = import.meta.dirname;

type ToolExecutor = (input: Record<string, unknown>) => Promise<string>;

export interface AgentToolSet {
  definitions: Anthropic.Tool[];
  executors: Record<string, ToolExecutor>;
}

export interface AgentToolOptions {
  onIdeaSaved?: (idea: ContentIdea) => void;
  onIdeaUpdating?: (ideaId: string) => void;
  onIdeaUpdated?: (idea: ContentIdea) => void;
  onContentSaved?: (contentIdeaId: string) => Promise<void> | void;
}

interface AgentOptions {
  chatSessionId?: string;
  skills?: string[];
}

export abstract class BaseAgent {
  /** Static part: contextLines + CLAUDE.md + skills — never changes, safe to cache. */
  readonly staticSystemPrompt: string;
  /** Dynamic part: session context loaded async (e.g. memory map, current ideas). */
  dynamicSystemPrompt: string = "";

  /** Full combined prompt — kept for backward-compat (e.g. onboarding service). */
  get systemPrompt(): string {
    return this.dynamicSystemPrompt
      ? `${this.staticSystemPrompt}\n\n${this.dynamicSystemPrompt}`
      : this.staticSystemPrompt;
  }

  protected readonly userId: string;

  protected constructor(agentName: string, userId: string, options: AgentOptions = {}) {
    this.userId = userId;

    const { chatSessionId, skills = [] } = options;
    const agentDir = path.join(agentsBasePath, agentName);

    const contextLines = [
      `CURRENT USER ID: ${userId}`,
      chatSessionId ? `CURRENT SESSION ID: ${chatSessionId}` : "",
      `Always use these IDs when calling tools — never ask the user for them.`,
    ]
      .filter(Boolean)
      .join("\n");

    const claudeMd = readFile(path.join(agentDir, ".claude", "CLAUDE.md"));
    const skillsBlock = readSkills(agentDir, skills);

    this.staticSystemPrompt = [contextLines, claudeMd, skillsBlock].filter(Boolean).join("\n\n");
  }

  // Override in subclasses that need async data before first run (e.g. session context, user state)
  protected async loadContext(): Promise<string> {
    return "";
  }

  // Call after construction — loads async context into dynamicSystemPrompt
  protected static async initialize<T extends BaseAgent>(agent: T): Promise<T> {
    agent.dynamicSystemPrompt = await agent.loadContext();
    return agent;
  }

  abstract getTools(options?: AgentToolOptions): AgentToolSet;
}

// Extended base for agents that produce content from an approved idea
export abstract class PlatformAgent extends BaseAgent {
  abstract buildProductionPrompt(): string;
}

function readFile(filePath: string): string {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "";
}

function readSkills(agentDir: string, skills: string[]): string {
  if (skills.length === 0) return "";

  const skillsDir = path.join(agentDir, ".claude", "skills");
  const loaded = skills
    .map((skillName) => {
      const skillPath = path.join(skillsDir, skillName, "SKILL.md");
      return readFile(skillPath);
    })
    .filter(Boolean);

  return loaded.length > 0 ? `## Skills\n\n${loaded.join("\n\n---\n\n")}` : "";
}
