export interface OnboardingQuestion {
  key: string;
  prompt: string;
  chips: string[];
}

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    key: 'goal',
    prompt:
      "I see you're building an AI product and writing about development. What's the main goal of your content right now?",
    chips: [
      'Grow an audience before launch',
      'Get beta users & early feedback',
      'Build authority in AI tooling',
      'Document the journey publicly',
    ],
  },
  {
    key: 'audience',
    prompt:
      "Who specifically are you writing for? Picture one real person who'd stop scrolling.",
    chips: [
      'Indie devs shipping side projects',
      'Founders pre-PMF',
      'AI engineers at startups',
      'Product managers exploring AI',
    ],
  },
  {
    key: 'voice_tone',
    prompt:
      'When people describe your tone, what lands closest? Pick any that fit.',
    chips: [
      'Direct & technical',
      'Warm with dry humor',
      'Blunt but encouraging',
      'Playful & irreverent',
      'Calm & methodical',
    ],
  },
  {
    key: 'current_focus',
    prompt:
      "One last thing, what's the one topic you want to own this quarter?",
    chips: [
      'Shipping fast as a solo dev',
      'LLM agent architecture',
      'Design for AI products',
      'Founder-led growth',
    ],
  },
];
