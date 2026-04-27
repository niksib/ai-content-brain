import type { ContentIdea } from "../../generated/prisma/client.js";

/**
 * Formats strategist-supplied hints (sourceQuote, doNot) for injection into
 * the platform agent's production prompt. Returns an empty string when both
 * fields are empty so callers can drop the section entirely.
 */
export function formatStrategistHints(idea: Pick<ContentIdea, "sourceQuote" | "doNot">): string {
  const sections: string[] = [];

  const quote = idea.sourceQuote?.trim() ?? "";
  if (quote.length > 0) {
    sections.push(
      `**User's exact words (preserve this voice — do not paraphrase away the specifics):**\n"${quote}"`,
    );
  }

  const doNot = (idea.doNot ?? []).map((item) => item.trim()).filter((item) => item.length > 0);
  if (doNot.length > 0) {
    const bulletList = doNot.map((item) => `- ${item}`).join("\n");
    sections.push(
      `**Do NOT (strategist hints — these are hard constraints, not suggestions):**\n${bulletList}`,
    );
  }

  return sections.join("\n\n");
}
