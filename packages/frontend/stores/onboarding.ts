import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useApiClient } from '~/services/api';

interface OnboardingStatus {
  completed: boolean;
  profile: Record<string, unknown> | null;
}

interface OnboardingAnswer {
  question: string;
  answer: string;
}

interface SubmitResult {
  status: 'complete' | 'needs_more';
  questions?: string[];
}

const INITIAL_QUESTIONS = [
  'What social media platforms are you active on or want to create content for?',
  'What do you create content about? What topics or areas of expertise do you cover?',
  'Who is your audience? Who are you trying to reach?',
  'Where are you in your creator journey? Just starting out, growing, or established?',
  'How would you describe your communication style? Formal or casual? Educational, inspirational, or entertaining?',
  'What do you want to achieve with your content in the next 3–6 months?',
];

export const useOnboardingStore = defineStore('onboarding', () => {
  const apiClient = useApiClient();

  // Phase: collecting questions → processing with agent → done
  const phase = ref<'collecting' | 'processing' | 'complete'>('collecting');
  const isFollowUp = ref(false);

  // Current batch of questions (initial 6 or follow-ups)
  const questions = ref<string[]>([...INITIAL_QUESTIONS]);
  const currentIndex = ref(0);

  // All accumulated answers (initial + follow-up rounds)
  const answers = ref<OnboardingAnswer[]>([]);

  const isComplete = ref(false);
  const error = ref<string | null>(null);

  const currentQuestion = computed(() => questions.value[currentIndex.value] ?? '');
  const totalQuestions = computed(() => questions.value.length);
  const questionNumber = computed(() => currentIndex.value + 1);
  const isLastQuestion = computed(() => currentIndex.value === questions.value.length - 1);

  async function checkStatus(): Promise<OnboardingStatus> {
    const status = await apiClient.get<OnboardingStatus>('/api/onboarding/status');
    isComplete.value = status.completed;
    return status;
  }

  function submitAnswer(answer: string) {
    const question = questions.value[currentIndex.value];
    answers.value.push({ question, answer });

    if (!isLastQuestion.value) {
      currentIndex.value++;
    } else {
      processAnswers();
    }
  }

  async function processAnswers() {
    phase.value = 'processing';
    error.value = null;

    try {
      const result = await apiClient.post<SubmitResult>('/api/onboarding/submit', {
        answers: answers.value,
      });

      if (result.status === 'complete') {
        isComplete.value = true;
        phase.value = 'complete';
      } else if (result.status === 'needs_more' && result.questions?.length) {
        // Replace question batch with follow-ups, keep accumulated answers
        questions.value = result.questions;
        currentIndex.value = 0;
        isFollowUp.value = true;
        phase.value = 'collecting';
      } else {
        throw new Error('Unexpected response from server');
      }
    } catch (err: unknown) {
      const apiError = err as { data?: { error?: string } };
      error.value = apiError?.data?.error ?? 'Something went wrong. Please try again.';
      phase.value = 'collecting';
    }
  }

  function reset() {
    phase.value = 'collecting';
    isFollowUp.value = false;
    questions.value = [...INITIAL_QUESTIONS];
    currentIndex.value = 0;
    answers.value = [];
    isComplete.value = false;
    error.value = null;
  }

  return {
    phase,
    isFollowUp,
    currentQuestion,
    currentIndex,
    totalQuestions,
    questionNumber,
    isLastQuestion,
    isComplete,
    error,
    checkStatus,
    submitAnswer,
    reset,
  };
});
