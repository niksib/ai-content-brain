import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useApiClient } from '~/services/api';

interface OnboardingStatus {
  completed: boolean;
  profile: Record<string, unknown> | null;
}

export interface QuizData {
  platforms: string[];
  stage: string;
  topics: string[];
  topicOther: string;
  audience: string;
  goal: string;
  contentLanguage: string;
  toneStyles: string[];
  toneExample: string;
}

interface SubmitResult {
  status: 'complete' | 'needs_more';
  questions?: string[];
}

const emptyQuiz = (): QuizData => ({
  platforms: [],
  stage: '',
  topics: [],
  topicOther: '',
  audience: '',
  goal: '',
  contentLanguage: '',
  toneStyles: [],
  toneExample: '',
});

export const useOnboardingStore = defineStore('onboarding', () => {
  const apiClient = useApiClient();

  // 'quiz'       — user fills sections 0-5
  // 'processing' — waiting for agent
  // 'followup'   — agent asked follow-up questions
  // 'complete'   — profile saved, ready to redirect
  const phase = ref<'quiz' | 'processing' | 'followup' | 'complete'>('quiz');
  const quizSection = ref(0);          // 0-5
  const quiz = ref<QuizData>(emptyQuiz());
  const isComplete = ref(false);
  const error = ref<string | null>(null);

  // Follow-up state
  const followUpQuestions = ref<string[]>([]);
  const followUpIndex = ref(0);
  const followUpAnswers = ref<{ question: string; answer: string }[]>([]);

  // ── Computed ──────────────────────────────────────────
  const currentFollowUpQuestion = computed(
    () => followUpQuestions.value[followUpIndex.value] ?? ''
  );
  const isLastFollowUp = computed(
    () => followUpIndex.value === followUpQuestions.value.length - 1
  );

  const sectionValid = computed(() => {
    switch (quizSection.value) {
      case 0: return quiz.value.platforms.length > 0;
      case 1: return quiz.value.stage !== '';
      case 2:
        return (
          quiz.value.topics.length > 0 &&
          (!quiz.value.topics.includes('other') || quiz.value.topicOther.trim().length > 0)
        );
      case 3: return quiz.value.audience.trim().length >= 15;
      case 4: return quiz.value.goal !== '';
      case 5: return quiz.value.contentLanguage !== '';
      case 6:
        return quiz.value.toneStyles.length > 0 && quiz.value.toneExample.trim().length > 0;
      default: return false;
    }
  });

  // ── Actions ───────────────────────────────────────────
  async function checkStatus(): Promise<OnboardingStatus> {
    const status = await apiClient.get<OnboardingStatus>('/api/onboarding/status');
    isComplete.value = status.completed;
    return status;
  }

  function nextSection() {
    if (quizSection.value < 6) {
      quizSection.value++;
    } else {
      submitQuiz();
    }
  }

  function prevSection() {
    if (quizSection.value > 0) quizSection.value--;
  }

  async function submitQuiz() {
    phase.value = 'processing';
    error.value = null;

    try {
      const result = await apiClient.post<SubmitResult>('/api/onboarding/submit', {
        quiz: quiz.value,
        followUpAnswers: followUpAnswers.value.length ? followUpAnswers.value : undefined,
      });
      handleResult(result);
    } catch (err: unknown) {
      const apiError = err as { data?: { error?: string } };
      error.value = apiError?.data?.error ?? 'Something went wrong. Please try again.';
      phase.value = 'quiz';
    }
  }

  function handleResult(result: SubmitResult) {
    if (result.status === 'complete') {
      isComplete.value = true;
      phase.value = 'complete';
    } else if (result.status === 'needs_more' && result.questions?.length) {
      followUpQuestions.value = result.questions;
      followUpIndex.value = 0;
      phase.value = 'followup';
    } else {
      error.value = 'Unexpected response. Please try again.';
      phase.value = 'quiz';
    }
  }

  async function submitFollowUpAnswer(answer: string) {
    const question = followUpQuestions.value[followUpIndex.value];
    followUpAnswers.value.push({ question, answer });

    if (!isLastFollowUp.value) {
      followUpIndex.value++;
    } else {
      // All follow-ups answered — resubmit everything
      await submitQuiz();
    }
  }

  function reset() {
    phase.value = 'quiz';
    quizSection.value = 0;
    quiz.value = emptyQuiz();
    isComplete.value = false;
    error.value = null;
    followUpQuestions.value = [];
    followUpIndex.value = 0;
    followUpAnswers.value = [];
  }

  return {
    phase,
    quizSection,
    quiz,
    isComplete,
    error,
    sectionValid,
    // follow-up
    followUpQuestions,
    followUpIndex,
    currentFollowUpQuestion,
    isLastFollowUp,
    // actions
    checkStatus,
    nextSection,
    prevSection,
    submitQuiz,
    submitFollowUpAnswer,
    reset,
  };
});
