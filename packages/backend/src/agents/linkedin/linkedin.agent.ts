import { BaseAgent, PlatformAgent, type AgentToolSet, type AgentToolOptions } from "../base.agent.js";
import { buildCreatorProfile, formatCreatorProfileForPrompt } from "../adapters/profile-from-memory.js";
import { formatStrategistHints } from "../adapters/idea-hints.js";
import { saveProducedContentTool, makeSaveProducedContent } from "../../tools/content.js";
import type { ContentIdea } from "../../generated/prisma/client.js";

const LANGUAGE_RULE = `**CRITICAL — Content Language**: Write the post in the same language the idea is written in (look at the angle and description above). If the idea is in Russian, write in Russian. If English, English. Never mix languages within a post.`;

export class LinkedInAgent extends PlatformAgent {
  private constructor(userId: string, private readonly idea: ContentIdea) {
    super("linkedin", userId, {
      skills: [
        "hook-formulas",
        "linkedin-post-structures",
        "tone-of-voice-matching",
        "anti-ai-writing",
        "cta-patterns",
      ],
    });
  }

  static async create(userId: string, idea: ContentIdea): Promise<LinkedInAgent> {
    return BaseAgent.initialize(new LinkedInAgent(userId, idea));
  }

  protected async loadContext(): Promise<string> {
    const profile = await buildCreatorProfile(this.userId);
    return `## Creator Profile\n${formatCreatorProfileForPrompt(profile)}`;
  }

  buildProductionPrompt(): string {
    return `Produce a LinkedIn text post based on this approved content idea.

**Angle:** ${this.idea.angle}

**Description:** ${this.idea.description}

${formatStrategistHints(this.idea)}

The Creator Profile is already loaded in your system prompt — use it to match the creator's tone, niche, and audience.

${LANGUAGE_RULE}

Write the ready-to-post text. Apply skills: hook-formulas for the opening line, linkedin-post-structures for structure, tone-of-voice-matching to write as the creator, anti-ai-writing to sound human, cta-patterns for the closing.

**Before calling save_produced_content, score your draft on each criterion (1–10):**
1. Hook — Does the first line stop the scroll? Is it specific and human, not a generic statement?
2. Tone match — Does it sound like this creator's voice, not polished corporate LinkedIn speak?
3. Anti-AI — Zero filler phrases ("I'm thrilled", "in today's landscape", "it's no secret", "leverage")?
4. Structure — Does the post breathe? Short paragraphs, natural line breaks, easy to scan?
5. CTA — Does it invite a specific conversation, not just "like and share"?

If any score is below 8 — rewrite that part before saving. Do not save a draft you would score below 8 on any criterion.

When done, call save_produced_content with:
- contentIdeaId: "${this.idea.id}" (always use this exact value)
- userId: the CURRENT USER ID from your system prompt
- platform: "linkedin"
- format: "text_post"
- body: JSON string containing { "text": "...", "hashtags": ["tag1", "tag2"] }`;
  }

  getTools(options?: AgentToolOptions): AgentToolSet {
    return {
      definitions: [saveProducedContentTool],
      executors: {
        save_produced_content: makeSaveProducedContent(options?.onContentSaved),
      },
    };
  }
}
