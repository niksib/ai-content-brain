import { BaseAgent, PlatformAgent, type AgentToolSet, type AgentToolOptions } from "../base.agent.js";
import { executeGetCreatorProfile } from "../../tools/creator-profile.js";
import { saveProducedContentTool, makeSaveProducedContent } from "../../tools/content.js";
import type { ContentIdea } from "../../generated/prisma/client.js";

const LANGUAGE_RULE = `**CRITICAL — Content Language**: Write the content strictly in the language specified as \`contentLanguage\` in the Creator Profile. The language of this prompt does not matter — the content language does. Do not mix languages.`;

const SELF_CRITIQUE = `**Before calling save_produced_content, score your draft on each criterion (1–10):**
1. Hook — Does the first line trigger reply intent without asking a question? Is it a strong opinion or specific observation?
2. Tone match — Does it sound exactly like this creator, not like a generic AI post?
3. Anti-AI — Zero clichés ("game-changer", "dive into", "let's explore", "I'm excited to share")?
4. CTA — Is the closing a reply invitation (not a follow ask or external link)?

If any score is below 8 — rewrite that part before saving. Do not save a draft you would score below 8 on any criterion.`;

export class ThreadsAgent extends PlatformAgent {
  private constructor(userId: string, private readonly idea: ContentIdea) {
    super("threads", userId, {
      skills: [
        "hook-formulas",
        "threads-post-structures",
        "tone-of-voice-matching",
        "anti-ai-writing",
        "cta-patterns",
      ],
    });
  }

  static async create(userId: string, idea: ContentIdea): Promise<ThreadsAgent> {
    return BaseAgent.initialize(new ThreadsAgent(userId, idea));
  }

  protected async loadContext(): Promise<string> {
    const profile = await executeGetCreatorProfile({ userId: this.userId });
    return `## Creator Profile\n${profile}`;
  }

  buildProductionPrompt(): string {
    const format = this.idea.format;

    if (format === "text_with_image") {
      return `Produce a Threads post (text + single image) based on this approved content idea.

**Angle:** ${this.idea.angle}

**Description:** ${this.idea.description}

The Creator Profile is already loaded in your system prompt — use it to match the creator's tone, niche, and audience.

${LANGUAGE_RULE}

Write the ready-to-post text AND a clear image brief. Apply skills: hook-formulas for the opening line, threads-post-structures for structure, tone-of-voice-matching to write as the creator, anti-ai-writing to sound human, cta-patterns for the closing.

The image must add information the text cannot convey — proof, result, context, or visual surprise. Not decoration.

${SELF_CRITIQUE}

When done, call save_produced_content with:
- contentIdeaId: "${this.idea.id}" (always use this exact value)
- userId: the CURRENT USER ID from your system prompt
- platform: "threads"
- format: "text_with_image"
- body: JSON string containing { "text": "...", "imageBrief": "Clear description of what the image should show and why it supports the post" }`;
    }

    if (format === "image_series") {
      return `Produce a Threads image series post based on this approved content idea.

**Angle:** ${this.idea.angle}

**Description:** ${this.idea.description}

The Creator Profile is already loaded in your system prompt — use it to match the creator's tone, niche, and audience.

${LANGUAGE_RULE}

Write a hook caption AND image briefs for each slide (3–6 images). Apply skills: hook-formulas for the caption opening, threads-post-structures for narrative arc across images, tone-of-voice-matching to write as the creator, anti-ai-writing to sound human, cta-patterns for the closing.

Each image must add a new piece of information — not repeat what the previous one showed. The caption sets up the story, the images deliver it.

${SELF_CRITIQUE}

When done, call save_produced_content with:
- contentIdeaId: "${this.idea.id}" (always use this exact value)
- userId: the CURRENT USER ID from your system prompt
- platform: "threads"
- format: "image_series"
- body: JSON string containing { "caption": "...", "images": [{"imageNumber": 1, "brief": "What this image should show and why", "textOverlay": "Optional short text on the image"}] }`;
    }

    // Default: text_post
    return `Produce a Threads text post based on this approved content idea.

**Angle:** ${this.idea.angle}

**Description:** ${this.idea.description}

The Creator Profile is already loaded in your system prompt — use it to match the creator's tone, niche, and audience.

${LANGUAGE_RULE}

Write the ready-to-post text. Apply skills: hook-formulas for the opening line, threads-post-structures for structure, tone-of-voice-matching to write as the creator, anti-ai-writing to sound human, cta-patterns for the closing.

**CHARACTER LIMIT — read carefully:**
Each Threads post is limited to 500 characters (spaces, newlines, and all punctuation count).

After drafting, count the characters in your post:
- ≤ 500 chars → single post. Save as { "text": "..." }
- > 500 chars → split into a thread of 2–5 posts. Split at a **natural narrative break**, not at character 500. Each non-final post must end on an open loop that pulls the reader to the next. The final post delivers the resolution and/or a question. Save as { "posts": ["post 1 text", "post 2 text", ...] }

Never truncate mid-thought. Never number posts ("1/3"). Never exceed 500 chars in any single post.

${SELF_CRITIQUE}

When done, call save_produced_content with:
- contentIdeaId: "${this.idea.id}" (always use this exact value)
- userId: the CURRENT USER ID from your system prompt
- platform: "threads"
- format: "text_post"
- body: JSON string — either { "text": "..." } for a single post OR { "posts": ["...", "..."] } for a thread`;
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
