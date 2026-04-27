import { BaseAgent, PlatformAgent, type AgentToolSet, type AgentToolOptions } from "../base.agent.js";
import { buildCreatorProfile, formatCreatorProfileForPrompt } from "../adapters/profile-from-memory.js";
import { formatStrategistHints } from "../adapters/idea-hints.js";
import { saveProducedContentTool, makeSaveProducedContent } from "../../tools/content.js";
import type { ContentIdea } from "../../generated/prisma/client.js";

const LANGUAGE_RULE = `**CRITICAL — Content Language**: Write the script in the same language the idea is written in (look at the angle and description above). If the idea is in Russian, write in Russian. If English, English. Never mix languages within a script.`;

export class VideoAgent extends PlatformAgent {
  private constructor(userId: string, private readonly idea: ContentIdea) {
    super("video", userId, {
      skills: [
        "hook-formulas",
        "tiktok-script-structures",
        "tone-of-voice-matching",
        "anti-ai-writing",
        "cta-patterns",
      ],
    });
  }

  static async create(userId: string, idea: ContentIdea): Promise<VideoAgent> {
    return BaseAgent.initialize(new VideoAgent(userId, idea));
  }

  protected async loadContext(): Promise<string> {
    const profile = await buildCreatorProfile(this.userId);
    return `## Creator Profile\n${formatCreatorProfileForPrompt(profile)}`;
  }

  buildProductionPrompt(): string {
    const platformLabel =
      this.idea.platform === "tiktok" ? "TikTok" : "Instagram Reels";

    return `Produce a ${platformLabel} video script based on this approved content idea.

**Angle:** ${this.idea.angle}

**Description:** ${this.idea.description}

${formatStrategistHints(this.idea)}

The Creator Profile is already loaded in your system prompt — use it to match the creator's tone, niche, and audience.

${LANGUAGE_RULE}

Write a full video script with shooting brief. Apply skills: hook-formulas for the opening seconds, tiktok-script-structures for pacing and structure, tone-of-voice-matching to write as the creator, anti-ai-writing to sound human, cta-patterns for the ending.

**Before calling save_produced_content, score your draft on each criterion (1–10):**
1. Hook (0:00–0:03) — Does the very first line create instant curiosity or make a bold claim? Would someone stop scrolling?
2. Spoken rhythm — Read it aloud mentally. Does it sound like a real person talking, not a script being read?
3. Tone match — Does the delivery style match this creator's energy and vocabulary?
4. Anti-AI — No stiff transitions, no "in conclusion", no overly structured "point 1, point 2, point 3" feel?
5. Pacing — Are there natural pauses, punchy moments, and a clear peak before the CTA?

If any score is below 8 — rewrite that part before saving. Do not save a draft you would score below 8 on any criterion.

When done, call save_produced_content with:
- contentIdeaId: "${this.idea.id}" (always use this exact value)
- userId: the CURRENT USER ID from your system prompt
- platform: "${this.idea.platform}"
- format: "video_script"
- body: JSON string containing { "script": [{"timestamp": "0:00", "text": "..."}], "shootingBrief": "...", "deliveryNotes": "...", "caption": "...", "hashtags": ["tag1"] }`;
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
