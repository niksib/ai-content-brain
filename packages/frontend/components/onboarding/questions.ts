export interface OnboardingQuestion {
  key: string;
  prompt: string;
  options: string[];
  bubbleContext?: string;
}
