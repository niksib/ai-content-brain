import { useApiClient } from '~/services/api';

export type OnboardingStep =
  | 'connect'
  | 'analyzing'
  | 'questions'
  | 'summary'
  | 'done';

export interface OnboardingQuestion {
  key: string;
  prompt: string;
  options: string[];
  bubbleContext?: string;
}

export interface QuestionAnswer {
  selected: string[];
  text: string;
}

export interface AnalysisBlock {
  key: string;
  content: string;
}

export interface ThreadsAnalysis {
  source: 'threads' | 'fallback';
  postsAnalyzed: number;
  blocks: AnalysisBlock[];
  toneExamples: string[];
}

export interface OnboardingSession {
  id: string;
  currentStep: OnboardingStep;
  threadsAnalysis: ThreadsAnalysis | null;
  generatedQuestions: OnboardingQuestion[] | null;
  answers: Record<string, QuestionAnswer> | null;
  summary: string | null;
  clarification: string | null;
  completedAt: string | null;
}

interface SessionResponse {
  session: OnboardingSession | null;
}

export function useOnboardingService() {
  const apiClient = useApiClient();

  return {
    async getSession(): Promise<OnboardingSession | null> {
      const result = await apiClient.get<SessionResponse>('/api/onboarding/session');
      return result.session;
    },
    async start(): Promise<OnboardingSession> {
      const { session } = await apiClient.post<{ session: OnboardingSession }>(
        '/api/onboarding/session/start',
      );
      return session;
    },
    async runAnalysis(): Promise<OnboardingSession> {
      const { session } = await apiClient.post<{ session: OnboardingSession }>(
        '/api/onboarding/session/analyze',
      );
      return session;
    },
    async runFallback(): Promise<OnboardingSession> {
      const { session } = await apiClient.post<{ session: OnboardingSession }>(
        '/api/onboarding/session/analyze/fallback',
      );
      return session;
    },
    async saveAnswer(
      questionKey: string,
      answer: QuestionAnswer,
    ): Promise<OnboardingSession> {
      const { session } = await apiClient.post<{ session: OnboardingSession }>(
        '/api/onboarding/session/answer',
        { questionKey, ...answer },
      );
      return session;
    },
    async generateSummary(): Promise<OnboardingSession> {
      const { session } = await apiClient.post<{ session: OnboardingSession }>(
        '/api/onboarding/session/summary',
      );
      return session;
    },
    async clarifySummary(clarification: string): Promise<OnboardingSession> {
      const { session } = await apiClient.post<{ session: OnboardingSession }>(
        '/api/onboarding/session/clarify',
        { clarification },
      );
      return session;
    },
    async complete(): Promise<OnboardingSession> {
      const { session } = await apiClient.post<{ session: OnboardingSession }>(
        '/api/onboarding/session/complete',
      );
      return session;
    },
  };
}
