import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useApiClient } from '~/services/api';
import { useSSEStream } from '~/composables/useSSEStream';

interface OnboardingStatus {
  isComplete: boolean;
  sessionId?: string;
}

export const useOnboardingStore = defineStore('onboarding', () => {
  const apiClient = useApiClient();
  const config = useRuntimeConfig();
  const baseURL = config.public.apiBaseUrl as string;

  const currentQuestion = ref('');
  const isLoading = ref(false);
  const isComplete = ref(false);
  const sessionId = ref<string | null>(null);
  const messageCount = ref(0);

  const sseStream = useSSEStream();

  async function checkStatus(): Promise<OnboardingStatus> {
    isLoading.value = true;
    try {
      const status = await apiClient.get<OnboardingStatus>('/api/onboarding/status');
      isComplete.value = status.isComplete;
      if (status.sessionId) {
        sessionId.value = status.sessionId;
      }
      return status;
    } finally {
      isLoading.value = false;
    }
  }

  async function startOnboarding(): Promise<void> {
    isLoading.value = true;
    currentQuestion.value = '';
    sseStream.reset();

    await sseStream.streamMessage(`${baseURL}/api/onboarding/start`, {});

    currentQuestion.value = sseStream.tokens.value;
    messageCount.value = 1;

    if (sseStream.sdkSessionId.value) {
      sessionId.value = sseStream.sdkSessionId.value;
    }

    isLoading.value = false;
  }

  async function sendAnswer(text: string): Promise<void> {
    isLoading.value = true;
    currentQuestion.value = '';
    sseStream.reset();

    const body: Record<string, unknown> = { message: text };
    if (sessionId.value) {
      body.sessionId = sessionId.value;
    }

    await sseStream.streamMessage(`${baseURL}/api/onboarding/message`, body);

    currentQuestion.value = sseStream.tokens.value;
    messageCount.value++;

    if (sseStream.sdkSessionId.value) {
      sessionId.value = sseStream.sdkSessionId.value;
    }

    // Check if onboarding completed (done event may signal this)
    if (sseStream.tokens.value.toLowerCase().includes('profile saved') ||
        sseStream.tokens.value.toLowerCase().includes('onboarding complete')) {
      isComplete.value = true;
    }

    isLoading.value = false;
  }

  return {
    currentQuestion,
    isLoading,
    isComplete,
    sessionId,
    messageCount,
    streamTokens: sseStream.tokens,
    streamError: sseStream.error,
    isStreaming: sseStream.isStreaming,
    checkStatus,
    startOnboarding,
    sendAnswer,
  };
});
