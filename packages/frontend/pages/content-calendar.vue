<template>
  <div class="pub-page">
    <div v-if="store.isLoading" class="pub-page__loading">Loading...</div>

    <PublishingCalendar
      v-else
      :items="store.items"
      :standalone-posts="standalonePosts"
      :current-month="currentMonth"
      :current-year="currentYear"
      @navigate="navigateToIdea"
      @navigate-session="navigateToSession"
      @navigate-standalone="openEdit"
      @schedule="openScheduler"
      @update:month="onMonthChange"
    />

    <SchedulePostModal
      :open="schedulerOpen"
      :edit="editingData"
      @close="onSchedulerClose"
      @scheduled="onScheduled"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useLibraryStore, type LibraryItem } from '~/stores/library';
import PublishingCalendar, {
  type StandalonePost,
  type StandalonePostThreadEntry,
} from '~/components/PublishingCalendar.vue';
import SchedulePostModal, { type SchedulePostEditData } from '~/components/SchedulePostModal.vue';

definePageMeta({ layout: 'default', ssr: false });

const store = useLibraryStore();
const router = useRouter();
const config = useRuntimeConfig();

const currentYear = ref(new Date().getFullYear());
const currentMonth = ref(new Date().getMonth());
const schedulerOpen = ref(false);
const editingData = ref<SchedulePostEditData | null>(null);
const standalonePosts = ref<StandalonePost[]>([]);

interface ScheduledPostDto {
  id: string;
  contentIdeaId: string | null;
  text: string;
  posts: unknown;
  mediaType: 'TEXT' | 'IMAGE' | 'VIDEO';
  mediaUrl: string | null;
  scheduledAt: string;
  status: 'pending' | 'publishing' | 'published' | 'failed';
  updatedAt: string;
}

function normalizeThreadEntries(raw: unknown): StandalonePostThreadEntry[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.map((entry) => {
    if (typeof entry === 'string') return { text: entry };
    const candidate = entry as { text?: unknown; mediaType?: unknown; mediaUrl?: unknown };
    return {
      text: typeof candidate.text === 'string' ? candidate.text : '',
      mediaType: candidate.mediaType === 'IMAGE' || candidate.mediaType === 'VIDEO' ? candidate.mediaType : undefined,
      mediaUrl: typeof candidate.mediaUrl === 'string' ? candidate.mediaUrl : undefined,
    };
  });
}

async function loadStandalonePosts(): Promise<void> {
  try {
    const response = await $fetch<{ scheduledPosts: ScheduledPostDto[] }>(
      `${config.public.apiBaseUrl}/api/threads/scheduled?status=all`,
      { credentials: 'include' },
    );
    standalonePosts.value = response.scheduledPosts
      .filter((post) => !post.contentIdeaId)
      .map((post) => {
        const threadEntries = normalizeThreadEntries(post.posts);
        return {
          id: post.id,
          platform: 'threads',
          status: post.status,
          text: post.text,
          isThread: threadEntries !== null && threadEntries.length > 1,
          mediaType: post.mediaType,
          mediaUrl: post.mediaUrl,
          posts: threadEntries,
          scheduledAt: post.scheduledAt,
          publishedAt: post.status === 'published' ? post.updatedAt : null,
        };
      });
  } catch {
    standalonePosts.value = [];
  }
}

function onMonthChange(year: number, month: number): void {
  currentYear.value = year;
  currentMonth.value = month;
}

function navigateToIdea(item: LibraryItem): void {
  const sessionId = item.contentIdea.contentPlan?.chatSessionId;
  if (sessionId) {
    router.push(`/sessions/${sessionId}?idea=${item.contentIdeaId}`);
  }
}

function navigateToSession(sessionId: string): void {
  router.push(`/sessions/${sessionId}`);
}

function openScheduler(): void {
  editingData.value = null;
  schedulerOpen.value = true;
}

function openEdit(post: StandalonePost): void {
  if (post.status !== 'pending') return;
  const modalPosts = post.isThread && post.posts
    ? post.posts.map((entry) => ({
        text: entry.text,
        media: entry.mediaUrl && entry.mediaType
          ? { mediaType: entry.mediaType, mediaUrl: entry.mediaUrl }
          : null,
      }))
    : [{
        text: post.text,
        media: post.mediaUrl && (post.mediaType === 'IMAGE' || post.mediaType === 'VIDEO')
          ? { mediaType: post.mediaType, mediaUrl: post.mediaUrl }
          : null,
      }];

  editingData.value = {
    id: post.id,
    platform: 'threads',
    scheduledAt: post.scheduledAt,
    text: post.text,
    isThread: post.isThread,
    posts: modalPosts,
  };
  schedulerOpen.value = true;
}

function onSchedulerClose(): void {
  schedulerOpen.value = false;
  editingData.value = null;
}

async function onScheduled(): Promise<void> {
  editingData.value = null;
  await Promise.all([store.loadLibrary(), loadStandalonePosts()]);
}

onMounted(async () => {
  await Promise.all([store.loadLibrary(), loadStandalonePosts()]);
});
</script>

<style scoped>
.pub-page {
  margin: 0 auto;
  padding: 2.5rem 2rem 4rem;
}

@media (max-width: 899px) {
  .pub-page { padding: 1rem 0.75rem 3rem; }
}

.pub-page__loading {
  color: #9ca3af;
  font-size: 0.9375rem;
  padding: 3rem;
  text-align: center;
}
</style>
