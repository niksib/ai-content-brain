<template>
  <OnboardingLayout
    :orb-state="orbState"
    :bubble-text="bubbleText"
    :bubble-meta="bubbleMeta"
  >
    <Transition name="ob-screen" mode="out-in">
      <ConnectStep
        v-if="viewStep === 'connect'"
        key="connect"
        :loading="connecting"
        :already-connected="Boolean(threadsAccount)"
        @connect="onConnectThreads"
        @skip="onSkipThreads"
      />

      <AnalyzingStep
        v-else-if="viewStep === 'analyzing'"
        key="analyzing"
        :complete="analysisReady"
        @complete="onAnalysisComplete"
      />

      <AnalyzingStep
        v-else-if="viewStep === 'finalizing'"
        key="finalizing"
        :steps="FINALIZING_STEPS"
        :step-duration-ms="2200"
        :complete="finalizingReady"
        @complete="onFinalizingComplete"
      />

      <QuestionStep
        v-else-if="viewStep === 'question' && currentQuestion"
        :key="`question-${questionIndex}`"
        :question="currentQuestion"
        :index="questionIndex"
        :total="onboarding.questions.length"
        @next="onQuestionNext"
        @recording-change="isRecording = $event"
      />

      <SummaryStep
        v-else-if="viewStep === 'summary'"
        key="summary"
        :summary-text="onboarding.summaryText"
        :loading="onboarding.loading"
        :already-refined="onboarding.alreadyRefined"
        @save="onSummarySave"
        @clarify="onSummaryClarify"
        @recording-change="isRecording = $event"
      />

      <DoneStep
        v-else-if="viewStep === 'done'"
        key="done"
      />

      <ErrorStep
        v-else-if="viewStep === 'error'"
        key="error"
        @retry="onRetry"
        @restart="onRestart"
      />
    </Transition>
  </OnboardingLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import OnboardingLayout from '~/components/onboarding/OnboardingLayout.vue';
import ConnectStep from '~/components/onboarding/steps/ConnectStep.vue';
import AnalyzingStep from '~/components/onboarding/steps/AnalyzingStep.vue';
import QuestionStep from '~/components/onboarding/steps/QuestionStep.vue';
import SummaryStep from '~/components/onboarding/steps/SummaryStep.vue';
import DoneStep from '~/components/onboarding/steps/DoneStep.vue';
import ErrorStep from '~/components/onboarding/steps/ErrorStep.vue';
import { useOnboardingStore } from '~/stores/onboarding';

type ViewStep =
  | 'connect'
  | 'analyzing'
  | 'question'
  | 'finalizing'
  | 'summary'
  | 'done'
  | 'error';

const FINALIZING_STEPS = [
  'Reading your answers',
  'Lining things up with your posts',
  'Putting your profile together',
] as const;

const onboarding = useOnboardingStore();
const route = useRoute();

interface ThreadsAccountView {
  username: string;
  name: string | null;
}

const isRecording = ref(false);
const questionIndex = ref(0);
const localStep = ref<ViewStep | null>(null);
const connecting = ref(false);
const analysisReady = ref(false);
const finalizingReady = ref(false);
const threadsAccount = ref<ThreadsAccountView | null>(null);

const ANALYSIS_POLL_INTERVAL_MS = 2500;
let analysisPollHandle: ReturnType<typeof setInterval> | null = null;

function stopAnalysisPolling(): void {
  if (analysisPollHandle !== null) {
    clearInterval(analysisPollHandle);
    analysisPollHandle = null;
  }
}

function startAnalysisPolling(): void {
  if (analysisPollHandle !== null) return;
  analysisPollHandle = setInterval(() => {
    void onboarding.refreshSession();
  }, ANALYSIS_POLL_INTERVAL_MS);
}

const currentQuestion = computed(
  () => onboarding.questions[questionIndex.value] ?? null,
);

const viewStep = computed<ViewStep>(() => {
  if (onboarding.error) return 'error';
  if (localStep.value) return localStep.value;

  switch (onboarding.step) {
    case 'connect': return 'connect';
    case 'analyzing': return 'analyzing';
    case 'questions': return 'question';
    case 'summary': return 'summary';
    case 'done': return 'done';
    default: return 'connect';
  }
});

const orbState = computed<'idle' | 'thinking' | 'speaking' | 'listening'>(() => {
  if (isRecording.value) return 'listening';
  switch (viewStep.value) {
    case 'connect':
    case 'done':
    case 'error':
      return 'idle';
    case 'analyzing':
    case 'finalizing':
      return 'thinking';
    default:
      return 'speaking';
  }
});

const bubbleText = computed(() => {
  switch (viewStep.value) {
    case 'connect': {
      if (threadsAccount.value) {
        const displayName = threadsAccount.value.name?.trim()
          || `@${threadsAccount.value.username}`;
        return `Hi, I'm Ori, your Postrr copilot. I can see your Threads account, ${displayName}. When you're ready, I'll spend a moment with your posts to learn your voice, topics, and audience, so I can skip the questions I can answer just by looking.`;
      }
      return "Hi, I'm Ori, your Postrr copilot. Before we start making posts together, I want to actually understand you as a creator. Connect Threads so I can spend a moment with your account, your voice, your topics, your audience, and skip the questions I can answer just by looking.";
    }
    case 'analyzing':
      return 'One moment while I get to know you as a creator.';
    case 'finalizing':
      return "Got your answers. Let me put together what I learned about you.";
    case 'summary': {
      const summary = onboarding.summaryText
        || "Here's what I gathered about you.";
      return `${summary}\n\nIf I got something wrong, write it in the field below and I'll fix it.`;
    }
    case 'done':
      return "Saving your Creator Profile and taking you to your dashboard.";
    case 'error':
      return onboarding.error
        ?? 'I lost connection for a moment. Want me to pick up where we left off?';
    case 'question': {
      const question = currentQuestion.value;
      if (!question) return '';
      const context = question.bubbleContext?.trim();
      const prompt = question.prompt?.trim() ?? '';
      return context ? `${context}\n\n${prompt}` : prompt;
    }
    default:
      return '';
  }
});

const bubbleMeta = computed(() => {
  switch (viewStep.value) {
    case 'connect': return 'Ori';
    case 'analyzing': return 'Ori · analyzing';
    case 'finalizing': return 'Ori · writing your profile';
    case 'summary': return "Here's what I heard";
    case 'done': return 'Saving';
    case 'error': return 'Hiccup on my end';
    case 'question':
      return `Question ${questionIndex.value + 1} of ${onboarding.questions.length}`;
    default: return 'Ori';
  }
});

async function loadThreadsAccount(): Promise<void> {
  try {
    const config = useRuntimeConfig();
    const response = await $fetch<{ account: ThreadsAccountView | null }>(
      `${config.public.apiBaseUrl}/api/threads/account`,
      { credentials: 'include' },
    );
    threadsAccount.value = response.account;
  } catch {
    threadsAccount.value = null;
  }
}

onMounted(async () => {
  await Promise.all([onboarding.ensureSession(), loadThreadsAccount()]);

  const justConnected = route.query.threads_connected === 'true';
  if (
    (justConnected && onboarding.step === 'connect') ||
    onboarding.step === 'analyzing'
  ) {
    // Backend atomically claims; if already analyzing (non-stale) it no-ops.
    await onboarding.runAnalysis();
  }

  if (onboarding.step === 'analyzing') {
    startAnalysisPolling();
    return;
  }

  if (onboarding.step === 'questions') {
    questionIndex.value = findFirstUnanswered();
  }
});

watch(
  () => onboarding.step,
  (nextStep, previousStep) => {
    if (nextStep === 'analyzing' && previousStep !== 'analyzing') {
      analysisReady.value = false;
      startAnalysisPolling();
      return;
    }
    if (previousStep === 'analyzing' && nextStep !== 'analyzing') {
      stopAnalysisPolling();
      if (nextStep === 'questions') {
        questionIndex.value = findFirstUnanswered();
      }
      // Hold the analyzing view until AnalyzingStep emits complete.
      localStep.value = 'analyzing';
      analysisReady.value = true;
    }
  },
);

onBeforeUnmount(() => {
  stopAnalysisPolling();
});

function findFirstUnanswered(): number {
  for (let i = 0; i < onboarding.questions.length; i++) {
    const question = onboarding.questions[i];
    if (!onboarding.answers[question.key]) return i;
  }
  return Math.max(0, onboarding.questions.length - 1);
}

async function onConnectThreads() {
  if (connecting.value) return;
  connecting.value = true;
  try {
    await onboarding.ensureSession();
  } catch {
    connecting.value = false;
    return;
  }

  if (threadsAccount.value) {
    // Threads already linked (e.g. via Threads login) — skip OAuth and start analysis.
    try {
      localStep.value = 'analyzing';
      await onboarding.runAnalysis();
    } finally {
      connecting.value = false;
    }
    return;
  }

  const config = useRuntimeConfig();
  await navigateTo(`${config.public.apiBaseUrl}/api/threads/auth`, { external: true });
}

async function onSkipThreads() {
  await onboarding.ensureSession();
  localStep.value = 'analyzing';
  await onboarding.runFallback();
  localStep.value = null;
}

function onAnalysisComplete() {
  analysisReady.value = false;
  localStep.value = null;
  if (onboarding.step === 'questions') {
    questionIndex.value = findFirstUnanswered();
  }
}

async function onQuestionNext(payload: { selected: string[]; text: string }) {
  if (!currentQuestion.value) return;
  await onboarding.answerQuestion(currentQuestion.value.key, payload);
  const nextIdx = questionIndex.value + 1;
  if (nextIdx < onboarding.questions.length) {
    questionIndex.value = nextIdx;
    return;
  }
  localStep.value = 'finalizing';
  finalizingReady.value = false;
  await onboarding.generateSummary();
  if (onboarding.error) {
    localStep.value = null;
    return;
  }
  finalizingReady.value = true;
}

function onFinalizingComplete() {
  finalizingReady.value = false;
  localStep.value = null;
}

async function onSummarySave() {
  localStep.value = 'done';
  await onboarding.completeOnboarding();
  if (onboarding.error) {
    localStep.value = null;
    return;
  }
  navigateTo('/dashboard');
}

async function onSummaryClarify(clarification: string) {
  if (!clarification) return;
  localStep.value = 'done';
  await onboarding.clarifySummary(clarification);
  if (onboarding.error) {
    localStep.value = null;
    return;
  }
  await onboarding.completeOnboarding();
  if (onboarding.error) {
    localStep.value = null;
    return;
  }
  navigateTo('/dashboard');
}

async function onRetry() {
  onboarding.error = null;
  if (onboarding.step === 'analyzing' || !onboarding.session) {
    await onboarding.runAnalysis();
  }
}

async function onRestart() {
  onboarding.reset();
  await onboarding.ensureSession();
  localStep.value = null;
  questionIndex.value = 0;
}

definePageMeta({ layout: false, ssr: false });

useHead({ title: 'Onboarding — HeyPostrr' });
</script>

<style scoped>
.ob-screen-enter-active,
.ob-screen-leave-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.ob-screen-enter-from { opacity: 0; transform: translateY(8px); }
.ob-screen-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
