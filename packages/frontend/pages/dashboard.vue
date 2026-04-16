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
          <span class="material-symbols-outlined command-bar__icon">auto_awesome</span>
          <input
            class="command-bar__input"
            placeholder="Ask AI to draft a concept or summarize sessions..."
            type="text"
          />
          <button class="command-bar__btn">Ask AI</button>
        </div>
      </div> -->
    </div>

    <!-- ── Action Cards (hidden during onboarding) ── -->
    <div v-if="!showOnboardingBlock" class="action-grid">
      <button
        class="action-card action-card--primary"
        :disabled="isStarting"
        @click="handleStartSession"
      >
        <div class="action-card__icon-wrap action-card__icon-wrap--primary">
          <span class="material-symbols-outlined" style="font-size:28px;color:#fff;">add_circle</span>
        </div>
        <div>
          <h4 class="action-card__title action-card__title--white">Start New Session</h4>
          <p class="action-card__desc action-card__desc--white">
            <span v-if="isStarting" class="btn-spinner btn-spinner--white"></span>
            {{ isStarting ? 'Starting...' : 'Capture fresh ideas instantly' }}
          </p>
        </div>
        <span class="material-symbols-outlined action-card__bg-icon">mic</span>
      </button>

      <button class="action-card action-card--light">
        <div class="action-card__icon-wrap action-card__icon-wrap--indigo">
          <span class="material-symbols-outlined" style="font-size:28px;color:#3525cd;">lightbulb</span>
        </div>
        <div>
          <h4 class="action-card__title">Quick Idea</h4>
          <p class="action-card__desc">Save a snippet to the library</p>
        </div>
      </button>

      <button class="action-card action-card--light">
        <div class="action-card__icon-wrap action-card__icon-wrap--teal">
          <span class="material-symbols-outlined" style="font-size:28px;color:#006a61;">monitoring</span>
        </div>
        <div>
          <h4 class="action-card__title">View Analytics</h4>
          <p class="action-card__desc">Check your reach and growth</p>
        </div>
      </button>
    </div>

    <!-- ── Onboarding Checklist ── -->
    <section v-if="showOnboardingBlock" class="onboarding-checklist">
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
            <span class="material-symbols-outlined">{{ threadsConnected ? 'check_circle' : 'link' }}</span>
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
            <span v-if="styleAnalyzed" class="material-symbols-outlined">check_circle</span>
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
            <span class="material-symbols-outlined">{{ hasAnySessions ? 'check_circle' : sessionStepLocked ? 'lock' : 'mic' }}</span>
          </div>
          <div class="checklist-step__content">
            <p class="checklist-step__title">Start your first session</p>
            <p class="checklist-step__desc">
              {{ hasAnySessions ? 'You\'ve already started creating' : 'Talk freely — AI turns it into ready-to-post content' }}
            </p>
          </div>
          <button v-if="!hasAnySessions && !sessionStepLocked" class="checklist-step__btn" :disabled="isStarting" @click="handleStartSession">
            Start session
          </button>
        </div>

        <!-- Step: Publish first post -->
        <div class="checklist-step" :class="{ 'checklist-step--done': hasPublishedPost, 'checklist-step--locked': publishStepLocked }">
          <div class="checklist-step__icon-wrap" :class="{ 'checklist-step__icon-wrap--done': hasPublishedPost, 'checklist-step__icon-wrap--locked': publishStepLocked }">
            <span class="material-symbols-outlined">{{ hasPublishedPost ? 'check_circle' : publishStepLocked ? 'lock' : 'rocket_launch' }}</span>
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

    <!-- ── Content Calendar ── -->
    <section class="calendar-section">
      <div class="calendar-section__header">
        <div class="calendar-section__header-left">
          <h3 class="calendar-section__title">Content Calendar</h3>
          <span class="calendar-section__badge">
            {{ currentMonthLabel }}
          </span>
        </div>
        <div class="calendar-section__nav">
          <button class="calendar-nav-btn" @click="goToPrevMonth">
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          <button class="calendar-nav-btn" @click="goToNextMonth">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

      <!-- Day headers -->
      <div class="calendar-grid">
        <div v-for="day in dayNames" :key="day" class="calendar-day-name">{{ day }}</div>

        <!-- Empty leading cells -->
        <div
          v-for="n in leadingDays"
          :key="`empty-${n}`"
          class="calendar-cell calendar-cell--empty"
        ></div>

        <!-- Day cells -->
        <div
          v-for="day in daysInMonth"
          :key="day.number"
          class="calendar-cell"
          :class="{
            'calendar-cell--today': day.isToday,
            'calendar-cell--today-completed': day.isToday && day.sessions.length > 0 && day.sessions[0].status === 'completed',
            'calendar-cell--has-sessions': day.sessions.length > 0 && !day.isToday,
            'calendar-cell--day-completed': day.sessions.length > 0 && !day.isToday && day.sessions[0].status === 'completed',
            'calendar-cell--empty-day': day.sessions.length === 0 && !day.isToday,
          }"
          :style="{ cursor: day.sessions.length > 0 || day.isToday ? 'pointer' : undefined }"
          @click="handleCellClick(day)"
        >
          <div class="calendar-cell__header">
            <span class="calendar-cell__number">{{ day.number }}</span>
            <span v-if="day.isToday" class="calendar-cell__today-badge">Today</span>
          </div>

          <template v-if="day.isToday">
            <template v-if="day.sessions.length > 0 && day.sessions[0].status === 'completed'">
              <div class="calendar-cell__done-row">
                <span class="material-symbols-outlined" style="font-size:16px;">check_circle</span>
                <span class="calendar-cell__done-label">Day completed</span>
              </div>
              <div class="calendar-cell__counts">
                <CalendarCounts :session="day.sessions[0]" white />
              </div>
            </template>
            <template v-else-if="day.sessions.length > 0 && day.sessions[0].ideaCount > 0">
              <div class="calendar-cell__counts">
                <CalendarCounts :session="day.sessions[0]" white />
              </div>
            </template>
            <template v-else>
              <div class="calendar-cell__start-session">
                <span class="material-symbols-outlined calendar-cell__mic-icon">mic</span>
                <span class="calendar-cell__start-label">Start Session</span>
              </div>
            </template>
          </template>

          <template v-else-if="day.sessions.length > 0">
            <div class="calendar-cell__session-count">
              <span class="material-symbols-outlined calendar-cell__session-icon" :style="{color: day.sessions[0].status === 'completed' ? '#16a34a' : '#6366f1'}">check_circle</span>
              <div class="calendar-cell__counts">
                <CalendarCounts :session="day.sessions[0]" />
              </div>
            </div>
          </template>

          <template v-else>
            <span class="material-symbols-outlined calendar-cell__add-icon">add</span>
          </template>
        </div>
      </div>
    </section>

    <!-- Recommended Action and Weekly Momentum hidden per design -->
    <!-- <div class="insights-grid"> ... </div> -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useDashboardStore, type CalendarSession } from '~/stores/dashboard';
import { useBillingStore } from '~/stores/billing';
import { useProfileStore } from '~/stores/profile';
import PageTitle from '~/components/PageTitle.vue';

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
});

const dashboardStore = useDashboardStore();
const billingStore = useBillingStore();
const profileStore = useProfileStore();
const router = useRouter();
const config = useRuntimeConfig();
const isStarting = ref(false);

// ── Onboarding checklist state ──
const threadsAccount = ref<ThreadsAccount | null>(null);
const apiBaseUrl = config.public.apiBaseUrl as string;
const threadsAuthUrl = `${apiBaseUrl}/api/threads/auth`;
let styleAnalysisPoller: ReturnType<typeof setInterval> | null = null;

const hasThreadsPlatform = computed(() =>
  profileStore.profile?.platforms.some(p => p.toLowerCase() === 'threads') ?? false
);

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
  () => profileStore.profile !== null && completedStepsCount.value < totalStepsCount.value
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

const greetingPhrase = computed(() => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  if (hour >= 17 && hour < 22) return 'Good Evening';
  return 'Good Night';
});

const greetingLabel = computed(() => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Morning session';
  if (hour >= 12 && hour < 17) return 'Afternoon session';
  if (hour >= 17 && hour < 22) return 'Evening session';
  return 'Late night session';
});

onMounted(async () => {
  await Promise.all([
    dashboardStore.loadSessions(),
    billingStore.loadBalance(),
    profileStore.loadProfile(),
    loadThreadsAccount(),
  ]);
});

async function handleStartSession(): Promise<void> {
  if (billingStore.balance === 0) {
    router.push('/pricing');
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

function navigateToSession(sessionId: string): void {
  router.push(`/sessions/${sessionId}`);
}

function calendarLabel(session: CalendarSession): string {
  const parts: string[] = [];
  if (session.ideaCount > 0) parts.push(`${session.ideaCount} created`);
  if (session.postedCount > 0) parts.push(`${session.postedCount} posted`);
  if (session.scheduledCount > 0) parts.push(`${session.scheduledCount} scheduled`);
  return parts.join(', ') || `${session.ideaCount} ideas`;
}

function handleCellClick(day: { number: number; isToday: boolean; sessions: CalendarSession[] }): void {
  if (day.sessions.length > 0) {
    navigateToSession(day.sessions[0].id);
  } else if (day.isToday) {
    handleStartSession();
  }
}

// Store uses 0-based month values
function goToPrevMonth() {
  const year = dashboardStore.currentYear;
  const month = dashboardStore.currentMonth; // 0-based
  if (month === 0) {
    dashboardStore.loadMonth(year - 1, 11);
  } else {
    dashboardStore.loadMonth(year, month - 1);
  }
}

function goToNextMonth() {
  const year = dashboardStore.currentYear;
  const month = dashboardStore.currentMonth; // 0-based
  if (month === 11) {
    dashboardStore.loadMonth(year + 1, 0);
  } else {
    dashboardStore.loadMonth(year, month + 1);
  }
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Store uses 0-based month (like JS Date.getMonth())
const currentMonthLabel = computed(() => {
  const date = new Date(dashboardStore.currentYear, dashboardStore.currentMonth, 1);
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
});

const leadingDays = computed(() => {
  const date = new Date(dashboardStore.currentYear, dashboardStore.currentMonth, 1);
  return date.getDay(); // 0 = Sunday
});

const daysInMonth = computed(() => {
  const year = dashboardStore.currentYear;
  const month = dashboardStore.currentMonth; // 0-based
  const total = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayIsThisMonth =
    today.getFullYear() === year && today.getMonth() === month;

  return Array.from({ length: total }, (_, i) => {
    const dayNumber = i + 1;
    const isToday = todayIsThisMonth && today.getDate() === dayNumber;
    const sessions = (dashboardStore.sessions || []).filter((s) => {
      const d = new Date(s.sessionDate);
      return d.getUTCFullYear() === year && d.getUTCMonth() === month && d.getUTCDate() === dayNumber;
    });
    return { number: dayNumber, isToday, sessions };
  });
});

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
  font-size: 120px !important;
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

/* ─── Calendar ─── */
.calendar-section {
  background: #ffffff;
  border-radius: 32px;
  padding: 2.5rem;
  box-shadow: 0 12px 32px -4px rgba(25, 28, 30, 0.06);
  border: 1px solid rgba(241, 241, 241, 0.8);
}

.calendar-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.calendar-section__header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.calendar-section__title {
  font-family: 'Manrope', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #191c1e;
  margin: 0;
}

.calendar-section__badge {
  padding: 0.3rem 0.875rem;
  background: rgba(53, 37, 205, 0.07);
  color: #3525cd;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.calendar-section__nav {
  display: flex;
  gap: 0.5rem;
}

.calendar-nav-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #464555;
  transition: background 0.15s;
}

.calendar-nav-btn:hover {
  background: #f2f4f6;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.625rem;
}

.calendar-day-name {
  text-align: center;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #9ca3af;
  padding-bottom: 0.75rem;
}

.calendar-cell {
  min-height: 120px;
  border-radius: 16px;
  padding: 1rem;
  cursor: default;
  display: flex;
  flex-direction: column;
  transition: background 0.15s, border-color 0.15s;
  position: relative;
  overflow: hidden;
}

.calendar-cell--empty {
  background: #fafafa;
  opacity: 0.35;
  pointer-events: none;
}

.calendar-cell--empty-day {
  background: #f7f9fb;
  border: 1.5px dashed #d1d5db;
}

.calendar-cell--empty-day:hover {
  border-color: rgba(53, 37, 205, 0.4);
}

.calendar-cell--has-sessions {
  background: #f2f4f6;
  cursor: pointer !important;
}

.calendar-cell--has-sessions:hover {
  background: rgba(53, 37, 205, 0.05);
}

.calendar-cell--today {
  background: #3525cd;
  color: #fff;
  box-shadow: 0 8px 24px rgba(53, 37, 205, 0.35);
  z-index: 2;
  cursor: pointer;
  outline: 3px solid rgba(53, 37, 205, 0.4);
  outline-offset: 2px;
}

.calendar-cell--today:hover {
  background: #2f1fb5;
}

.calendar-cell--today-completed {
  background: #052e16;
  box-shadow: 0 8px 24px rgba(22, 163, 74, 0.35);
  outline: 3px solid #16a34a;
  outline-offset: 2px;
}

.calendar-cell--day-completed {
  background: #f0fdf4;
  border: 2px solid #16a34a !important;
  cursor: pointer !important;
}

.calendar-cell--day-completed:hover {
  background: #dcfce7;
}

.calendar-cell__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.calendar-cell__number {
  font-weight: 700;
  font-size: 0.9375rem;
  color: inherit;
}

.calendar-cell--today .calendar-cell__number {
  font-size: 1.25rem;
  font-weight: 900;
}

.calendar-cell__today-badge {
  font-size: 0.625rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
}

.calendar-cell__today-status {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.8);
  margin-top: auto;
  margin-bottom: 0.375rem;
}

.calendar-cell__done-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: auto;
  color: #4ade80;
}

.calendar-cell__done-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #4ade80;
}

.calendar-cell__today-idea-count {
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 0.25rem;
}

.calendar-cell__progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 9999px;
  overflow: hidden;
}

.calendar-cell__progress-fill {
  width: 65%;
  height: 100%;
  background: #fff;
  border-radius: 9999px;
}


.calendar-cell__counts {
  margin-top: 0.25rem;
}

.calendar-cell__session-count {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
}

.calendar-cell__session-icon {
  font-size: 32px !important;
}

.calendar-cell__count-text {
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #6366f1;
  text-align: center;
}

.calendar-cell__count-text--green {
  color: #16a34a;
}

.calendar-cell__add-icon {
  color: #d1d5db;
  font-size: 24px !important;
  margin: auto;
}

.calendar-cell__start-session {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  margin-top: auto;
}

.calendar-cell__mic-icon {
  font-size: 28px !important;
  color: rgba(255, 255, 255, 0.9);
}

.calendar-cell__start-label {
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.75);
}

/* ─── Onboarding Checklist ─── */
.onboarding-checklist {
  background: #ffffff;
  border-radius: 32px;
  padding: 2.5rem;
  box-shadow: 0 12px 32px -4px rgba(25, 28, 30, 0.06);
  border: 1px solid rgba(241, 241, 241, 0.8);
}

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
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem 1.5rem;
  border-radius: 20px;
  background: #f7f9fb;
  border: 1.5px solid #f1f1f1;
  transition: background 0.15s, border-color 0.15s;
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

.checklist-step__content {
  flex: 1;
  min-width: 0;
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
