import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useApiClient } from '~/services/api';

export interface CalendarSession {
  id: string;
  sessionDate: string;
  status: string;
  ideaCount: number;
}

export const useDashboardStore = defineStore('dashboard', () => {
  const apiClient = useApiClient();

  const sessions = ref<CalendarSession[]>([]);
  const currentMonth = ref(new Date().getMonth());
  const currentYear = ref(new Date().getFullYear());
  const isLoading = ref(false);

  async function loadSessions(): Promise<void> {
    isLoading.value = true;
    try {
      const response = await apiClient.get<{ sessions: CalendarSession[] }>(
        '/api/sessions',
      );
      sessions.value = response.sessions;
    } finally {
      isLoading.value = false;
    }
  }

  function loadMonth(year: number, month: number): void {
    currentYear.value = year;
    currentMonth.value = month;
  }

  async function startTodaySession(): Promise<string> {
    const response = await apiClient.post<{ session: { id: string } }>('/api/sessions');
    return response.session.id;
  }

  return {
    sessions,
    currentMonth,
    currentYear,
    isLoading,
    loadSessions,
    loadMonth,
    startTodaySession,
  };
});
