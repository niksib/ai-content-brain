import { BaseAgent, PlatformAgent, type AgentToolSet, type AgentToolOptions } from "../base.agent.js";
import { buildLegacyProfile, formatLegacyProfileForPrompt } from "../adapters/profile-from-memory.js";
import { saveProducedContentTool, makeSaveProducedContent } from "../../tools/content.js";
import type { ContentIdea } from "../../generated/prisma/client.js";

const LANGUAGE_RULE = `**CRITICAL — Content Language**: Write the content strictly in the language specified as \`contentLanguage\` in the Creator Profile. The language of this prompt does not matter — the content language does. Do not mix languages.`;

const SELF_CRITIQUE = `**Internal quality check before saving (do not output this — think it silently):**
- Hook: does the first line create tension or state something specific without asking a question?
- Tone: does it sound like this specific creator, not generic AI?
- Anti-AI: zero clichés ("game-changer", "dive into", "let's explore", "I'm excited to share")?
- Ending: does the post END on a statement, observation, or consequence — NOT a question, not "What do you think?", not a follow CTA? The writing itself should make people want to reply, not a prompt asking them to.

If any check fails — rewrite that part silently. Then call save_produced_content immediately with no additional output.`;

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
    const profile = await buildLegacyProfile(this.userId);
    return `## Creator Profile\n${formatLegacyProfileForPrompt(profile)}`;
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

**IMAGE SUGGESTION — always include:**
Posts with a photo get 60% higher engagement on Threads. After writing the text, decide what visual would make this post land harder — and include an imageSuggestion in the body.

Choose the type that fits the post:
- **real_photo** — an authentic photo the creator should take or already has: workspace, product in hand, a real moment, a person, an event
- **screenshot** — a screen capture: product UI, analytics dashboard, a result, a conversation, an app screen
- **illustration** — an AI-generated image or designed graphic: abstract concepts, metaphors, visual comparisons that don't exist in real life
- **collage** — multiple images combined: brand logos side by side, before/after, a grid of examples

The brief must be specific and actionable — not "add a relevant photo", but exactly what to shoot or create and why it supports the post:
- Bad: "A photo related to the post topic"
- Good: "Real photo of your desk setup with your laptop and coffee — shows the authentic work-from-home context the post is about"
- Good: "Screenshot of your product's onboarding screen — the reader just read a claim about it, now show them proof"
- Good: "Collage of Apple and Google logos side by side — the post is literally comparing them, make it visual"

${SELF_CRITIQUE}

When done, call save_produced_content with:
- contentIdeaId: "${this.idea.id}" (always use this exact value)
- userId: the CURRENT USER ID from your system prompt
- platform: "threads"
- format: "text_post"
- body: JSON string — either { "text": "..." } for a single post OR { "posts": ["...", "..."] } for a thread
- imageSuggestion: { "type": "real_photo|screenshot|illustration|collage", "brief": "..." } — pass as a separate parameter, never inside body`;
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
