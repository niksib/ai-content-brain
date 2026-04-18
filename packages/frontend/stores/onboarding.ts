import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  useOnboardingService,
  type OnboardingSession,
  type OnboardingQuestion,
  type QuestionAnswer,
  type OnboardingStep,
} from '~/services/onboarding';

export const useOnboardingStore = defineStore('onboarding', () => {
  const service = useOnboardingService();

  const session = ref<OnboardingSession | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const step = computed<OnboardingStep>(() => session.value?.currentStep ?? 'connect');
  const questions = computed<OnboardingQuestion[]>(
    () => session.value?.generatedQuestions ?? [],
  );
  const answers = computed<Record<string, QuestionAnswer>>(
    () => session.value?.answers ?? {},
  );
  const summaryText = computed<string>(() => session.value?.summary ?? '');
  const alreadyRefined = computed(() => Boolean(session.value?.clarification));
  const isComplete = computed(() => Boolean(session.value?.completedAt));

  function setError(caughtError: unknown): void {
    const apiError = caughtError as { data?: { error?: string }; message?: string };
    error.value = apiError?.data?.error ?? apiError?.message ?? 'Something went wrong.';
  }

  async function ensureSession(): Promise<void> {
    if (session.value) return;
    loading.value = true;
    try {
      const existing = await service.getSession();
      session.value = existing ?? (await service.start());
    } catch (caughtError) {
      setError(caughtError);
    } finally {
      loading.value = false;
    }
  }

  async function refreshSession(): Promise<void> {
    try {
      const latest = await service.getSession();
      if (latest) session.value = latest;
    } catch (caughtError) {
      setError(caughtError);
    }
  }

  async function runAnalysis(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      session.value = await service.runAnalysis();
    } catch (caughtError) {
      setError(caughtError);
    } finally {
      loading.value = false;
    }
  }

  async function runFallback(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      session.value = await service.runFallback();
    } catch (caughtError) {
      setError(caughtError);
    } finally {
      loading.value = false;
    }
  }

  async function answerQuestion(
    questionKey: string,
    answer: QuestionAnswer,
  ): Promise<void> {
    try {
      session.value = await service.saveAnswer(questionKey, answer);
    } catch (caughtError) {
      setError(caughtError);
    }
  }

  async function generateSummary(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      session.value = await service.generateSummary();
    } catch (caughtError) {
      setError(caughtError);
    } finally {
      loading.value = false;
    }
  }

  async function clarifySummary(clarification: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      session.value = await service.clarifySummary(clarification);
    } catch (caughtError) {
      setError(caughtError);
    } finally {
      loading.value = false;
    }
  }

  async function completeOnboarding(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      session.value = await service.complete();
    } catch (caughtError) {
      setError(caughtError);
    } finally {
      loading.value = false;
    }
  }

  function reset(): void {
    session.value = null;
    error.value = null;
    loading.value = false;
  }

  return {
    session,
    loading,
    error,
    step,
    questions,
    answers,
    summaryText,
    alreadyRefined,
    isComplete,
    ensureSession,
    refreshSession,
    runAnalysis,
    runFallback,
    answerQuestion,
    generateSummary,
    clarifySummary,
    completeOnboarding,
    reset,
  };
});
