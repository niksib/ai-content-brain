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

export interface PostMediaItem {
  mediaType: 'IMAGE' | 'VIDEO';
  mediaUrl: string;
}

export interface PostDto {
  id: string;
  text: string | null;
  posts: unknown;
  mediaItems?: PostMediaItem[] | null;
  imageSuggestion?: Record<string, unknown> | null;
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';
  scheduledAt?: string | null;
  publishedAt?: string | null;
  threadsPostId?: string | null;
}

// LibraryItem represents a ContentIdea row plus its produced Post (1:0..1).
export interface LibraryItem {
  id: string;
  title?: string;
  angle: string;
  description: string;
  platform: string;
  format: string;
  status: string;
  post?: PostDto | null;
  contentPlan?: { chatSessionId: string } | null;
  insightsSnapshots?: ThreadsInsightsSnapshot[];
  createdAt: string;
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
    const item = items.value.find((i) => i.id === contentIdeaId);
    if (item?.post) {
      item.post = {
        ...item.post,
        status: 'published',
        threadsPostId,
        scheduledAt: null,
        publishedAt: new Date().toISOString(),
      };
    }
  }

  function markScheduled(contentIdeaId: string, scheduledAt: string): void {
    const item = items.value.find((i) => i.id === contentIdeaId);
    if (item?.post) {
      item.post = { ...item.post, status: 'scheduled', scheduledAt };
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
