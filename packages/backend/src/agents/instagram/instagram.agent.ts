import { BaseAgent, PlatformAgent, type AgentToolSet, type AgentToolOptions } from "../base.agent.js";
import { buildLegacyProfile, formatLegacyProfileForPrompt } from "../adapters/profile-from-memory.js";
import { saveProducedContentTool, makeSaveProducedContent } from "../../tools/content.js";
import type { ContentIdea } from "../../generated/prisma/client.js";

export class InstagramAgent extends PlatformAgent {
  private constructor(userId: string, private readonly idea: ContentIdea) {
    super("instagram", userId, {
      skills: [
        "hook-formulas",
        "instagram-carousel-structures",
        "instagram-stories",
        "tone-of-voice-matching",
        "anti-ai-writing",
        "cta-patterns",
      ],
    });
  }

  static async create(userId: string, idea: ContentIdea): Promise<InstagramAgent> {
    return BaseAgent.initialize(new InstagramAgent(userId, idea));
  }

  protected async loadContext(): Promise<string> {
    const profile = await buildLegacyProfile(this.userId);
    return `## Creator Profile\n${formatLegacyProfileForPrompt(profile)}`;
  }

  buildProductionPrompt(): string {
    if (this.idea.format === "carousel") {
      return `Produce an Instagram carousel based on this approved content idea.

**Angle:** ${this.idea.angle}

**Description:** ${this.idea.description}

The Creator Profile is already loaded in your system prompt — use it to match the creator's tone, niche, and audience.

**CRITICAL — Content Language**: Write the content strictly in the language specified as \`contentLanguage\` in the Creator Profile. The language of this prompt does not matter — the content language does. Do not mix languages.

Write carousel slide content. Apply skills: hook-formulas for slide 1, instagram-carousel-structures for flow and structure, tone-of-voice-matching to write as the creator, anti-ai-writing to sound human, cta-patterns for the last slide.

**Before calling save_produced_content, score your draft on each criterion (1–10):**
1. Slide 1 hook — Does it make someone tap through immediately? Bold claim, intriguing visual direction?
2. Flow — Does each slide lead naturally into the next? Is there a clear narrative arc?
3. Tone match — Does the copy sound like this creator, not a generic brand account?
4. Anti-AI — No corporate-sounding slide headers, no "key takeaways", no stiff list formatting?
5. Last slide CTA — Is it a specific action (save, share, reply), not a vague "follow for more"?

If any score is below 8 — rewrite that part before saving. Do not save a draft you would score below 8 on any criterion.

When done, call save_produced_content with:
- contentIdeaId: "${this.idea.id}" (always use this exact value)
- userId: the CURRENT USER ID from your system prompt
- platform: "instagram"
- format: "carousel"
- body: JSON string containing { "slides": [{"slideNumber": 1, "text": "...", "designNotes": "..."}], "caption": "...", "hashtags": ["tag1"] }`;
    }

    return `Produce an Instagram Stories sequence based on this approved content idea.

**Angle:** ${this.idea.angle}

**Description:** ${this.idea.description}

The Creator Profile is already loaded in your system prompt — use it to match the creator's tone, niche, and audience.

**CRITICAL — Content Language**: Write the content strictly in the language specified as \`contentLanguage\` in the Creator Profile. The language of this prompt does not matter — the content language does. Do not mix languages.

Write an Instagram Stories sequence. Apply skills: hook-formulas for story 1, instagram-stories for sequence structure, tone-of-voice-matching to write as the creator, anti-ai-writing to sound human, cta-patterns for the final story.

**Before calling save_produced_content, score your draft on each criterion (1–10):**
1. Story 1 hook — Does the first story create instant curiosity that makes someone tap to the next?
2. Sequence flow — Does it build tension or interest progressively across stories?
3. Tone match — Does it feel personal and conversational, not like a brand campaign?
4. Anti-AI — No overly polished copy, no "swipe up to learn more" energy?
5. Interactive element — Is the CTA on the last story something people will actually engage with?

If any score is below 8 — rewrite that part before saving. Do not save a draft you would score below 8 on any criterion.

When done, call save_produced_content with:
- contentIdeaId: "${this.idea.id}" (always use this exact value)
- userId: the CURRENT USER ID from your system prompt
- platform: "instagram"
- format: "stories"
- body: JSON string containing { "stories": [{"storyNumber": 1, "textOverlay": "...", "background": "...", "interactiveElement": "..."}], "notes": "..." }`;
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
