<template>
  <div class="dashboard">
    <!-- ── Greeting & AI Command Bar ── -->
    <div class="dashboard__hero">
      <PageTitle
        :label="greetingLabel"
        :title="greetingName ? `${greetingPhrase}, ${greetingName}!` : 'Ready to curate today?'"
      />

      <!-- Ask AI bar hidden per design -->
      <!-- <div class="command-bar-wrap">
        <div class="command-bar__glow"></div>
        <div class="command-bar">
          <input
            class="command-bar__input"
            placeholder="Ask AI to draft a concept or summarize sessions..."
            type="text"
          />
          <button class="command-bar__btn">Ask AI</button>
        </div>
      </div> -->
    </div>

    <!-- ── Action Cards (hidden during onboarding or before initial load) ── -->
    <div v-if="showActionGrid" class="action-grid">
      <button
        class="action-card action-card--primary"
        :disabled="isStarting"
        @click="handleStartSession"
      >
        <div class="action-card__icon-wrap action-card__icon-wrap--primary">
          <PlusCircle :size="28" style="color:#fff;" />
        </div>
        <div>
          <h4 class="action-card__title action-card__title--white">
            {{ hasTodaySession ? 'Pick up where you left off' : "What's on your mind?" }}
          </h4>
          <p class="action-card__desc action-card__desc--white">
            <span v-if="isStarting" class="btn-spinner btn-spinner--white"></span>
            <template v-if="isStarting">{{ hasTodaySession ? 'Opening...' : 'Starting...' }}</template>
            <template v-else-if="hasTodaySession">
              {{ todaySessionIdeaCount > 0 ? `Continue working on your posts (${todaySessionIdeaCount} ${todaySessionIdeaCount === 1 ? 'idea' : 'ideas'} so far)` : 'Continue working on your post' }}
            </template>
            <template v-else>Tap and tell us - we'll turn it into posts</template>
          </p>
        </div>
        <Mic :size="120" class="action-card__bg-icon" />
      </button>

      <button class="action-card action-card--light action-card--disabled" disabled>
        <span class="action-card__soon">Coming soon</span>
        <div class="action-card__icon-wrap action-card__icon-wrap--indigo">
          <Lightbulb :size="28" style="color:#3525cd;" />
        </div>
        <div>
          <h4 class="action-card__title">Brainstorm a post</h4>
          <p class="action-card__desc">Got an idea? Talk it through with AI and shape one post</p>
        </div>
      </button>

      <button class="action-card action-card--light action-card--disabled" disabled>
        <span class="action-card__soon">Coming soon</span>
        <div class="action-card__icon-wrap action-card__icon-wrap--teal">
          <TrendingUp :size="28" style="color:#006a61;" />
        </div>
        <div>
          <h4 class="action-card__title">Analytics</h4>
          <p class="action-card__desc">Deep dive into your account, posts and growth</p>
        </div>
      </button>
    </div>

    <!-- ── Onboarding Checklist ── -->
    <section v-if="showOnboardingBlock" class="card onboarding-checklist">
      <div class="onboarding-checklist__header">
        <div>
          <p class="onboarding-checklist__eyebrow">Setup</p>
          <h3 class="onboarding-checklist__title">Get started</h3>
        </div>
        <span class="onboarding-checklist__progress">{{ completedStepsCount }} / {{ totalStepsCount }} done</span>
      </div>

      <div class="onboarding-checklist__steps">

        <!-- Step: Connect Threads -->
        <div v-if="hasThreadsPlatform" class="checklist-step" :class="{ 'checklist-step--done': threadsConnected }">
          <div class="checklist-step__icon-wrap" :class="{ 'checklist-step__icon-wrap--done': threadsConnected }">
            <CheckCircle v-if="threadsConnected" :size="20" />
            <Link v-else :size="20" />
          </div>
          <div class="checklist-step__content">
            <p class="checklist-step__title">Connect your Threads account</p>
            <p class="checklist-step__desc">
              {{ threadsConnected ? `Connected as @${threadsAccount?.username}` : 'So AI can learn your voice and write content that sounds like you' }}
            </p>
          </div>
          <a v-if="!threadsConnected" :href="threadsAuthUrl" class="checklist-step__btn">Connect</a>
        </div>

        <!-- Step: Analyze writing style (shows only after Threads connected) -->
        <div v-if="hasThreadsPlatform && threadsConnected" class="checklist-step" :class="{ 'checklist-step--done': styleAnalyzed }">
          <div class="checklist-step__icon-wrap" :class="{ 'checklist-step__icon-wrap--done': styleAnalyzed, 'checklist-step__icon-wrap--pending': !styleAnalyzed }">
            <CheckCircle v-if="styleAnalyzed" :size="20" />
            <span v-else class="checklist-step__spinner"></span>
          </div>
          <div class="checklist-step__content">
            <p class="checklist-step__title">Analyze your writing style</p>
            <p class="checklist-step__desc">
              {{ styleAnalyzed ? 'AI learned your tone from your posts' : 'Analyzing your last 20 posts...' }}
            </p>
          </div>
        </div>

        <!-- Step: Start first session -->
        <div class="checklist-step" :class="{ 'checklist-step--done': hasAnySessions, 'checklist-step--locked': sessionStepLocked }">
          <div class="checklist-step__icon-wrap" :class="{ 'checklist-step__icon-wrap--done': hasAnySessions, 'checklist-step__icon-wrap--locked': sessionStepLocked }">
            <CheckCircle v-if="hasAnySessions" :size="20" />
            <Lock v-else-if="sessionStepLocked" :size="20" />
            <Mic v-else :size="20" />
          </div>
          <div class="checklist-step__content">
            <p class="checklist-step__title">Start your first session</p>
            <p class="checklist-step__desc">
              {{ hasAnySessions ? 'You\'ve already started creating' : 'Talk freely, AI turns it into ready-to-post content' }}
            </p>
          </div>
          <button v-if="!hasAnySessions && !sessionStepLocked" class="checklist-step__btn" :disabled="isStarting" @click="handleStartSession">
            Start session
          </button>
        </div>

        <!-- Step: Publish first post -->
        <div class="checklist-step" :class="{ 'checklist-step--done': hasPublishedPost, 'checklist-step--locked': publishStepLocked }">
          <div class="checklist-step__icon-wrap" :class="{ 'checklist-step__icon-wrap--done': hasPublishedPost, 'checklist-step__icon-wrap--locked': publishStepLocked }">
            <CheckCircle v-if="hasPublishedPost" :size="20" />
            <Lock v-else-if="publishStepLocked" :size="20" />
            <Rocket v-else :size="20" />
          </div>
          <div class="checklist-step__content">
            <p class="checklist-step__title">Publish your first post</p>
            <p class="checklist-step__desc">
              {{ hasPublishedPost ? 'Your first post is live' : 'Review your AI-generated posts and publish to Threads' }}
            </p>
          </div>
          <button
            v-if="!hasPublishedPost && !publishStepLocked && latestSessionId"
            class="checklist-step__btn"
            @click="router.push(`/sessions/${latestSessionId}`)"
          >
            View ideas
          </button>
        </div>

      </div>
    </section>

    <!-- ── Posts Pipeline (ideas to review + ready to publish) ── -->
    <PostsPipeline v-if="threadsConnected" />

    <!-- ── Threads Performance ── -->
    <ThreadsPerformance v-if="threadsConnected" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import {
  PlusCircle, Mic, Lightbulb, TrendingUp, CheckCircle, Link, Lock,
  Rocket,
} from 'lucide-vue-next';
import { useDashboardStore } from '~/stores/dashboard';
import { useBillingStore } from '~/stores/billing';
import { useProfileStore } from '~/stores/profile';
import PageTitle from '~/components/PageTitle.vue';
import ThreadsPerformance from '~/components/threads/ThreadsPerformance.vue';
import PostsPipeline from '~/components/threads/PostsPipeline.vue';

interface ThreadsAccount {
  id: string;
  threadsUserId: string;
  username: string;
  profilePictureUrl: string | null;
  tokenExpiresAt: string;
  scopes: string;
  isPrivateProfile: boolean;
  postsCount: number;
  styleAnalyzed: boolean;
}

definePageMeta({
  layout: 'default',
  ssr: false,
});

useHead({ title: 'Dashboard - HeyPostrr' });

const dashboardStore = useDashboardStore();
const billingStore = useBillingStore();
const profileStore = useProfileStore();
const router = useRouter();
const config = useRuntimeConfig();
const isStarting = ref(false);

// ── Onboarding checklist state ──
const threadsAccount = ref<ThreadsAccount | null>(null);
const threadsAccountLoaded = ref(false);
const apiBaseUrl = config.public.apiBaseUrl as string;
const threadsAuthUrl = `${apiBaseUrl}/api/threads/auth`;
let styleAnalysisPoller: ReturnType<typeof setInterval> | null = null;

// Gate the action-grid / onboarding-block reveal on initial data load to
// prevent the flicker where action-grid renders first, then swaps to the
// onboarding-block once profile data arrives.
const dashboardReady = computed(
  () => profileStore.isLoaded && threadsAccountLoaded.value,
);

const hasThreadsPlatform = computed(() => true);

const threadsConnected = computed(() => threadsAccount.value !== null);
const styleAnalyzed = computed(() => threadsAccount.value?.styleAnalyzed ?? false);

const hasAnySessions = computed(() =>
  dashboardStore.sessions.some(session => session.messageCount > 0)
);

const hasPublishedPost = computed(() =>
  dashboardStore.sessions.some(session => session.postedCount > 0)
);

const sessionStepLocked = computed(() =>
  hasThreadsPlatform.value && !threadsConnected.value
);

const publishStepLocked = computed(() => !hasAnySessions.value);

const latestSessionId = computed(() => {
  if (dashboardStore.sessions.length === 0) return null;
  return [...dashboardStore.sessions]
    .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())[0].id;
});

// Backend stores sessionDate as UTC midnight, so we match the same
// representation here. Today's session is the row whose sessionDate ISO date
// (YYYY-MM-DD) equals today's UTC date.
const todaySession = computed(() => {
  const now = new Date();
  const todayKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
  return dashboardStore.sessions.find(
    (session) => session.sessionDate.slice(0, 10) === todayKey,
  ) ?? null;
});

const hasTodaySession = computed(() => todaySession.value !== null);
const todaySessionIdeaCount = computed(() => todaySession.value?.ideaCount ?? 0);

const onboardingSteps = computed(() => {
  const steps: boolean[] = [];
  if (hasThreadsPlatform.value) {
    steps.push(threadsConnected.value);
    if (threadsConnected.value) steps.push(styleAnalyzed.value);
  }
  steps.push(hasAnySessions.value);
  steps.push(hasPublishedPost.value);
  return steps;
});

const completedStepsCount = computed(() => onboardingSteps.value.filter(Boolean).length);
const totalStepsCount = computed(() => onboardingSteps.value.length);
const showOnboardingBlock = computed(
  () =>
    dashboardReady.value &&
    profileStore.isOnboarded &&
    completedStepsCount.value < totalStepsCount.value,
);
const showActionGrid = computed(
  () => dashboardReady.value && !showOnboardingBlock.value,
);

async function loadThreadsAccount(): Promise<void> {
  try {
    const response = await $fetch<{ account: ThreadsAccount | null }>(
      `${apiBaseUrl}/api/threads/account`,
      { credentials: 'include' }
    );
    threadsAccount.value = response.account;
  } catch {
    threadsAccount.value = null;
  } finally {
    threadsAccountLoaded.value = true;
  }
}

function startStyleAnalysisPolling(): void {
  if (styleAnalysisPoller) return;
  styleAnalysisPoller = setInterval(async () => {
    await loadThreadsAccount();
    if (styleAnalyzed.value) stopStyleAnalysisPolling();
  }, 5000);
}

function stopStyleAnalysisPolling(): void {
  if (styleAnalysisPoller) {
    clearInterval(styleAnalysisPoller);
    styleAnalysisPoller = null;
  }
}

watch(
  () => threadsConnected.value && !styleAnalyzed.value,
  (shouldPoll) => {
    if (shouldPoll) startStyleAnalysisPolling();
    else stopStyleAnalysisPolling();
  },
  { immediate: true }
);

onUnmounted(() => stopStyleAnalysisPolling());

const greetingName = computed(() => {
  return profileStore.userName || profileStore.userEmail.split('@')[0];
});

const greetingPhrase = ref('');
const greetingLabel = ref('');

function computeGreeting(): void {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    greetingPhrase.value = 'Good Morning';
    greetingLabel.value = 'Morning';
  } else if (hour >= 12 && hour < 17) {
    greetingPhrase.value = 'Good Afternoon';
    greetingLabel.value = 'Afternoon';
  } else if (hour >= 17 && hour < 22) {
    greetingPhrase.value = 'Good Evening';
    greetingLabel.value = 'Evening';
  } else {
    greetingPhrase.value = 'Good Night';
    greetingLabel.value = 'Late night';
  }
}

onMounted(async () => {
  computeGreeting();
  await Promise.all([
    dashboardStore.loadSessions(),
    billingStore.loadBalance(),
    profileStore.loadProfile(),
    loadThreadsAccount(),
  ]);
});

async function handleStartSession(): Promise<void> {
  // Continuing today's existing session - no credit check needed, just navigate.
  if (todaySession.value) {
    router.push(`/sessions/${todaySession.value.id}`);
    return;
  }
  if (billingStore.balance < 2) {
    billingStore.openPricingModal();
    return;
  }
  isStarting.value = true;
  try {
    const sessionId = await dashboardStore.startTodaySession();
    router.push(`/sessions/${sessionId}`);
  } finally {
    isStarting.value = false;
  }
}


</script>

<style scoped>
/* ─── Page wrapper ─── */
.dashboard {
  margin: 0 auto;
  padding: 2.5rem 2rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

/* ─── Hero section ─── */
.dashboard__hero {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.dashboard__greeting-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #3525cd;
  margin-bottom: 0.25rem;
}

.dashboard__greeting-title {
  font-family: 'Manrope', sans-serif;
  font-size: 2.5rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #191c1e;
  margin: 0;
}

/* ─── Command Bar ─── */
.command-bar-wrap {
  position: relative;
  max-width: 720px;
}

.command-bar__glow {
  position: absolute;
  inset: 0;
  background: rgba(53, 37, 205, 0.05);
  filter: blur(40px);
  border-radius: 9999px;
  pointer-events: none;
}

.command-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 9999px;
  padding: 0.875rem 1.5rem;
  box-shadow: 0 20px 40px -10px rgba(53, 37, 205, 0.1);
}

.command-bar__icon {
  color: #3525cd;
  flex-shrink: 0;
}

.command-bar__input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 1rem;
  font-weight: 500;
  color: #191c1e;
  font-family: 'Inter', sans-serif;
}

.command-bar__input::placeholder {
  color: #9ca3af;
  font-weight: 400;
}

.command-bar__btn {
  background: #3525cd;
  color: #fff;
  border: none;
  border-radius: 9999px;
  padding: 0.5rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(53, 37, 205, 0.25);
  transition: opacity 0.15s, transform 0.1s;
}

.command-bar__btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* ─── Action Cards ─── */
.action-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .action-grid { grid-template-columns: 1fr; }
}

.action-card {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  padding: 2rem;
  text-align: left;
  border: none;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.action-card:hover {
  transform: translateY(-3px) scale(1.01);
}

.action-card:active {
  transform: scale(0.97);
}

.action-card--primary {
  background: linear-gradient(135deg, #4f46e5 0%, #818cf8 100%);
  box-shadow: 0 20px 40px rgba(79, 70, 229, 0.3);
}

.action-card--light {
  background: #ffffff;
  border: 1px solid #f1f1f1;
  box-shadow: 0 4px 16px rgba(25, 28, 30, 0.05);
}

.action-card--light:hover {
  box-shadow: 0 12px 32px rgba(25, 28, 30, 0.1);
}

.action-card--disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.action-card--disabled:hover {
  transform: none;
  box-shadow: 0 4px 16px rgba(25, 28, 30, 0.05);
}

.action-card__soon {
  position: absolute;
  top: 0.875rem;
  right: 0.875rem;
  padding: 0.2rem 0.55rem;
  background: rgba(53, 37, 205, 0.09);
  color: #3525cd;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border-radius: 9999px;
}

.action-card__icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-card__icon-wrap--primary {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
}

.action-card__icon-wrap--indigo {
  background: rgba(53, 37, 205, 0.07);
}

.action-card__icon-wrap--teal {
  background: rgba(0, 106, 97, 0.07);
}

.action-card__title {
  font-family: 'Manrope', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 0.25rem;
  color: #191c1e;
}

.action-card__title--white {
  color: #fff;
}

.action-card__desc {
  font-size: 0.875rem;
  color: #464555;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.action-card__desc--white {
  color: rgba(255, 255, 255, 0.8);
}

.action-card__bg-icon {
  position: absolute;
  right: -20px;
  bottom: -20px;
  color: rgba(255, 255, 255, 0.08);
  pointer-events: none;
  transition: transform 0.3s;
}

.action-card:hover .action-card__bg-icon {
  transform: scale(1.1);
}

.btn-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: rgba(255,255,255,0.9);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin { to { transform: rotate(360deg); } }


@media (max-width: 899px) {
  .dashboard { padding: 1rem 0.875rem 3rem; gap: 1.5rem; }
}

/* ─── Onboarding Checklist ─── */
.onboarding-checklist {}

.onboarding-checklist__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.onboarding-checklist__eyebrow {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #3525cd;
  margin: 0 0 0.25rem;
}

.onboarding-checklist__title {
  font-family: 'Manrope', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #191c1e;
  margin: 0;
}

.onboarding-checklist__progress {
  padding: 0.3rem 0.875rem;
  background: rgba(53, 37, 205, 0.07);
  color: #3525cd;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  white-space: nowrap;
  flex-shrink: 0;
}

.onboarding-checklist__steps {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.checklist-step {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem 1.5rem;
  border-radius: 20px;
  background: #f7f9fb;
  border: 1.5px solid #f1f1f1;
  transition: background 0.15s, border-color 0.15s;
}

.checklist-step__content {
  flex: 1;
  min-width: 0;
}

.checklist-step--done {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.checklist-step--locked {
  opacity: 0.45;
  pointer-events: none;
}

.checklist-step__icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(53, 37, 205, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #3525cd;
}

.checklist-step__icon-wrap--done {
  background: rgba(22, 163, 74, 0.1);
  color: #16a34a;
}

.checklist-step__icon-wrap--pending {
  background: rgba(234, 179, 8, 0.1);
  color: #ca8a04;
}

.checklist-step__icon-wrap--locked {
  background: rgba(107, 114, 128, 0.08);
  color: #9ca3af;
}

.checklist-step__title {
  font-family: 'Manrope', sans-serif;
  font-size: 0.9375rem;
  font-weight: 700;
  color: #191c1e;
  margin: 0 0 0.2rem;
}

.checklist-step--done .checklist-step__title {
  color: #166534;
}

.checklist-step__desc {
  font-size: 0.8125rem;
  color: #6b7280;
  margin: 0;
}

.checklist-step--done .checklist-step__desc {
  color: #16a34a;
}

.checklist-step__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1.25rem;
  background: #3525cd;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: opacity 0.15s, transform 0.1s;
}

.checklist-step__btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.checklist-step__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.checklist-step__spinner {
  display: block;
  width: 20px;
  height: 20px;
  border: 2.5px solid rgba(202, 138, 4, 0.25);
  border-top-color: #ca8a04;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

/* ─── Insights Grid ─── */
.insights-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 900px) {
  .insights-grid { grid-template-columns: 1fr; }
}

.insight-card {
  border-radius: 24px;
  padding: 2rem;
  border: 1px solid transparent;
}

.insight-card--recommendation {
  background: #f2f4f6;
  border-color: rgba(241, 241, 241, 0.8);
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.insight-card--momentum {
  background: rgba(53, 37, 205, 0.04);
  border-color: rgba(53, 37, 205, 0.1);
}

.insight-card__image-wrap {
  flex-shrink: 0;
}

.insight-card__image-placeholder {
  width: 96px;
  height: 96px;
  background: #fff;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(25, 28, 30, 0.06);
}

.insight-card__label {
  display: block;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #3525cd;
  margin-bottom: 0.5rem;
}

.insight-card__title {
  font-family: 'Manrope', sans-serif;
  font-size: 1.125rem;
  font-weight: 700;
  color: #191c1e;
  margin: 0 0 0.5rem;
}

.insight-card__text {
  font-size: 0.875rem;
  color: #464555;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.insight-card__action-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: #3525cd;
  font-weight: 700;
  font-size: 0.9375rem;
  text-decoration: none;
  transition: gap 0.15s;
}

.insight-card__action-link:hover {
  gap: 0.5rem;
}

/* Momentum chart */
.insight-card__momentum-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.insight-card__momentum-icon {
  width: 44px;
  height: 44px;
  background: #3525cd;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.momentum-chart {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  height: 80px;
  padding: 0 0.25rem;
}

.momentum-chart__bar {
  flex: 1;
  background: #c7d2fe;
  border-radius: 4px 4px 0 0;
  transition: background 0.2s;
  min-height: 4px;
}

.momentum-chart__bar--active {
  background: #3525cd;
}

@media (max-width: 899px) {
  .checklist-step {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.375rem;
  }

  .checklist-step__content {
    width: 100%;
  }

  .checklist-step__btn {
    align-self: flex-start;
    margin-top: 0.125rem;
  }
}

.momentum-chart__labels {
  display: flex;
  justify-content: space-between;
  margin-top: 0.75rem;
  padding: 0 0.25rem;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #818cf8;
  letter-spacing: 0.06em;
}
</style>
