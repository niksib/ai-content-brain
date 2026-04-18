import { memoryService } from "../../services/memory.service.js";

export interface LegacyCreatorProfile {
  niche: string;
  topics: string[];
  audienceDescription: string;
  audiencePainPoints: string;
  toneOfVoice: string;
  toneExamples: string[];
  goals: string[];
  rawNotes: string;
  contentLanguage: string;
  contentPillars: string[];
  contentFormats: string[];
  currentProjects: string;
  antiPatterns: string;
}

const EMPTY_PROFILE: LegacyCreatorProfile = {
  niche: "",
  topics: [],
  audienceDescription: "",
  audiencePainPoints: "",
  toneOfVoice: "",
  toneExamples: [],
  goals: [],
  rawNotes: "",
  contentLanguage: "English",
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

export async function buildLegacyProfile(userId: string): Promise<LegacyCreatorProfile> {
  const blocks = await memoryService.getAllBlocks(userId);
  if (blocks.length === 0) return EMPTY_PROFILE;

  const map = new Map(blocks.map((block) => [block.key, block.content]));
  const niche = map.get("niche")?.trim() ?? "";
  const audienceDescription = map.get("audience")?.trim() ?? "";
  const voiceTone = map.get("voice_tone")?.trim() ?? "";
  const goal = map.get("goal")?.trim() ?? "";
  const pillars = splitBulletList(map.get("content_pillars") ?? "");
  const formats = splitBulletList(map.get("content_formats") ?? "");
  const transcript = map.get("onboarding_transcript")?.trim() ?? "";
  const currentProjects = map.get("current_projects")?.trim() ?? "";
  const antiPatterns = map.get("anti_patterns")?.trim() ?? "";

  return {
    niche,
    topics: pillars,
    audienceDescription,
    audiencePainPoints: "",
    toneOfVoice: voiceTone,
    toneExamples: [],
    goals: goal ? [goal] : [],
    rawNotes: transcript,
    contentLanguage: "English",
    contentPillars: pillars,
    contentFormats: formats,
    currentProjects,
    antiPatterns,
  };
}

export function formatLegacyProfileForPrompt(profile: LegacyCreatorProfile): string {
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
