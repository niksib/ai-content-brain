import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useApiClient } from '~/services/api';

export interface ThreadsInsightsSnapshot {
  id: string;
  views: number | null;
  likes: number | null;
  replies: number | null;
  reposts: number | null;
  quotes: number | null;
  shares: number | null;
  fetchedAt: string;
}

export interface LibraryContentIdea {
  id: string;
  title?: string;
  angle: string;
  description: string;
  platform: string;
  format: string;
  status: string;
  publishStatus?: string | null;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  threadsPostId?: string | null;
  contentPlan?: { chatSessionId: string };
  insightsSnapshots?: ThreadsInsightsSnapshot[];
}

export interface LibraryItem {
  id: string;
  contentIdeaId: string;
  platform: string;
  format: string;
  body: Record<string, unknown>;
  createdAt: string;
  contentIdea: LibraryContentIdea;
}

interface LibraryResponse {
  items: LibraryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const useLibraryStore = defineStore('library', () => {
  const apiClient = useApiClient();

  const items = ref<LibraryItem[]>([]);
  const total = ref(0);
  const page = ref(1);
  const limit = ref(20);
  const totalPages = ref(0);
  const isLoading = ref(false);

  const filters = ref<{ platform: string; format: string }>({
    platform: '',
    format: '',
  });

  const hasNextPage = computed(() => page.value < totalPages.value);
  const hasPrevPage = computed(() => page.value > 1);

  async function loadLibrary(): Promise<void> {
    isLoading.value = true;
    try {
      const params = new URLSearchParams();
      params.set('page', String(page.value));
      params.set('limit', String(limit.value));
      if (filters.value.platform) {
        params.set('platform', filters.value.platform);
      }
      if (filters.value.format) {
        params.set('format', filters.value.format);
      }

      const response = await apiClient.get<LibraryResponse>(
        `/api/library?${params.toString()}`,
      );

      items.value = response.items;
      total.value = response.total;
      page.value = response.page;
      totalPages.value = response.totalPages;
    } finally {
      isLoading.value = false;
    }
  }

  function setFilter(key: 'platform' | 'format', value: string): void {
    filters.value[key] = value;
    page.value = 1;
    loadLibrary();
  }

  function nextPage(): void {
    if (hasNextPage.value) {
      page.value++;
      loadLibrary();
    }
  }

  function prevPage(): void {
    if (hasPrevPage.value) {
      page.value--;
      loadLibrary();
    }
  }

  function markPublished(contentIdeaId: string, threadsPostId: string): void {
    const item = items.value.find((i) => i.contentIdeaId === contentIdeaId);
    if (item) {
      item.contentIdea.publishStatus = 'posted';
      item.contentIdea.threadsPostId = threadsPostId;
      item.contentIdea.scheduledAt = null;
      item.contentIdea.publishedAt = new Date().toISOString();
    }
  }

  function markScheduled(contentIdeaId: string, scheduledAt: string): void {
    const item = items.value.find((i) => i.contentIdeaId === contentIdeaId);
    if (item) {
      item.contentIdea.publishStatus = 'scheduled';
      item.contentIdea.scheduledAt = scheduledAt;
    }
  }

  return {
    items,
    total,
    page,
    limit,
    totalPages,
    isLoading,
    filters,
    hasNextPage,
    hasPrevPage,
    loadLibrary,
    setFilter,
    nextPage,
    prevPage,
    markPublished,
    markScheduled,
  };
});
