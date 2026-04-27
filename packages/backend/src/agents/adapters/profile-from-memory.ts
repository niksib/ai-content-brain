import { memoryService } from "../../services/memory.service.js";

export interface CreatorProfile {
  niche: string;
  audienceDescription: string;
  toneOfVoice: string;
  goals: string[];
  contentPillars: string[];
  contentFormats: string[];
  currentProjects: string;
  antiPatterns: string;
}

const EMPTY_PROFILE: CreatorProfile = {
  niche: "",
  audienceDescription: "",
  toneOfVoice: "",
  goals: [],
  contentPillars: [],
  contentFormats: [],
  currentProjects: "",
  antiPatterns: "",
};

function splitBulletList(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^[-*•]\s+/, "").trim())
    .filter((line) => line.length > 0);
}

export async function buildCreatorProfile(userId: string): Promise<CreatorProfile> {
  const blocks = await memoryService.getAllBlocks(userId);
  if (blocks.length === 0) return EMPTY_PROFILE;

  const map = new Map(blocks.map((block) => [block.key, block.content]));
  const goal = map.get("goal")?.trim() ?? "";
  const pillars = splitBulletList(map.get("content_pillars") ?? "");

  return {
    niche: map.get("niche")?.trim() ?? "",
    audienceDescription: map.get("audience")?.trim() ?? "",
    toneOfVoice: map.get("voice_tone")?.trim() ?? "",
    goals: goal ? [goal] : [],
    contentPillars: pillars,
    contentFormats: splitBulletList(map.get("content_formats") ?? ""),
    currentProjects: map.get("current_projects")?.trim() ?? "",
    antiPatterns: map.get("anti_patterns")?.trim() ?? "",
  };
}

export function formatCreatorProfileForPrompt(profile: CreatorProfile): string {
  if (!profile.niche && !profile.audienceDescription) {
    return "(no creator profile yet — onboarding may be incomplete)";
  }
  const lines: string[] = [];
  if (profile.niche) lines.push(`Niche: ${profile.niche}`);
  if (profile.audienceDescription) lines.push(`Audience: ${profile.audienceDescription}`);
  if (profile.toneOfVoice) lines.push(`Voice & Tone: ${profile.toneOfVoice}`);
  if (profile.goals.length > 0) lines.push(`Goal: ${profile.goals.join(", ")}`);
  if (profile.contentPillars.length > 0) {
    lines.push("Content Pillars:");
    profile.contentPillars.forEach((pillar) => lines.push(`- ${pillar}`));
  }
  if (profile.contentFormats.length > 0) {
    lines.push("Content Formats:");
    profile.contentFormats.forEach((format) => lines.push(`- ${format}`));
  }
  if (profile.currentProjects) lines.push(`Current Projects: ${profile.currentProjects}`);
  if (profile.antiPatterns) lines.push(`Anti-patterns: ${profile.antiPatterns}`);
  return lines.join("\n");
}
