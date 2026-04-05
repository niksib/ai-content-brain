<template>
  <div class="dashboard-page">
    <div class="dashboard-page__header">
      <h1 class="dashboard-page__title">Dashboard</h1>
      <button
        class="dashboard-page__start-btn"
        :disabled="isStarting"
        @click="handleStartSession"
      >
        {{ isStarting ? 'Starting...' : 'Start Session' }}
      </button>
    </div>

    <div class="dashboard-page__calendar-section">
      <CalendarView
        :sessions="dashboardStore.sessions"
        :current-month="dashboardStore.currentMonth"
        :current-year="dashboardStore.currentYear"
        @navigate="navigateToSession"
        @update:month="handleMonthChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useDashboardStore } from '~/stores/dashboard';

definePageMeta({
  layout: 'default',
});

const dashboardStore = useDashboardStore();
const router = useRouter();
const isStarting = ref(false);

onMounted(() => {
  dashboardStore.loadSessions();
});

async function handleStartSession(): Promise<void> {
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

function handleMonthChange(year: number, month: number): void {
  dashboardStore.loadMonth(year, month);
}
</script>

<style scoped>
.dashboard-page {
  max-width: 960px;
  margin: 0 auto;
}

.dashboard-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.dashboard-page__title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.dashboard-page__start-btn {
  padding: 0.625rem 1.5rem;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.dashboard-page__start-btn:hover:not(:disabled) {
  background: #4f46e5;
}

.dashboard-page__start-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dashboard-page__calendar-section {
  margin-top: 1rem;
}
</style>
