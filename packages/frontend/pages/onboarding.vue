<template>
  <OnboardingLayout
    :orb-state="orbState"
    :bubble-text="bubbleText"
    :bubble-meta="bubbleMeta"
  >
    <Transition name="ob-screen" mode="out-in">
      <ConnectStep
        v-if="step === 'connect'"
        key="connect"
        @connect="goto('analyzing')"
        @skip="goto('oauth-fail')"
      />

      <AnalyzingStep
        v-else-if="step === 'analyzing'"
        key="analyzing"
        @complete="goto('question-0')"
      />

      <QuestionStep
        v-else-if="step.startsWith('question-')"
        :key="step"
        :question="ONBOARDING_QUESTIONS[questionIndex]"
        :index="questionIndex"
        :total="ONBOARDING_QUESTIONS.length"
        @next="onQuestionNext"
        @recording-change="isRecording = $event"
      />

      <SummaryStep
        v-else-if="step === 'summary'"
        key="summary"
        @save="onSummarySave"
        @recording-change="isRecording = $event"
      />

      <DoneStep
        v-else-if="step === 'done'"
        key="done"
        @complete="finish"
      />

      <OAuthFailStep
        v-else-if="step === 'oauth-fail'"
        key="oauth-fail"
        @start="goto('question-0')"
        @retry="goto('connect')"
      />

      <EmptyStep
        v-else-if="step === 'empty'"
        key="empty"
        @start="goto('question-0')"
      />

      <ErrorStep
        v-else-if="step === 'error'"
        key="error"
        @retry="goto('analyzing')"
        @restart="goto('connect')"
      />

      <ReturningStep
        v-else-if="step === 'returning'"
        key="returning"
        @continue="goto('question-2')"
        @restart="goto('connect')"
      />
    </Transition>
  </OnboardingLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import OnboardingLayout from '~/components/onboarding/OnboardingLayout.vue';
import ConnectStep from '~/components/onboarding/steps/ConnectStep.vue';
import AnalyzingStep from '~/components/onboarding/steps/AnalyzingStep.vue';
import QuestionStep from '~/components/onboarding/steps/QuestionStep.vue';
import SummaryStep from '~/components/onboarding/steps/SummaryStep.vue';
import DoneStep from '~/components/onboarding/steps/DoneStep.vue';
import OAuthFailStep from '~/components/onboarding/steps/OAuthFailStep.vue';
import EmptyStep from '~/components/onboarding/steps/EmptyStep.vue';
import ErrorStep from '~/components/onboarding/steps/ErrorStep.vue';
import ReturningStep from '~/components/onboarding/steps/ReturningStep.vue';
import { ONBOARDING_QUESTIONS } from '~/components/onboarding/questions';

type Step =
  | 'connect'
  | 'analyzing'
  | `question-${number}`
  | 'summary'
  | 'done'
  | 'oauth-fail'
  | 'empty'
  | 'error'
  | 'returning';

const step = ref<Step>('connect');
const isRecording = ref(false);
const answers = ref<Record<string, { selected: string[]; text: string }>>({});

const questionIndex = computed(() => {
  const match = /^question-(\d+)$/.exec(step.value);
  return match ? Number(match[1]) : 0;
});

const orbState = computed<'idle' | 'thinking' | 'speaking' | 'listening'>(() => {
  if (isRecording.value) return 'listening';
  switch (step.value) {
    case 'connect':
    case 'done':
    case 'error':
      return 'idle';
    case 'analyzing':
      return 'thinking';
    default:
      return 'speaking';
  }
});

const bubbleText = computed(() => {
  switch (step.value) {
    case 'connect':
      return "Hi, I'm Ori, your Postrr copilot. Before we start making posts together, I want to actually understand you as a creator. Connect Threads so I can spend a moment with your account, your voice, your topics, your audience, and skip the questions I can answer just by looking.";
    case 'analyzing':
      return "One moment while I get to know you as a creator.";
    case 'summary':
      return "You write about AI development for fellow indie builders. You want to grow an audience before launching Postrr, and you prefer a direct technical tone with dry humor. Focus this month: shipping the MVP in public.";
    case 'done':
      return "Saving your profile and taking you to the dashboard, you can keep working with your posts there.";
    case 'oauth-fail':
      return "No sweat, we can do this together instead. Four quick questions and I'll have enough to get started.";
    case 'empty':
      return "Looks like your profile is brand new, nothing to read yet. Let's build your voice from scratch with a few questions.";
    case 'error':
      return "I lost connection for a moment. Your answers are safe, want me to pick up where we left off?";
    case 'returning':
      return "Good to see you again. You got through 2 of 4 questions, want to pick up where we left off?";
    default:
      return ONBOARDING_QUESTIONS[questionIndex.value]?.prompt ?? '';
  }
});

const bubbleMeta = computed(() => {
  switch (step.value) {
    case 'connect': return 'Ori';
    case 'analyzing': return 'Ori · analyzing';
    case 'summary': return "Here's what I heard";
    case 'done': return 'All set';
    case 'oauth-fail': return 'No worries';
    case 'empty': return 'Fresh account';
    case 'error': return 'Hiccup on my end';
    case 'returning': return 'Welcome back';
    default:
      return `Question ${questionIndex.value + 1} of ${ONBOARDING_QUESTIONS.length}`;
  }
});

function goto(next: Step) {
  step.value = next;
}

function onQuestionNext(payload: { selected: string[]; text: string }) {
  const q = ONBOARDING_QUESTIONS[questionIndex.value];
  answers.value[q.key] = payload;
  const nextIdx = questionIndex.value + 1;
  if (nextIdx < ONBOARDING_QUESTIONS.length) {
    goto(`question-${nextIdx}` as Step);
  } else {
    goto('summary');
  }
}

function onSummarySave(_clarification: string) {
  goto('done');
}

function finish() {
  navigateTo('/dashboard');
}

definePageMeta({ layout: false });
</script>

<style scoped>
.ob-screen-enter-active,
.ob-screen-leave-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.ob-screen-enter-from { opacity: 0; transform: translateY(8px); }
.ob-screen-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
