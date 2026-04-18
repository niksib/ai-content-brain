export interface CanonicalKeyDefinition {
  key: string;
  title: string;
  description: string;
}

export const CANONICAL_KEYS = [
  {
    key: "niche",
    title: "Niche",
    description: "User's primary content domain.",
  },
  {
    key: "creator_angle",
    title: "Creator Angle",
    description:
      "The durable role and lens the user takes in their niche, independent of any specific subject they are working on right now.",
  },
  {
    key: "audience",
    title: "Audience",
    description: "Who the user writes for: role, seniority, interests.",
  },
  {
    key: "content_pillars",
    title: "Content Pillars",
    description: "3-7 recurring themes the user writes about.",
  },
  {
    key: "voice_tone",
    title: "Voice & Tone",
    description: "How the user sounds in writing: style, register, signature moves.",
  },
  {
    key: "goal",
    title: "Content Goal",
    description: "Why the user creates content: growth, hiring, leads, brand.",
  },
  {
    key: "anti_patterns",
    title: "Anti-patterns",
    description:
      "Post styles and content shapes the user avoids in their own content. Not their opinions about the world, not reactions to other creators.",
  },
  {
    key: "current_projects",
    title: "Current Projects",
    description:
      "Named products, services, studios, courses, or initiatives the user is actively building or running. Just the fact of what they work on and what it is, not roadmap stages.",
  },
  {
    key: "content_formats",
    title: "Content Formats",
    description: "Preferred post types: threads, single posts, dev logs, carousels.",
  },
  {
    key: "onboarding_transcript",
    title: "Onboarding Transcript",
    description: "Raw voice/text capture from onboarding (read-only reference).",
  },
] as const satisfies readonly CanonicalKeyDefinition[];

export type CanonicalMemoryKey = (typeof CANONICAL_KEYS)[number]["key"];

const CANONICAL_KEY_SET = new Set<string>(CANONICAL_KEYS.map((entry) => entry.key));

export function isCanonicalKey(key: string): key is CanonicalMemoryKey {
  return CANONICAL_KEY_SET.has(key);
}

export function getCanonicalKey(key: string): CanonicalKeyDefinition | undefined {
  return CANONICAL_KEYS.find((entry) => entry.key === key);
}
