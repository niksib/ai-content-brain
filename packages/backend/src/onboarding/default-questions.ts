import type { CanonicalMemoryKey } from "../memory/canonical-keys.js";

export interface OnboardingQuestion {
  key: CanonicalMemoryKey;
  prompt: string;
  options: string[];
  bubbleContext?: string;
}

export const ANTI_PATTERNS_QUESTION: OnboardingQuestion = {
  key: "anti_patterns",
  bubbleContext:
    "Last one. This helps me stay away from things you do not want to post.",
  prompt:
    "What do you avoid in your own posts? Pick anything that fits, or add your own.",
  options: [
    "Empty hype",
    "Motivational quotes",
    "Follow for more bait",
    "Marketing language",
    "Long lists of fluff",
    "Angry hot takes",
  ],
};

export const DEFAULT_QUESTIONS: OnboardingQuestion[] = [
  {
    key: "niche",
    prompt: "What do you mostly write about? Pick anything that fits, then add your own.",
    options: [
      "Tech and software",
      "Business and entrepreneurship",
      "Personal finance",
      "Health and fitness",
      "Lifestyle and personal brand",
      "Education and coaching",
      "Marketing and social media",
      "Creative work",
    ],
  },
  {
    key: "goal",
    prompt: "What is the main reason you post?",
    options: [
      "Build an audience and grow followers",
      "Get clients or customers",
      "Build authority in my niche",
      "Document my journey and share my story",
    ],
  },
  {
    key: "audience",
    prompt: "Who do you write for? Picture one specific person.",
    options: [
      "Indie devs and solo founders",
      "Marketers and creators",
      "Knowledge workers and managers",
      "Students and early career professionals",
    ],
  },
  ANTI_PATTERNS_QUESTION,
];
